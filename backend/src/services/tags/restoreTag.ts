import { User, Tag, TagLog } from "./interfaces";
import { withTransaction, insertTagLog } from "./helpers/dbHelper";
import { updateTagInES, handleESUpdateError } from "./helpers/esHelper";

export async function restoreTag(id: number, user: User): Promise<string> {
  return withTransaction(async (connection) => {
    const [tags] = (await connection.query("SELECT * FROM tags WHERE id=?", [
      id,
    ])) as any[];

    if (!Array.isArray(tags) || tags.length === 0) {
      throw new Error("Tag not found");
    }

    const tag = tags[0] as Tag;

    if (tag.is_active) {
      throw new Error("Tag is already active");
    }

    await connection.query(
      "UPDATE tags SET is_active=1, updated_by=?, updated_at=NOW() WHERE id=?",
      [user.id, id]
    );

    const tagLog: TagLog = {
      tag_id: id,
      action: "RESTORE",
      changed_by: user.id,
      old_data: JSON.stringify(tag),
      new_data: JSON.stringify({ is_active: true }),
    };

    await insertTagLog(connection, tagLog);

    try {
      await updateTagInES(id, {
        is_active: true,
        updated_by_name: user.username,
        updated_at: new Date().toISOString(),
      });
    } catch (esErr: any) {
      await handleESUpdateError(esErr, connection, tag, user, true);
    }

    return "Tag restored successfully";
  });
}
