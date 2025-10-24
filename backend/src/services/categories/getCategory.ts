import { Category } from "./interfaces";
import { RowDataPacket } from "mysql2";
import database from "../../db";

export async function getCategoryById(id: number): Promise<Category | null> {
  const [rows] = await database.query<(Category & RowDataPacket)[]>(
    `
    SELECT 
      c.id, 
      c.name, 
      c.slug, 
      c.is_active,
      c.created_by,             
      u1.username AS created_by_name,
      c.updated_by,              
      u2.username AS updated_by_name,
      c.created_at,          
      c.updated_at               
    FROM categories c
    LEFT JOIN users u1 ON c.created_by = u1.id
    LEFT JOIN users u2 ON c.updated_by = u2.id
    WHERE c.id = ?
    `,
    [id]
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const category = rows[0];

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    is_active: Boolean(category.is_active),
    created_by: category.created_by,
    created_by_name: category.created_by_name,
    updated_by: category.updated_by,
    updated_by_name: category.updated_by_name,
    created_at: category.created_at,
    updated_at: category.updated_at,
  };
}
