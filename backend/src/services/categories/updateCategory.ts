import {
  UpdateCategoryData,
  User,
  Category,
  ElasticsearchCategory,
} from "../categories/interfaces";
import { updateCategoryInES } from "./helpers/esHelper";
import { withTransaction, generateSlug } from "./helpers/dbHelper";

export async function updateCategory(
  id: number,
  data: UpdateCategoryData,
  user: User
): Promise<Category> {
  return withTransaction(async (connection) => {
    const { name, is_active } = data;
    const slug = name ? generateSlug(name) : undefined;

    const [rows] = await connection.query(
      `SELECT 
        c.*,
        creator.username as created_by_name,
        updater.username as updated_by_name
       FROM categories c
       LEFT JOIN users creator ON c.created_by = creator.id
       LEFT JOIN users updater ON c.updated_by = updater.id
       WHERE c.id = ?`,
      [id]
    );

    if (!rows.length) {
      throw new Error("Category not found");
    }

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

    await connection.query(
      `INSERT INTO category_logs (category_id, action, changed_by, old_data, new_data)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        "UPDATE",
        user.id,
        JSON.stringify(original),
        JSON.stringify({ name, slug, is_active }),
      ]
    );

    const esDoc: ElasticsearchCategory = {
      id,
      name: name || original.name,
      slug: slug || original.slug,
      is_active: Boolean(is_active ?? original.is_active),
      created_by: original.created_by,
      created_by_name: original.created_by_name,
      updated_by: user.id,
      updated_by_name: user.username,
      created_at: original.created_at,
      updated_at: new Date().toISOString(),
    };
    console.log("🪶 ES 更新文档:", esDoc);

    await updateCategoryInES(id, esDoc);

    return {
      id,
      name: name || original.name,
      slug: slug || original.slug,
      is_active: Boolean(is_active ?? original.is_active),
      created_by: original.created_by,
      created_by_name: original.created_by_name,
      updated_by: user.id,
      updated_by_name: user.username,
      created_at: original.created_at,
      updated_at: new Date().toISOString(),
    };
  });
}
