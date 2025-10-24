import database from "../../../db";

export interface DatabaseConnection {
  query(sql: string, values?: any[]): Promise<any>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}

export async function withTransaction<T>(
  callback: (connection: DatabaseConnection) => Promise<T>
): Promise<T> {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export function generateSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}
