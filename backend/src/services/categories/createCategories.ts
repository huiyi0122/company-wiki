import { ResultSetHeader, FieldPacket } from "mysql2";
import {
  User,
  Category,
  CategoryLog,
  ElasticsearchCategory,
} from "./interfaces";
import {
  withTransaction,
  generateSlug,
  DatabaseConnection,
} from "./helpers/dbHelper";
import { insertCategoryLog } from "./helpers/logHelper";
import { indexCategoryToES } from "./helpers/esHelper";

export async function createCategory(
  name: string,
  user: User
): Promise<Category> {
  return await withTransaction(async (connection: DatabaseConnection) => {
    const slug = generateSlug(name);

    const [result]: [ResultSetHeader, FieldPacket[]] = await connection.query(
      `INSERT INTO categories (name, slug, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [name.trim(), slug, user.id, user.id]
    );

    const categoryId = result.insertId;

    const categoryLog: CategoryLog = {
      category_id: categoryId,
      action: "CREATE",
      changed_by: user.id,
      old_data: null,
      new_data: JSON.stringify({ name, slug }),
    };
    await insertCategoryLog(connection, categoryLog);

    const [rows] = await connection.query(
      `SELECT 
        c.*,
        creator.username as created_by_name,
        updater.username as updated_by_name
       FROM categories c
       LEFT JOIN users creator ON c.created_by = creator.id
       LEFT JOIN users updater ON c.updated_by = updater.id
       WHERE c.id = ?`,
      [categoryId]
    );

    const category = rows[0] as Category;

    const esDoc: ElasticsearchCategory = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      is_active:
        (category.is_active as any) === 1 || category.is_active === true,
      created_by: category.created_by,
      created_by_name: category.created_by_name,
      updated_by: category.updated_by,
      updated_by_name: category.updated_by_name,
      created_at: category.created_at || new Date().toISOString(),
      updated_at: category.updated_at || new Date().toISOString(),
    };
    await indexCategoryToES(categoryId, esDoc);

    return category;
  });
}
