import { User, Category, CategoryLog } from "../categories/interfaces";
import { RowDataPacket, FieldPacket } from "mysql2";
import { withTransaction } from "./helpers/dbHelper";
import { updateCategoryInES } from "./helpers/esHelper";

export async function deleteCategory(id: number, user: User): Promise<string> {
  return withTransaction(async (connection) => {
    const [rows]: [(Category & RowDataPacket)[], FieldPacket[]] =
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
    const [usageResult]: [CountRow[], FieldPacket[]] = await connection.query(
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
      await updateCategoryInES(id, {
        is_active: false,
        updated_by_name: user.username,
        updated_at: new Date().toISOString(),
      });
    } catch (esErr) {
      console.error("❌ Elasticsearch update failed:", esErr);
    }

    return "Category deactivated successfully";
  });
}
