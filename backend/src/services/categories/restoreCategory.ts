import { User, Category, CategoryLog } from "../categories/interfaces";
import { RowDataPacket, FieldPacket } from "mysql2";
import { withTransaction } from "./helpers/dbHelper";
import { updateCategoryInES } from "./helpers/esHelper";

export async function restoreCategory(id: number, user: User): Promise<string> {
  return withTransaction(async (connection) => {
    const [categories]: [(Category & RowDataPacket)[], FieldPacket[]] =
      await connection.query("SELECT * FROM categories WHERE id = ?", [id]);

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
      await updateCategoryInES(id, {
        is_active: true,
        updated_by_name: user.username,
        updated_at: new Date().toISOString(),
      });
    } catch (esErr) {
      console.error("❌ Elasticsearch restore failed:", esErr);
    }

    return "Category restored successfully";
  });
}
