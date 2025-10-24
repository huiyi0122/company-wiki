import database from "../../db";
import { esClient } from "../../elasticSearch";
import { ArticleRow, User, TagObject } from "./interfaces";

export async function restoreArticle(articleId: number, user: User) {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    const [rows] = await connection.query<ArticleRow[]>(
      "SELECT * FROM articles WHERE id = ?",
      [articleId]
    );

    if (rows.length === 0) {
      throw new Error("Article not found");
    }

    const article = rows[0];

    if (Number(article.is_active) === 1) {
      throw new Error("Article has already been restored");
    }

    if (user.role !== "admin" && article.author_id !== user.id) {
      throw new Error("You cannot restore this article");
    }

    await connection.query(
      `
      INSERT INTO article_logs (article_id, action, changed_by, old_data, new_data)
      VALUES (?, 'RESTORE', ?, ?, ?)
      `,
      [
        articleId,
        user.id,
        JSON.stringify({
          title: article.title,
          content: article.content,
          category_id: article.category_id,
          is_active: false,
        }),
        JSON.stringify({ is_active: true }),
      ]
    );

    await connection.query(
      `
      UPDATE articles
      SET is_active = 1,
          updated_by = ?,
          updated_at = NOW()
      WHERE id = ?
      `,
      [user.id, articleId]
    );

    try {
      await esClient.update({
        index: "articles",
        id: articleId.toString(),
        doc: {
          is_active: true,
          updated_by: user.id,
          updated_at: new Date(),
        },
        refresh: true,
      });
      console.log(`✅ Elasticsearch restored article ${articleId}`);
    } catch (esErr) {
      console.error("⚠️ Elasticsearch sync failed:", esErr);
    }

    await connection.commit();
    return {
      id: articleId,
      is_active: true,
      message: "Article restored successfully",
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
