import database from "../db";
import { esClient } from "../elasticSearch";

export interface GetCategoriesOptions {
  search?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

export async function createCategory(name: string, user: any) {
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    const [result]: any = await connection.query(
      `INSERT INTO categories (name, slug, created_by)
       VALUES (?, ?, ?)`,
      [name.trim(), slug, user.id]
    );
    const categoryId = result.insertId;

    // 写日志
    await connection.query(
      `INSERT INTO category_logs (category_id, action, changed_by, old_data, new_data)
       VALUES (?, 'CREATE', ?, NULL, ?)`,
      [categoryId, user.id, JSON.stringify({ name, slug })]
    );

    // 同步到 ES
    await esClient.index({
      index: "categories",
      id: categoryId.toString(),
      refresh: true,
      document: {
        id: categoryId,
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

    return { id: categoryId, name, slug };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

export async function searchCategoriesES(options: GetCategoriesOptions) {
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
    index: "categories",
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
    data,
    meta: { total, page, limit },
  };
}

// 更新 category
export interface UpdateCategoryData {
  name?: string;
  is_active?: boolean;
}

export async function updateCategory(
  id: number,
  data: UpdateCategoryData,
  user: any
) {
  const { name, is_active } = data;
  const slug = name?.trim().toLowerCase().replace(/\s+/g, "-");

  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    const [rows]: any = await connection.query(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    );
    if (!rows.length) throw new Error("Category not found");
    const original = rows[0];

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

    // 写日志
    await connection.query(
      `INSERT INTO category_logs (category_id, action, changed_by, old_data, new_data)
       VALUES (?, 'UPDATE', ?, ?, ?)`,
      [
        id,
        user.id,
        JSON.stringify(original),
        JSON.stringify({ name, slug, is_active }),
      ]
    );

    // 同步到 ES
    await esClient.index({
      index: "categories",
      id: id.toString(),
      refresh: true,
      document: {
        id,
        name: name || original.name,
        slug: slug || original.slug,
        is_active: is_active ?? original.is_active,
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

export async function getCategoryById(id: number) {
  const [rows]: any = await database.query(
    `
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.is_active,
        u1.username AS created_by_name,
        u2.username AS updated_by_name
      FROM categories c
      LEFT JOIN users u1 ON c.created_by = u1.id
      LEFT JOIN users u2 ON c.updated_by = u2.id
      WHERE c.id = ?
    `,
    [id]
  );

  if (!rows.length) return null;

  return rows[0];
}

export async function deleteCategory(id: number, user: any, force = false) {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    // 1️⃣ 获取 category 原始数据
    const [rows]: any = await connection.query(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    );
    if (!rows.length) throw new Error("Category not found");
    const original = rows[0];

    // 2️⃣ 检查是否被文章使用
    const [used]: any = await connection.query(
      "SELECT COUNT(*) AS count FROM articles WHERE category_id = ?",
      [id]
    );
    if (used[0].count > 0 && !force) {
      throw new Error(
        "Cannot delete category because it’s still used by articles. Use force option to override."
      );
    }

    // 3️⃣ 如果 force=true，把这些文章的 category_id 设为 NULL
    if (force) {
      await connection.query(
        "UPDATE articles SET category_id = NULL WHERE category_id = ?",
        [id]
      );
    }

    // 4️⃣ soft delete category
    await connection.query(
      "UPDATE categories SET is_active = 0, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [user.id, id]
    );

    // 5️⃣ 写 category_logs
    await connection.query(
      `
      INSERT INTO category_logs (category_id, action, changed_by, old_data, new_data)
      VALUES (?, 'SOFT_DELETE', ?, ?, ?)
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

    // 6️⃣ 同步 Elasticsearch（可选，如果你 categories 也进 ES）
    try {
      await esClient.delete({
        index: "categories",
        id: id.toString(),
        refresh: true,
      });
    } catch (esErr) {
      console.error("❌ Elasticsearch delete failed:", esErr);
    }

    await connection.commit();
    connection.release();

    return force
      ? "Category forcibly deactivated and unlinked from articles"
      : "Category deactivated successfully";
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

export async function hardDeleteCategory(id: number, user: any) {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    // 1️⃣ 查询 category
    const [categories]: any = await connection.query(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    );
    if (!categories.length) throw new Error("Category not found");
    const category = categories[0];

    // 2️⃣ 写 log
    await connection.query(
      `
      INSERT INTO category_logs (
        category_id,
        action,
        changed_by,
        changed_at,
        old_data,
        new_data
      )
      VALUES (?, 'DELETE', ?, NOW(), ?, ?)
      `,
      [id, user.id, JSON.stringify(category), JSON.stringify({ deleted: true })]
    );

    // 3️⃣ 真正删除 category
    await connection.query("DELETE FROM categories WHERE id = ?", [id]);

    // 4️⃣ Elasticsearch 删除（可选）
    try {
      await esClient.delete({
        index: "categories",
        id: id.toString(),
        refresh: true,
      });
    } catch (esErr) {
      console.error("❌ Elasticsearch hard delete failed:", esErr);
    }

    await connection.commit();
    connection.release();

    return "Category permanently deleted and logged successfully";
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

export async function restoreCategory(id: number, user: any) {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    // 1️⃣ 查询标签
    const [categories]: any = await connection.query(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    );
    if (!categories.length) throw new Error("Category not found");

    const category = categories[0];
    if (category.is_active === 1) throw new Error("Category is already active");

    // 2️⃣ 更新状态为启用
    await connection.query(
      "UPDATE categories SET is_active = 1, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [user.id, id]
    );

    // 3️⃣ 写日志
    await connection.query(
      `INSERT INTO category_logs (category_id, action, changed_by, old_data, new_data)
       VALUES (?, 'RESTORE', ?, ?, ?)`,
      [
        id,
        user.id,
        JSON.stringify(category),
        JSON.stringify({ restored: true }),
      ]
    );

    // 4️⃣ Elasticsearch 同步
    try {
      await esClient.update({
        index: "categories",
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

    return "Category restored successfully";
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}
