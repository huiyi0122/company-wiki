import database from "../db";
import { esClient } from "../elasticSearch"; // 假设你有 esClient
import { PERMISSIONS } from "../constants/permission";

export async function createTag(name: string, user: any) {
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    // 1️⃣ 插入 tag
    const [result]: any = await connection.query(
      `INSERT INTO tags (name, slug, created_by)
       VALUES (?, ?, ?)`,
      [name.trim(), slug, user.id]
    );
    const tagId = result.insertId;

    // 2️⃣ 写日志
    await connection.query(
      `INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
       VALUES (?, 'CREATE', ?, NULL, ?)`,
      [tagId, user.id, JSON.stringify({ name, slug })]
    );

    // 3️⃣ 同步到 Elasticsearch
    try {
      await esClient.index({
        index: "tags",
        id: tagId.toString(),
        refresh: true,
        document: {
          name,
          slug,
          is_active: true,
          created_by: user.username,
          updated_by: user.username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    } catch (esErr) {
      console.error("❌ Elasticsearch create tag failed:", esErr);
    }

    await connection.commit();
    connection.release();

    return { id: tagId, name, slug };
  } catch (err: any) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

export async function getTags(options: {
  limit?: number;
  lastId?: number;
  search?: string;
  includeInactive?: boolean;
  withCount?: boolean;
}) {
  const limit = Math.min(options.limit || 10, 100);
  const lastId = options.lastId || 0;
  const search = options.search?.trim() || "";
  const includeInactive = !!options.includeInactive;
  const withCount = !!options.withCount;

  let whereClause = "WHERE 1=1";
  const params: any[] = [];

  if (!includeInactive) whereClause += " AND t.is_active = 1";
  if (search) {
    whereClause +=
      " AND MATCH(t.name, t.slug) AGAINST(? IN NATURAL LANGUAGE MODE)";
    params.push(search);
  }
  if (lastId > 0) {
    whereClause += " AND t.id < ?";
    params.push(lastId);
  }

  // 查询 tags
  let [rows]: any = await database.query(
    `
    SELECT 
      t.id, 
      t.name, 
      t.slug, 
      t.is_active, 
      u1.username AS created_by_name,
      u2.username AS updated_by_name
    FROM tags t
    LEFT JOIN users u1 ON t.created_by = u1.id
    LEFT JOIN users u2 ON t.updated_by = u2.id
    ${whereClause}
    ORDER BY t.id DESC
    LIMIT ?
    `,
    [...params, limit]
  );

  // fallback for short keywords
  if (!rows.length && search && search.length < 4) {
    const likeWhere = whereClause.replace(
      "MATCH(t.name, t.slug) AGAINST(? IN NATURAL LANGUAGE MODE)",
      "(t.name LIKE CONCAT('%', ?, '%') OR t.slug LIKE CONCAT('%', ?, '%'))"
    );
    const [fallbackRows]: any = await database.query(
      `
      SELECT 
        t.id, 
        t.name, 
        t.slug, 
        t.is_active, 
        u1.username AS created_by_name,
        u2.username AS updated_by_name
      FROM tags t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.updated_by = u2.id
      ${likeWhere}
      ORDER BY t.id DESC
      LIMIT ?
      `,
      [...params, search, search, limit]
    );
    rows = fallbackRows;
  }

  // 带 count
  let total = null;
  if (withCount) {
    const [[countResult]]: any = await database.query(
      `SELECT COUNT(*) as total FROM tags ${whereClause}`,
      params
    );
    total = countResult.total;
  }

  // 格式化返回数据
  const data = rows.map((t: any) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    is_active: Boolean(t.is_active),
    created_by: t.created_by_name,
    updated_by: t.updated_by_name,
  }));

  return {
    meta: {
      total,
      limit,
      nextCursor: data.length ? data[data.length - 1].id : null,
    },
    data,
  };
}

export async function updateTag(
  id: number,
  body: { name: string; is_active?: boolean },
  user: any
) {
  const { name, is_active } = body;

  if (!name?.trim()) throw new Error("Name is required");

  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    // 1️⃣ 获取原 tag
    const [rows]: any = await connection.query(
      "SELECT * FROM tags WHERE id = ?",
      [id]
    );
    if (!rows.length) throw new Error("Tag not found");
    const original = rows[0];

    // 2️⃣ 生成 slug
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-");

    // 3️⃣ 更新 tag
    await connection.query(
      `
      UPDATE tags
      SET name = ?, slug = ?, is_active = COALESCE(?, is_active),
          updated_at = NOW(), updated_by = ?
      WHERE id = ?
      `,
      [name, slug, is_active, user.id, id]
    );

    // 4️⃣ 写 tag_logs
    await connection.query(
      `
      INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
      VALUES (?, 'UPDATE', ?, ?, ?)
      `,
      [
        id,
        user.id,
        JSON.stringify({
          name: original.name,
          slug: original.slug,
          is_active: !!original.is_active,
        }),
        JSON.stringify({
          name,
          slug,
          is_active:
            typeof is_active !== "undefined" ? is_active : original.is_active,
        }),
      ]
    );

    // 5️⃣ 同步 ES
    try {
      await esClient.index({
        index: "tags",
        id: id.toString(),
        refresh: true,
        document: {
          name,
          slug,
          is_active:
            typeof is_active !== "undefined" ? is_active : original.is_active,
          created_by: original.created_by,
          updated_by: user.id,
          created_at: original.created_at,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (esErr) {
      console.error("❌ Elasticsearch update failed:", esErr);
    }

    await connection.commit();
    connection.release();

    return {
      id: original.id,
      name,
      slug,
      is_active:
        typeof is_active !== "undefined" ? is_active : original.is_active,
      created_by: original.created_by,
      updated_by: user.id,
      created_at: original.created_at,
      updated_at: new Date().toISOString(),
    };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

export async function deleteTag(id: number, user: any, force = false) {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    // 1️⃣ 获取 tag 原始数据
    const [rows]: any = await connection.query(
      "SELECT * FROM tags WHERE id = ?",
      [id]
    );
    if (!rows.length) throw new Error("Tag not found");
    const original = rows[0];

    // 2️⃣ 检查关联文章
    const [used]: any = await connection.query(
      "SELECT COUNT(*) AS count FROM article_tags WHERE tag_id = ?",
      [id]
    );
    if (used[0].count > 0 && !force) {
      throw new Error(
        "Cannot delete tag because it’s still used by articles. Use force option to override."
      );
    }

    // 3️⃣ 如果 force，删除关联
    if (force) {
      await connection.query("DELETE FROM article_tags WHERE tag_id = ?", [id]);
    }

    // 4️⃣ soft delete（或者实际删除）
    await connection.query(
      "UPDATE tags SET is_active = 0, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [user.id, id]
    );

    // 5️⃣ 写 tag_logs
    await connection.query(
      `
      INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
      VALUES (?, 'DELETE', ?, ?, ?)
      `,
      [
        id,
        user.id,
        JSON.stringify({
          name: original.name,
          slug: original.slug,
          is_active: !!original.is_active,
        }),
        JSON.stringify({
          is_active: false,
        }),
      ]
    );

    // 6️⃣ 更新 ES
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

export async function hardDeleteTag(id: number, user: any) {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    // 1️⃣ 查询标签
    const [tags]: any = await connection.query(
      "SELECT * FROM tags WHERE id = ?",
      [id]
    );
    if (!tags.length) throw new Error("Tag not found");
    const tag = tags[0];

    // 2️⃣ 写日志
    await connection.query(
      `INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
       VALUES (?, 'DELETE', ?, ?, ?)`,
      [id, user.id, JSON.stringify(tag), JSON.stringify({ deleted: true })]
    );

    // 3️⃣ 删除数据库
    await connection.query("DELETE FROM tags WHERE id = ?", [id]);

    // 4️⃣ Elasticsearch 删除
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

export async function restoreTag(id: number, user: any) {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    // 1️⃣ 查询标签
    const [tags]: any = await connection.query(
      "SELECT * FROM tags WHERE id = ?",
      [id]
    );
    if (!tags.length) throw new Error("Tag not found");

    const tag = tags[0];
    if (tag.is_active === 1) throw new Error("Tag is already active");

    // 2️⃣ 更新状态为启用
    await connection.query(
      "UPDATE tags SET is_active = 1, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [user.id, id]
    );

    // 3️⃣ 写日志
    await connection.query(
      `INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
       VALUES (?, 'RESTORE', ?, ?, ?)`,
      [id, user.id, JSON.stringify(tag), JSON.stringify({ restored: true })]
    );

    // 4️⃣ Elasticsearch 同步
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
