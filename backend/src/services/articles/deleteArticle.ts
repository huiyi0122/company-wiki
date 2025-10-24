import database from "../../db";
import { esClient } from "../../elasticSearch";
import { ArticleRow, User } from "./interfaces";

export async function deleteArticle(articleId: number, user: User) {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    const [articles] = await connection.query<ArticleRow[]>(
      "SELECT * FROM articles WHERE id = ?",
      [articleId]
    );

    if (articles.length === 0) {
      throw new Error("Article not found");
    }

    const article = articles[0];

    if (!article.is_active || Number(article.is_active) === 0) {
      throw new Error("Article has already been deleted");
    }

    if (user.role !== "admin" && article.author_id !== user.id) {
      throw new Error("You cannot delete this article");
    }

    await connection.query(
      `
      INSERT INTO article_logs (article_id, action, changed_by, old_data, new_data)
      VALUES (?, 'SOFT_DELETE', ?, ?, ?)
      `,
      [
        articleId,
        user.id,
        JSON.stringify({
          title: article.title,
          content: article.content,
          category_id: article.category_id,
          tags: [],
        }),
        JSON.stringify({ is_active: false }),
      ]
    );

    await connection.query(
      `
      UPDATE articles
      SET is_active = 0,
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
          is_active: false,
          updated_by_name: user.username,
          updated_at: new Date().toISOString(),
        },
        refresh: true,
      });
    } catch (esErr) {
      console.error("⚠️ Elasticsearch sync failed:", esErr);
    }

    await connection.commit();
    return { id: articleId, message: "Article soft-deleted successfully" };
  } catch (err: any) {
    await connection.rollback();

    if (err.message === "Article has already been deleted") {
      throw new Error("This article was already deleted earlier.");
    }
    throw err;
  } finally {
    connection.release();
  }
}
