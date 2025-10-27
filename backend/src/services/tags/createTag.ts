import { User, Tag, TagLog } from "./interfaces";
import {
  withTransaction,
  generateSlug,
  insertTagLog,
} from "./helpers/dbHelper";
import { indexTagToES } from "./helpers/esHelper";

export async function createTag(name: string, user: User): Promise<Tag> {
  return withTransaction(async (connection) => {
    const slug = generateSlug(name);

    const [result] = (await connection.query(
      `INSERT INTO tags (name, slug, created_by)
      VALUES (?, ?, ?)`,
      [name.trim(), slug, user.id]
    )) as any[];
    const tagId = result.insertId;

    const tagLog: TagLog = {
      tag_id: tagId,
      action: "CREATE",
      changed_by: user.id,
      old_data: null,
      new_data: JSON.stringify({ name, slug }),
    };

    await insertTagLog(connection, tagLog);

    await indexTagToES(
      tagId,
      name,
      slug,
      true,
      user.id,
      user.username,
      user.id,
      user.username
    );

    return { id: tagId, name, slug, is_active: true };
  });
}
