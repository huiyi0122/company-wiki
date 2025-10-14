import database from "../db";
import { esClient } from "../elasticSearch";

export interface GetTagsOptions {
  search?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

// 创建 tag
export async function createTag(name: string, user: any) {
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    const [result]: any = await connection.query(
      `INSERT INTO tags (name, slug, created_by)
       VALUES (?, ?, ?)`,
      [name.trim(), slug, user.id]
    );
    const tagId = result.insertId;

    // 写日志
    await connection.query(
      `INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
       VALUES (?, 'CREATE', ?, NULL, ?)`,
      [tagId, user.id, JSON.stringify({ name, slug })]
    );

    // 同步 ES
    await esClient.index({
      index: "tags",
      id: tagId.toString(),
      refresh: true,
      document: {
        id: tagId,
        name,
        slug,
        is_active: true,
        created_by_name: user.username,
        updated_by_name: user.username,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    await connection.commit();
    connection.release();

    return { id: tagId, name, slug };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

// ES 搜索 tag
export async function searchTagsES(options: GetTagsOptions) {
  const {
    search = "",
    includeInactive = false,
    page = 1,
    limit = 20,
  } = options;
  const from = (page - 1) * limit;

  const must: any[] = [];
  const filter: any[] = [];

  if (search) {
    must.push({
      multi_match: {
        query: search,
        fields: ["name", "slug"],
        fuzziness: "AUTO",
      },
    });
  }

  if (!includeInactive) {
    filter.push({ term: { is_active: true } });
  }

  const res = await esClient.search({
    index: "tags",
    from,
    size: limit,
    query: {
      bool: { must, filter },
    },
  });

  const hits = res.hits.hits;
  const total =
    typeof res.hits.total === "number"
      ? res.hits.total
      : res.hits.total?.value || 0;

  const data = hits.map((hit: any) => hit._source);

  return {
    meta: { total, page, limit },
    data,
  };
}

// 更新 tag
export interface UpdateTagData {
  name?: string;
  is_active?: boolean;
}

export async function updateTag(id: number, data: UpdateTagData, user: any) {
  const { name, is_active } = data;
  const slug = name?.trim().toLowerCase().replace(/\s+/g, "-");

  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    const [rows]: any = await connection.query(
      "SELECT * FROM tags WHERE id = ?",
      [id]
    );
    if (!rows.length) throw new Error("Tag not found");
    const original = rows[0];

    await connection.query(
      "UPDATE tags SET name=?, slug=?, is_active=?, updated_by=?, updated_at=NOW() WHERE id=?",
      [
        name || original.name,
        slug || original.slug,
        is_active ?? original.is_active,
        user.id,
        id,
      ]
    );

    // 写日志
    await connection.query(
      `INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
       VALUES (?, 'UPDATE', ?, ?, ?)`,
      [
        id,
        user.id,
        JSON.stringify(original),
        JSON.stringify({ name, slug, is_active }),
      ]
    );

    // 同步 ES
    await esClient.index({
      index: "tags",
      id: id.toString(),
      refresh: true,
      document: {
        id,
        name: name || original.name,
        slug: slug || original.slug,
        is_active: !!(is_active ?? original.is_active), // ✅ 转成 true / false
        updated_by_name: user.username,
        updated_at: new Date().toISOString(),
      },
    });

    await connection.commit();
    connection.release();

    return {
      id,
      name: name || original.name,
      slug: slug || original.slug,
      is_active: is_active ?? original.is_active,
    };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

// 查询 tag by id
export async function getTagById(id: number) {
  const [rows]: any = await database.query(
    `
      SELECT 
        t.id,
        t.name,
        t.slug,
        t.is_active,
        u1.username AS created_by,
        u2.username AS updated_by
      FROM tags t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.updated_by = u2.id
      WHERE t.id = ?
    `,
    [id]
  );

  if (!rows.length) return null;
  return rows[0];
}

// 删除 tag（软删）
export async function deleteTag(id: number, user: any, force = false) {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    const [rows]: any = await connection.query(
      "SELECT * FROM tags WHERE id=?",
      [id]
    );
    if (!rows.length) throw new Error("Tag not found");
    const original = rows[0];

    // 检查文章使用
    const [used]: any = await connection.query(
      "SELECT COUNT(*) AS count FROM article_tags WHERE tag_id=?",
      [id]
    );
    if (used[0].count > 0 && !force) {
      throw new Error(
        "Cannot delete tag because it’s still used by articles. Use force option to override."
      );
    }

    if (force) {
      await connection.query("DELETE FROM article_tags WHERE tag_id=?", [id]);
    }

    await connection.query(
      "UPDATE tags SET is_active=0, updated_by=?, updated_at=NOW() WHERE id=?",
      [user.id, id]
    );

    await connection.query(
      `INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
       VALUES (?, 'SOFT_DELETE', ?, ?, ?)`,
      [
        id,
        user.id,
        JSON.stringify({
          name: original.name,
          slug: original.slug,
          is_active: !!original.is_active,
        }),
        JSON.stringify({ is_active: false }),
      ]
    );

    try {
      await esClient.delete({
        index: "tags",
        id: id.toString(),
        refresh: true,
      });
    } catch (esErr) {
      console.error("❌ Elasticsearch delete failed:", esErr);
    }

    await connection.commit();
    connection.release();

    return force
      ? "Tag forcibly deactivated and unlinked from articles"
      : "Tag deactivated successfully";
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

// 硬删 tag
export async function hardDeleteTag(id: number, user: any) {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    const [tags]: any = await connection.query(
      "SELECT * FROM tags WHERE id=?",
      [id]
    );
    if (!tags.length) throw new Error("Tag not found");
    const tag = tags[0];

    await connection.query(
      `INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
       VALUES (?, 'DELETE', ?, ?, ?)`,
      [id, user.id, JSON.stringify(tag), JSON.stringify({ deleted: true })]
    );

    await connection.query("DELETE FROM tags WHERE id=?", [id]);

    try {
      await esClient.delete({
        index: "tags",
        id: id.toString(),
        refresh: true,
      });
    } catch (esErr) {
      console.error("❌ Elasticsearch hard delete failed:", esErr);
    }

    await connection.commit();
    connection.release();

    return "Tag permanently deleted";
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

// 恢复 tag
export async function restoreTag(id: number, user: any) {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    const [tags]: any = await connection.query(
      "SELECT * FROM tags WHERE id=?",
      [id]
    );
    if (!tags.length) throw new Error("Tag not found");
    const tag = tags[0];
    if (tag.is_active === 1) throw new Error("Tag is already active");

    await connection.query(
      "UPDATE tags SET is_active=1, updated_by=?, updated_at=NOW() WHERE id=?",
      [user.id, id]
    );

    await connection.query(
      `INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
       VALUES (?, 'RESTORE', ?, ?, ?)`,
      [id, user.id, JSON.stringify(tag), JSON.stringify({ restored: true })]
    );

    try {
      await esClient.update({
        index: "tags",
        id: id.toString(),
        doc: {
          is_active: 1,
          updated_by: user.username,
          updated_at: new Date().toISOString(),
        },
        refresh: true,
      });
    } catch (esErr) {
      console.error("❌ Elasticsearch restore failed:", esErr);
    }

    await connection.commit();
    connection.release();

    return "Tag restored successfully";
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}
