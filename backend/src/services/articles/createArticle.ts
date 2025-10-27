import database from "../../db";
import { esClient } from "../../elasticSearch";
import { ensureTags } from "../../utils/tagHelper";
import { CreateArticleBody, Article, User, TagObject } from "./interfaces";
import { ResultSetHeader } from "mysql2";

export async function createArticle(
  body: CreateArticleBody,
  user: User
): Promise<Article> {
  const { title, content, category_id, tags } = body;

  if (!title) throw new Error("Title is required");
  if (!content) throw new Error("Content is required");

  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    const [articleResult] = await connection.query<ResultSetHeader>(
      "INSERT INTO articles (title, content, category_id, author_id, created_by, updated_by, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [title, content, category_id ?? null, user.id, user.id, user.id, 1]
    );
    const articleId: number = articleResult.insertId;

    const allTagObjects: TagObject[] = await ensureTags(
      connection,
      tags ?? [],
      user.id
    );
    if (allTagObjects.length > 0) {
      const articleTagValues = allTagObjects.map((t) => [articleId, t.id]);
      await connection.query(
        "INSERT INTO article_tags (article_id, tag_id) VALUES ?",
        [articleTagValues]
      );
    }

    await connection.query(
      "INSERT INTO article_logs (article_id, action, changed_by, new_data) VALUES (?, 'CREATE', ?, ?)",
      [
        articleId,
        user.id,
        JSON.stringify({
          title,
          content,
          category_id,
          tags: allTagObjects.map((t) => t.id),
        }),
      ]
    );

    try {
      await esClient.index({
        index: "articles",
        id: articleId.toString(),
        refresh: true,
        document: {
          title,
          content,
          category_id: category_id ?? null,
          author_id: user.id,
          author_name: user.username,
          tags: allTagObjects.map((t) => t.name),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
      console.log(`Synced to Elasticsearch: article ${articleId}`);
    } catch (esErr) {
      console.error("Elasticsearch sync failed:", esErr);
    }

    await connection.commit();
    connection.release();

    return {
      id: articleId,
      title,
      content,
      category_id,
      tags: allTagObjects.map((t) => t.name),
      author: user.username,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}
