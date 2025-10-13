import database from "../db";
import { esClient } from "../elasticSearch";

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

    await connection.query(
      `INSERT INTO category_logs (category_id, action, changed_by, old_data, new_data)
       VALUES (?, 'CREATE', ?, NULL, ?)`,
      [categoryId, user.id, JSON.stringify({ name, slug })]
    );

    try {
      await esClient.index({
        index: "categories",
        id: categoryId.toString(),
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
      console.error("❌ Elasticsearch create category failed:", esErr);
    }

    await connection.commit();
    connection.release();

    return { id: categoryId, name, slug };
  } catch (err: any) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

export async function getCategory(options: {
  search?: string;
  includeInactive?: boolean;
  withCount?: boolean;
}) {
  const search = options.search?.trim() || "";
  const includeInactive = !!options.includeInactive;
  const withCount = !!options.withCount;

  let whereClause = "WHERE 1=1";
  const params: any[] = [];

  if (!includeInactive) whereClause += " AND c.is_active = 1";
  if (search) {
    whereClause +=
      " AND MATCH(c.name, c.slug) AGAINST(? IN NATURAL LANGUAGE MODE)";
    params.push(search);
  }

  // 查询 categories
  let [rows]: any = await database.query(
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
    ${whereClause}
    ORDER BY c.id DESC
    `,
    params
  );

  // fallback for short keywords
  if (!rows.length && search && search.length < 4) {
    const likeWhere = whereClause.replace(
      "MATCH(c.name, c.slug) AGAINST(? IN NATURAL LANGUAGE MODE)",
      "(c.name LIKE CONCAT('%', ?, '%') OR c.slug LIKE CONCAT('%', ?, '%'))"
    );
    const [fallbackRows]: any = await database.query(
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
      ${likeWhere}
      ORDER BY c.id DESC
      `,
      [...params, search, search]
    );
    rows = fallbackRows;
  }

  let total = null;
  if (withCount) {
    const [[countResult]]: any = await database.query(
      `SELECT COUNT(*) as total FROM categories c ${whereClause}`,
      params
    );
    total = countResult.total;
  }

  return {
    meta: { total },
    data: rows.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      is_active: Boolean(c.is_active),
      created_by: c.created_by_name,
      updated_by: c.updated_by_name,
    })),
  };
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

export async function updateCategory(
  id: number,
  body: { name: string; is_active?: boolean },
  user: any
) {
  const { name, is_active } = body;

  if (!name?.trim()) throw new Error("Name is required");

  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    const [rows]: any = await connection.query(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    );
    if (!rows.length) throw new Error("Category not found");
    const original = rows[0];

    const slug = name.trim().toLowerCase().replace(/\s+/g, "-");

    await connection.query(
      `
      UPDATE categories
      SET name = ?, slug = ?, is_active = COALESCE(?, is_active),
          updated_at = NOW(), updated_by = ?
      WHERE id = ?
      `,
      [name, slug, is_active, user.id, id]
    );

    await connection.query(
      `
      INSERT INTO category_logs (category_id, action, changed_by, old_data, new_data)
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
        index: "categories",
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
