import { CategoryLog } from "../interfaces";
import { DatabaseConnection } from "./dbHelper";

export async function insertCategoryLog(
  connection: DatabaseConnection,
  log: CategoryLog
): Promise<void> {
  await connection.query(
    `INSERT INTO category_logs (category_id, action, changed_by, old_data, new_data)
     VALUES (?, ?, ?, ?, ?)`,
    [log.category_id, log.action, log.changed_by, log.old_data, log.new_data]
  );
}
