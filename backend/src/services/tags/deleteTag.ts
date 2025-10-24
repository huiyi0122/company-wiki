import { User, Tag, TagLog } from "./interfaces";
import { withTransaction, insertTagLog } from "./helpers/dbHelper";
import { updateTagInES, handleESUpdateError } from "./helpers/esHelper";

export async function deleteTag(id: number, user: User): Promise<string> {
  return withTransaction(async (connection) => {
    const [rows] = (await connection.query("SELECT * FROM tags WHERE id=?", [
      id,
    ])) as any[];

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("Tag not found");
    }

    const original = rows[0] as Tag;

    if (!original.is_active) {
      throw new Error("Tag already deleted");
    }

    const [usageResult] = (await connection.query(
      "SELECT COUNT(*) AS count FROM article_tags WHERE tag_id=?",
      [id]
    )) as any[];

    const usageCount =
      (Array.isArray(usageResult) && usageResult[0]?.count) || 0;

    if (usageCount > 0) {
      throw new Error(
        `Cannot delete tag: still used by ${usageCount} article(s).`
      );
    }

    await connection.query(
      "UPDATE tags SET is_active=0, updated_by=?, updated_at=NOW() WHERE id=?",
      [user.id, id]
    );

    const tagLog: TagLog = {
      tag_id: id,
      action: "SOFT_DELETE",
      changed_by: user.id,
      old_data: JSON.stringify({
        name: original.name,
        slug: original.slug,
        is_active: !!original.is_active,
      }),
      new_data: JSON.stringify({ is_active: false }),
    };

    await insertTagLog(connection, tagLog);

    try {
      await updateTagInES(id, {
        is_active: false,
        updated_by_name: user.username,
        updated_at: new Date().toISOString(),
      });
    } catch (esErr: any) {
      await handleESUpdateError(esErr, connection, original, user, false);
    }

    return "Tag deactivated successfully";
  });
}
