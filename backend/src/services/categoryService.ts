import database from "../db";
import { esClient } from "../elasticSearch";
import { ResultSetHeader, RowDataPacket, FieldPacket } from "mysql2";
 
interface User {
  id: number;
  username: string;
}
 
interface Category {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
}
 
interface CategoryLog {
  category_id: number;
  action: "CREATE" | "UPDATE" | "SOFT_DELETE" | "RESTORE";
  changed_by: number;
  old_data: string | null;
  new_data: string;
  changed_at?: string;
}
 
interface ElasticsearchCategory {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_by_name: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}
 
interface DatabaseConnection {
  query(sql: string, values?: any[]): Promise<any>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}
 
export interface GetCategoriesOptions {
  search?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}
 
export interface UpdateCategoryData {
  name?: string;
  is_active?: boolean;
}
 
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
export async function createCategory(
  name: string,
  user: User
): Promise<Category> {
  return withTransaction(async (connection) => {
    const slug = generateSlug(name);
 
    const [result, fields]: [ResultSetHeader, FieldPacket[]] =
      await connection.query(
        `INSERT INTO categories (name, slug, created_by)
   VALUES (?, ?, ?)`,
        [name.trim(), slug, user.id]
      );
 
    const categoryId = result.insertId;
 
    const categoryLog: CategoryLog = {
      category_id: categoryId,
      action: "CREATE",
      changed_by: user.id,
      old_data: null,
      new_data: JSON.stringify({ name, slug }),
    };
 
    await connection.query(
      `INSERT INTO category_logs (category_id, action, changed_by, old_data, new_data)
       VALUES (?, ?, ?, ?, ?)`,
      [
        categoryLog.category_id,
        categoryLog.action,
        categoryLog.changed_by,
        categoryLog.old_data,
        categoryLog.new_data,
      ]
    );
 
    const esDoc: ElasticsearchCategory = {
      id: categoryId,
      name,
      slug,
      is_active: true,
      created_by_name: user.username,
      updated_by_name: user.username,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
 
    await esClient.index({
      index: "categories",
      id: categoryId.toString(),
      refresh: true,
      document: esDoc,
    });
 
    return { id: categoryId, name, slug, is_active: true };
  });
}
 
export async function searchCategoriesES(options: {
  search?: string;
  includeInactive?: boolean;
}): Promise<Category[]> {
  const { search = "", includeInactive = false } = options;
 
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
 
  const query: Record<string, any> = search
    ? { bool: { must, filter } }
    : { bool: { must: [{ match_all: {} }], filter } };
 
  const res = await esClient.search({
    index: "categories",
    size: 1000,
    query,
  });
 
  const hits = res.hits.hits as Array<{
    _id: string;
    _source: Omit<ElasticsearchCategory, "id">;
  }>;
 
  return hits.map((hit) => ({
    id: parseInt(hit._id, 10),
    ...hit._source,
  }));
}
 
export async function updateCategory(
  id: number,
  data: UpdateCategoryData,
  user: User
): Promise<Category> {
  return withTransaction(async (connection) => {
    const { name, is_active } = data;
    const slug = name ? generateSlug(name) : undefined;
 
    // 查询原始分类
    const [rows, fields]: [(Category & RowDataPacket)[], FieldPacket[]] =
      await connection.query("SELECT * FROM categories WHERE id = ?", [id]);
 
    if (!rows.length) {
      throw new Error("Category not found");
    }
 
    const original = rows[0];
 
    // 更新分类
    const [updateResult, updateFields]: [ResultSetHeader, FieldPacket[]] =
      await connection.query(
        "UPDATE categories SET name=?, slug=?, is_active=?, updated_by=?, updated_at=NOW() WHERE id=?",
        [
          name || original.name,
          slug || original.slug,
          is_active ?? original.is_active,
          user.id,
          id,
        ]
      );
 
    // 插入日志
    const categoryLog: CategoryLog = {
      category_id: id,
      action: "UPDATE",
      changed_by: user.id,
      old_data: JSON.stringify(original),
      new_data: JSON.stringify({ name, slug, is_active }),
    };
 
    const [logResult, logFields]: [ResultSetHeader, FieldPacket[]] =
      await connection.query(
        `INSERT INTO category_logs (category_id, action, changed_by, old_data, new_data)
         VALUES (?, ?, ?, ?, ?)`,
        [
          categoryLog.category_id,
          categoryLog.action,
          categoryLog.changed_by,
          categoryLog.old_data,
          categoryLog.new_data,
        ]
      );
 
    // 更新 Elasticsearch
    const esDoc: Partial<ElasticsearchCategory> = {
      id,
      name: name || original.name,
      slug: slug || original.slug,
      is_active: Boolean(is_active ?? original.is_active),
      updated_by_name: user.username,
      updated_at: new Date().toISOString(),
    };
 
    await esClient.index({
      index: "categories",
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
export async function getCategoryById(id: number): Promise<Category | null> {
  const [rows] = await database.query<(Category & RowDataPacket)[]>(
    `
  SELECT c.id, c.name, c.slug, c.is_active,
         u1.username AS created_by_name,
         u2.username AS updated_by_name
  FROM categories c
  LEFT JOIN users u1 ON c.created_by = u1.id
  LEFT JOIN users u2 ON c.updated_by = u2.id
  WHERE c.id = ?
`,
    [id]
  );
 
  return Array.isArray(rows) && rows.length > 0 ? (rows[0] as Category) : null;
}
 
export async function deleteCategory(id: number, user: User): Promise<string> {
  return withTransaction(async (connection) => {
    const [rows, selectFields]: [(Category & RowDataPacket)[], FieldPacket[]] =
      await connection.query("SELECT * FROM categories WHERE id = ?", [id]);
 
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("Category not found");
    }
 
    const original = rows[0] as Category;
 
    if (!original.is_active) {
      throw new Error("Category already deleted");
    }
 
    interface CountRow extends RowDataPacket {
      count: number;
    }
    const [usageResult, fields]: [CountRow[], FieldPacket[]] =
      await connection.query(
        "SELECT COUNT(*) AS count FROM articles WHERE category_id = ?",
        [id]
      );
 
    const usageCount =
      (Array.isArray(usageResult) && usageResult[0]?.count) || 0;
 
    if (usageCount > 0) {
      throw new Error(
        `Cannot delete category: still used by ${usageCount} article(s).`
      );
    }
 
    await connection.query(
      "UPDATE categories SET is_active = 0, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [user.id, id]
    );
 
    const categoryLog: CategoryLog = {
      category_id: id,
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
      `INSERT INTO category_logs (category_id, action, changed_by, old_data, new_data)
       VALUES (?, ?, ?, ?, ?)`,
      [
        categoryLog.category_id,
        categoryLog.action,
        categoryLog.changed_by,
        categoryLog.old_data,
        categoryLog.new_data,
      ]
    );
 
    try {
      await esClient.update({
        index: "categories",
        id: id.toString(),
        doc: {
          is_active: false,
          updated_by_name: user.username,
          updated_at: new Date().toISOString(),
        },
        refresh: true,
      });
    } catch (esErr) {
      console.error("❌ Elasticsearch update failed:", esErr);
      // 不阻断主流程
    }
 
    // 7️⃣ 返回结果
    return "Category deactivated successfully";
  });
}
 
export async function restoreCategory(id: number, user: User): Promise<string> {
  return withTransaction(async (connection) => {
    const [categories, categoriesFields]: [
      (Category & RowDataPacket)[],
      FieldPacket[]
    ] = await connection.query("SELECT * FROM categories WHERE id = ?", [id]);
 
    if (!Array.isArray(categories) || categories.length === 0) {
      throw new Error("Category not found");
    }
 
    const category = categories[0] as Category;
 
    if (category.is_active) {
      throw new Error("Category is already active");
    }
 
    await connection.query(
      "UPDATE categories SET is_active = 1, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [user.id, id]
    );
 
    const categoryLog: CategoryLog = {
      category_id: id,
      action: "RESTORE",
      changed_by: user.id,
      old_data: JSON.stringify(category),
      new_data: JSON.stringify({ restored: true }),
    };
 
    await connection.query(
      `INSERT INTO category_logs (category_id, action, changed_by, old_data, new_data)
       VALUES (?, ?, ?, ?, ?)`,
      [
        categoryLog.category_id,
        categoryLog.action,
        categoryLog.changed_by,
        categoryLog.old_data,
        categoryLog.new_data,
      ]
    );
 
    try {
      await esClient.update({
        index: "categories",
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
 
    return "Category restored successfully";
  });
}
 
 