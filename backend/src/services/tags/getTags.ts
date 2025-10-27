import database from "../../db";
import { Tag } from "./interfaces";

export async function getTagById(id: number): Promise<Tag | null> {
  const [rows] = (await database.query(
    `
      SELECT 
        t.id,
        t.name,
        t.slug,
        t.is_active,
        t.created_by,
        u1.username AS created_by_name,
        t.updated_by,
        u2.username AS updated_by_name,
        t.created_at,
        t.updated_at
      FROM tags t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.updated_by = u2.id 
      WHERE t.id = ?
    `,
    [id]
  )) as any[];

  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const tag = rows[0];

  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    is_active: Boolean(tag.is_active),
    created_by: tag.created_by,
    created_by_name: tag.created_by_name,
    updated_by: tag.updated_by,
    updated_by_name: tag.updated_by_name,
    created_at: tag.created_at,
    updated_at: tag.updated_at,
  };
}
