import { User, Tag, UpdateTagData, TagLog } from "./interfaces";
import {
  withTransaction,
  generateSlug,
  insertTagLog,
  getTagFromDB,
} from "./helpers/dbHelper";
import { indexTagToES } from "./helpers/esHelper";

export async function updateTag(
  id: number,
  data: UpdateTagData,
  user: User
): Promise<Tag> {
  return withTransaction(async (connection) => {
    const { name, is_active } = data;
    const slug = name ? generateSlug(name) : undefined;

    const original = await getTagFromDB(connection, id);

    await connection.query(
      "UPDATE tags SET name=?, slug=?, is_active=?, updated_by=?, updated_at=NOW() WHERE id=?",
      [
        name || original.name,
        slug || original.slug,
        is_active ?? original.is_active,
        user.id,
        id,
      ]
    );

    const tagLog: TagLog = {
      tag_id: id,
      action: "UPDATE",
      changed_by: user.id,
      old_data: JSON.stringify(original),
      new_data: JSON.stringify({ name, slug, is_active }),
    };

    await insertTagLog(connection, tagLog);

    await indexTagToES(
      id,
      name || original.name,
      slug || original.slug,
      Boolean(is_active ?? original.is_active),
      original.created_by || 0,
      original.created_by_name,
      user.id,
      user.username,
      original.created_at,
      new Date().toISOString()
    );

    // ✅ 返回布尔值
    return {
      id,
      name: name || original.name,
      slug: slug || original.slug,
      is_active: Boolean(is_active ?? original.is_active), // ✅ 转为布尔值
      created_by: original.created_by,
      created_by_name: original.created_by_name,
      updated_by: user.id,
      updated_by_name: user.username,
    };
  });
}
