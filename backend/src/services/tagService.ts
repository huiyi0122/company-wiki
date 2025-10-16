import database from "../db";
import { esClient } from "../elasticSearch";

// ===== 类型定义 =====
interface User {
  id: number;
  username: string;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
}

interface TagLog {
  tag_id: number;
  action: "CREATE" | "UPDATE" | "SOFT_DELETE" | "DELETE" | "RESTORE";
  changed_by: number;
  old_data: string | null;
  new_data: string;
  changed_at?: string;
}

interface ElasticsearchTag {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_by_name: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse<T> {
  meta: {
    total: number;
    page: number;
    limit: number;
  };
  data: T[];
}

interface DatabaseConnection {
  query(sql: string, values?: any[]): Promise<any>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}

export interface GetTagsOptions {
  search?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

export interface UpdateTagData {
  name?: string;
  is_active?: boolean;
}

// ===== 辅助函数 =====
function generateSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

async function withTransaction<T>(
  callback: (connection: DatabaseConnection) => Promise<T>
): Promise<T> {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    const result = await callback(connection);
    await connection.commit();
    connection.release();
    return result;
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

// ===== 核心函数 =====
export async function createTag(name: string, user: User): Promise<Tag> {
  return withTransaction(async (connection) => {
    const slug = generateSlug(name);

    const [result] = (await connection.query(
      `INSERT INTO tags (name, slug, created_by)
       VALUES (?, ?, ?)`,
      [name.trim(), slug, user.id]
    )) as any[];
    const tagId = result.insertId;

    const tagLog: TagLog = {
      tag_id: tagId,
      action: "CREATE",
      changed_by: user.id,
      old_data: null,
      new_data: JSON.stringify({ name, slug }),
    };

    await connection.query(
      `INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
       VALUES (?, ?, ?, ?, ?)`,
      [
        tagLog.tag_id,
        tagLog.action,
        tagLog.changed_by,
        tagLog.old_data,
        tagLog.new_data,
      ]
    );

    const esDoc: ElasticsearchTag = {
      id: tagId,
      name,
      slug,
      is_active: true,
      created_by_name: user.username,
      updated_by_name: user.username,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await esClient.index({
      index: "tags",
      id: tagId.toString(),
      refresh: true,
      document: esDoc,
    });

    return { id: tagId, name, slug, is_active: true };
  });
}

export async function searchTagsES(
  options: GetTagsOptions
): Promise<PaginatedResponse<ElasticsearchTag>> {
  const {
    search = "",
    includeInactive = false,
    page = 1,
    limit = 10,
  } = options;
  const from = (page - 1) * limit;

  const must: Record<string, any>[] = [];
  const filter: Record<string, any>[] = [];

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
    query:
      search || !includeInactive
        ? { bool: { must, filter } }
        : { match_all: {} },
  });

  const hits = res.hits.hits as Array<{
    _id: string;
    _source: ElasticsearchTag;
  }>;
  const total =
    typeof res.hits.total === "number"
      ? res.hits.total
      : res.hits.total?.value || 0;

  const data = hits.map((hit) => hit._source);

  return {
    meta: { total, page, limit },
    data,
  };
}

export async function updateTag(
  id: number,
  data: UpdateTagData,
  user: User
): Promise<Tag> {
  return withTransaction(async (connection) => {
    const { name, is_active } = data;
    const slug = name ? generateSlug(name) : undefined;

    const [rows] = (await connection.query("SELECT * FROM tags WHERE id = ?", [
      id,
    ])) as any[];

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("Tag not found");
    }

    const original = rows[0] as Tag;

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

    const tagLog: TagLog = {
      tag_id: id,
      action: "UPDATE",
      changed_by: user.id,
      old_data: JSON.stringify(original),
      new_data: JSON.stringify({ name, slug, is_active }),
    };

    await connection.query(
      `INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
       VALUES (?, ?, ?, ?, ?)`,
      [
        tagLog.tag_id,
        tagLog.action,
        tagLog.changed_by,
        tagLog.old_data,
        tagLog.new_data,
      ]
    );

    const esDoc: Partial<ElasticsearchTag> = {
      id,
      name: name || original.name,
      slug: slug || original.slug,
      is_active: Boolean(is_active ?? original.is_active),
      updated_by_name: user.username,
      updated_at: new Date().toISOString(),
    };

    await esClient.index({
      index: "tags",
      id: id.toString(),
      refresh: true,
      document: esDoc,
    });

    return {
      id,
      name: name || original.name,
      slug: slug || original.slug,
      is_active: is_active ?? original.is_active,
    };
  });
}

export async function getTagById(id: number): Promise<Tag | null> {
  const [rows] = (await database.query(
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
  )) as any[];

  return Array.isArray(rows) && rows.length > 0 ? (rows[0] as Tag) : null;
}

export async function deleteTag(
  id: number,
  user: User,
  force: boolean = false
): Promise<string> {
  return withTransaction(async (connection) => {
    const [rows] = (await connection.query("SELECT * FROM tags WHERE id=?", [
      id,
    ])) as any[];

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("Tag not found");
    }

    const original = rows[0] as Tag;

    const [usageResult] = (await connection.query(
      "SELECT COUNT(*) AS count FROM article_tags WHERE tag_id=?",
      [id]
    )) as any[];

    const usageCount =
      (Array.isArray(usageResult) && usageResult[0]?.count) || 0;

    if (usageCount > 0 && !force) {
      throw new Error(
        "Cannot delete tag because it's still used by articles. Use force option to override."
      );
    }

    if (force) {
      await connection.query("DELETE FROM article_tags WHERE tag_id=?", [id]);
    }

    await connection.query(
      "UPDATE tags SET is_active=0, updated_by=?, updated_at=NOW() WHERE id=?",
      [user.id, id]
    );

    const tagLog: TagLog = {
      tag_id: id,
      action: "SOFT_DELETE",
      changed_by: user.id,
      old_data: JSON.stringify({
        name: original.name,
        slug: original.slug,
        is_active: !!original.is_active,
      }),
      new_data: JSON.stringify({ is_active: false }),
    };

    await connection.query(
      `INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
       VALUES (?, ?, ?, ?, ?)`,
      [
        tagLog.tag_id,
        tagLog.action,
        tagLog.changed_by,
        tagLog.old_data,
        tagLog.new_data,
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

    return force
      ? "Tag forcibly deactivated and unlinked from articles"
      : "Tag deactivated successfully";
  });
}

export async function hardDeleteTag(id: number, user: User): Promise<string> {
  return withTransaction(async (connection) => {
    const [tags] = (await connection.query("SELECT * FROM tags WHERE id=?", [
      id,
    ])) as any[];

    if (!Array.isArray(tags) || tags.length === 0) {
      throw new Error("Tag not found");
    }

    const tag = tags[0] as Tag;

    const tagLog: TagLog = {
      tag_id: id,
      action: "DELETE",
      changed_by: user.id,
      old_data: JSON.stringify(tag),
      new_data: JSON.stringify({ deleted: true }),
    };

    await connection.query(
      `INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
       VALUES (?, ?, ?, ?, ?)`,
      [
        tagLog.tag_id,
        tagLog.action,
        tagLog.changed_by,
        tagLog.old_data,
        tagLog.new_data,
      ]
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

    return "Tag permanently deleted";
  });
}

export async function restoreTag(id: number, user: User): Promise<string> {
  return withTransaction(async (connection) => {
    const [tags] = (await connection.query("SELECT * FROM tags WHERE id=?", [
      id,
    ])) as any[];

    if (!Array.isArray(tags) || tags.length === 0) {
      throw new Error("Tag not found");
    }

    const tag = tags[0] as Tag;

    if (tag.is_active) {
      throw new Error("Tag is already active");
    }

    await connection.query(
      "UPDATE tags SET is_active=1, updated_by=?, updated_at=NOW() WHERE id=?",
      [user.id, id]
    );

    const tagLog: TagLog = {
      tag_id: id,
      action: "RESTORE",
      changed_by: user.id,
      old_data: JSON.stringify(tag),
      new_data: JSON.stringify({ restored: true }),
    };

    await connection.query(
      `INSERT INTO tag_logs (tag_id, action, changed_by, old_data, new_data)
       VALUES (?, ?, ?, ?, ?)`,
      [
        tagLog.tag_id,
        tagLog.action,
        tagLog.changed_by,
        tagLog.old_data,
        tagLog.new_data,
      ]
    );

    try {
      await esClient.update({
        index: "tags",
        id: id.toString(),
        doc: {
          is_active: true,
          updated_by_name: user.username,
          updated_at: new Date().toISOString(),
        },
        refresh: true,
      });
    } catch (esErr) {
      console.error("❌ Elasticsearch restore failed:", esErr);
    }

    return "Tag restored successfully";
  });
}
