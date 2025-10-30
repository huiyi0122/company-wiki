import database from "../../db";
import { CountRow, ArticleRow, TagRow, User } from "./interfaces";

export async function getArticles(
  page: number,
  limit: number,
  includeInactive: boolean = false
) {
  const connection = await database.getConnection();

  try {
    const offset = (page - 1) * limit;

    const whereClause = includeInactive ? "" : "WHERE a.is_active = 1";

    const [countRows] = await connection.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM articles a ${whereClause}`
    );
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);

    const [rows] = await connection.query<ArticleRow[]>(
      `
      SELECT
        a.id,
        a.title,
        a.content,
        a.category_id,
        a.is_active,
        a.author_id,
        a.created_at,
        a.updated_at,
        u_author.username AS author,
        u_created.username AS created_by_name,
        u_updated.username AS updated_by_name
      FROM articles a
      LEFT JOIN users u_author ON a.author_id = u_author.id
      LEFT JOIN users u_created ON a.created_by = u_created.id
      LEFT JOIN users u_updated ON a.updated_by = u_updated.id
      ${whereClause}
      ORDER BY a.id DESC
      LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );

    if (!rows.length) {
      return {
        meta: { page, limit, total, totalPages },
        data: [],
      };
    }

    const articleIds = rows.map((r) => r.id);
    const [tagRows] = await connection.query<TagRow[]>(
      `
      SELECT at.article_id, t.name
      FROM article_tags at
      JOIN tags t ON at.tag_id = t.id
      WHERE at.article_id IN (?)
      `,
      [articleIds]
    );

    const tagMap: Record<number, string[]> = tagRows.reduce((acc, cur) => {
      if (!acc[cur.article_id]) acc[cur.article_id] = [];
      acc[cur.article_id].push(cur.name);
      return acc;
    }, {} as Record<number, string[]>);

    const data = rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      category_id: r.category_id,
      author_id: r.author_id,
      tags: tagMap[r.id] || [],
      author: r.author,
      created_by_name: r.created_by_name,
      updated_by_name: r.updated_by_name,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return {
      meta: { page, limit, total, totalPages },
      data,
    };
  } finally {
    connection.release();
  }
}

export async function getArticleById(id: number, user: User) {
  const [rows] = await database.query<ArticleRow[]>(
    `
    SELECT 
      a.id,
      a.title,
      a.content,
      a.category_id,
      a.is_active,
      a.author_id,
      a.created_at, 
      a.updated_at,
      u_author.username AS author_name,
      u_created.username AS created_by_name,
      u_updated.username AS updated_by_name,
      c.name AS category_name
    FROM articles a
    LEFT JOIN users u_author ON a.author_id = u_author.id
    LEFT JOIN users u_created ON a.created_by = u_created.id
    LEFT JOIN users u_updated ON a.updated_by = u_updated.id
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.id = ?
    `,
    [id]
  );

  if (rows.length === 0) return null;

  const article = rows[0];

  if (
    !article.is_active &&
    user.role !== "admin" &&
    article.author_id !== user.id
  ) {
    throw new Error("FORBIDDEN_VIEW");
  }

  const [tagRows] = await database.query<TagRow[]>(
    `
    SELECT t.name
    FROM article_tags at
    JOIN tags t ON at.tag_id = t.id
    WHERE at.article_id = ?
    `,
    [id]
  );

  const tags = tagRows.map((t) => t.name);

  return {
    id: article.id,
    title: article.title,
    content: article.content,
    category_id: article.category_id,
    category_name: article.category_name,
    tags,
    author: article.author_name || "Unknown",
    created_by: article.created_by_name,
    updated_by: article.updated_by_name,
    create_at: article.created_at,
    update_at: article.updated_at,
    is_active: Boolean(article.is_active),
  };
}
