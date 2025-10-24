import database from "../../../db";
import { DatabaseConnection, TagLog } from "../interfaces";

export function generateSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function withTransaction<T>(
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

export async function insertTagLog(
  connection: DatabaseConnection,
  tagLog: TagLog
): Promise<void> {
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
}

export async function getTagFromDB(connection: DatabaseConnection, id: number) {
  const [rows] = (await connection.query(
    `SELECT 
      t.*,
      creator.username as created_by_name,
      updater.username as updated_by_name
    FROM tags t
    LEFT JOIN users creator ON t.created_by = creator.id
    LEFT JOIN users updater ON t.updated_by = updater.id
    WHERE t.id = ?`,
    [id]
  )) as any[];

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Tag not found");
  }

  return rows[0];
}

export async function getUsernameById(
  connection: DatabaseConnection,
  userId?: number
): Promise<string> {
  if (!userId) return "Unknown";

  const [creators] = (await connection.query(
    "SELECT username FROM users WHERE id=?",
    [userId]
  )) as any[];

  return (Array.isArray(creators) && creators[0]?.username) || "Unknown";
}
