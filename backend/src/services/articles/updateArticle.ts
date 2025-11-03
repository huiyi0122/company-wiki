import database from "../../db";
import { esClient } from "../../elasticSearch";
import { ensureTags } from "../../utils/tagHelper";
import {
  User,
  TagObject,
  ArticleRow,
  UpdateArticleBody,
  TagRow,
  UserRow,
} from "./interfaces";

export async function updateArticle(
  id: string,
  body: UpdateArticleBody,
  user: User
) {
  const { title, content, category_id, tags, is_active } = body;

  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    // 1️⃣ 取原始文章
    const [originalRows] = await connection.query<ArticleRow[]>(
      "SELECT * FROM articles WHERE id = ?",
      [id]
    );
    if (originalRows.length === 0) throw new Error("Article not found");
    const original = originalRows[0];

    // 2️⃣ 原本标签
    const [origTagRows] = await connection.query<TagRow[]>(
      "SELECT t.id, t.name FROM tags t JOIN article_tags at ON t.id = at.tag_id WHERE at.article_id = ?",
      [id]
    );
    const originalTagObjects: TagObject[] = origTagRows.map((t) => ({
      id: t.id!,
      name: t.name,
    }));

    // 3️⃣ 原始作者名字
    const [authorRows] = await connection.query<UserRow[]>(
      "SELECT username FROM users WHERE id = ?",
      [original.author_id]
    );
    const authorName = authorRows[0]?.username || "";

    // 4️⃣ 创建者 & 更新者名字
    const [userRows] = await connection.query<UserRow[]>(
      `SELECT 
        u_created.username AS created_by_name,
        u_updated.username AS updated_by_name
      FROM users u_created
      JOIN users u_updated ON 1=1
      WHERE u_created.id = ? AND u_updated.id = ?`,
      [original.created_by, original.updated_by]
    );
    const createdBy = userRows[0]?.created_by_name || "";
    const updatedBy = userRows[0]?.updated_by_name || "";

    // 5️⃣ 更新字段逻辑（保持不变）
    const updatedTitle = typeof title !== "undefined" ? title : original.title;
    const updatedContent =
      typeof content !== "undefined" ? content : original.content;
    const updatedCategory =
      typeof category_id !== "undefined"
        ? category_id === null
          ? null
          : category_id
        : original.category_id;
    const updatedIsActive =
      typeof is_active !== "undefined"
        ? Boolean(is_active)
        : Boolean(original.is_active);

    // 6️⃣ 验证字段
    const allowedFields = [
      "title",
      "content",
      "category_id",
      "tags",
      "is_active",
    ];
    const invalidFields = Object.keys(body).filter(
      (key) => !allowedFields.includes(key)
    );
    if (invalidFields.length > 0) {
      throw new Error(`Invalid fields: ${invalidFields.join(", ")}`);
    }

    // 7️⃣ 处理标签
    let finalTagObjects: TagObject[] = originalTagObjects;
    if (typeof tags !== "undefined") {
      if (!Array.isArray(tags)) throw new Error("Tags must be an array");

      await connection.query("DELETE FROM article_tags WHERE article_id = ?", [
        id,
      ]);

      if (tags.length > 0) {
        const ensured = await ensureTags(connection, tags, user.id);
        finalTagObjects = ensured;

        const articleTagValues = finalTagObjects.map((t) => [id, t.id]);
        await connection.query(
          "INSERT INTO article_tags (article_id, tag_id) VALUES ?",
          [articleTagValues]
        );
      } else {
        finalTagObjects = [];
      }
    }

    // 8️⃣ 构建 UPDATE SQL
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (typeof title !== "undefined") {
      fields.push("title = ?");
      params.push(updatedTitle);
    }
    if (typeof content !== "undefined") {
      fields.push("content = ?");
      params.push(updatedContent);
    }
    if (typeof category_id !== "undefined") {
      fields.push("category_id = ?");
      params.push(updatedCategory);
    }
    if (typeof is_active !== "undefined") {
      fields.push("is_active = ?");
      params.push(updatedIsActive ? 1 : 0);
    }

    fields.push("updated_by = ?");
    params.push(user.id);
    fields.push("updated_at = NOW()");

    if (fields.length > 0) {
      const sql = `UPDATE articles SET ${fields.join(", ")} WHERE id = ?`;
      params.push(id);
      await connection.query(sql, params);
    }

    // 9️⃣ 写日志
    await connection.query(
      "INSERT INTO article_logs (article_id, action, changed_by, old_data, new_data) VALUES (?, 'UPDATE', ?, ?, ?)",
      [
        id,
        user.id,
        JSON.stringify({
          title: original.title,
          content: original.content,
          category_id: original.category_id,
          is_active: original.is_active,
        }),
        JSON.stringify({
          title,
          content,
          category_id,
          tags: finalTagObjects.map((t) => t.id),
          is_active,
        }),
      ]
    );

    // 🔟 更新 Elasticsearch，加入 author_name
    try {
      await esClient.index({
        index: "articles",
        id: id.toString(),
        refresh: true,
        document: {
          title: updatedTitle,
          content: updatedContent,
          category_id: updatedCategory,
          author_id: original.author_id,
          author_name: authorName, // ✅ 这里加上作者名字
          tags: finalTagObjects.map((t) => t.name),
          is_active: updatedIsActive,
          created_by: original.created_by,
          updated_by: user.id,
          created_by_name: createdBy,
          updated_by_name: user.username,
          created_at: original.created_at,
          updated_at: new Date().toISOString(),
        },
      });

      console.log("Elasticsearch updated");
    } catch (esErr) {
      console.error("Elasticsearch update failed:", esErr);
    }

    await connection.commit();
    connection.release();

    return {
      id: parseInt(id, 10),
      title: updatedTitle,
      content: updatedContent,
      category_id: updatedCategory,
      tags: finalTagObjects.map((t) => t.name),
      author: authorName, // ✅ 返回作者名字
      created_by: createdBy,
      updated_by: updatedBy,
      is_active: updatedIsActive,
    };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}
