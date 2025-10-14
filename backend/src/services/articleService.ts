import database from "../db";
import { esClient } from "../elasticSearch";
import { ensureTags } from "../utils/tagHelper";

export async function createArticle(body: any, user: any) {
  const { title, content, category_id, tags, page = "1", limit = "20" } = body;

  if (!title && !content) throw new Error("Title and content are required");
  if (!title) throw new Error("Title is required");
  if (!content) throw new Error("Content is required");

  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    // 创建文章
    const [articleResult]: any = await connection.query(
      "INSERT INTO articles (title, content, category_id, author_id, created_by, updated_by, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [title, content, category_id || null, user.id, user.id, user.id, 1]
    );
    const articleId = articleResult.insertId;

    // 处理标签
    const allTagObjects = await ensureTags(connection, tags || [], user.id);
    if (allTagObjects.length > 0) {
      const articleTagValues = allTagObjects.map((t) => [articleId, t.id]);
      await connection.query(
        "INSERT INTO article_tags (article_id, tag_id) VALUES ?",
        [articleTagValues]
      );
    }

    // 写日志
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

    // 同步到 Elasticsearch
    try {
      await esClient.index({
        index: "articles",
        id: articleId.toString(),
        refresh: true, // 加上 refresh，方便测试时马上能查到
        document: {
          title,
          content,
          category_id: category_id || null,
          author_id: user.id,
          tags: allTagObjects.map((t) => t.name),
          is_active: true, // ✅ 改这里成真正的 boolean
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

      console.log(`✅ Synced to Elasticsearch: article ${articleId}`);
    } catch (esErr) {
      console.error("❌ Elasticsearch sync failed:", esErr);
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

export async function getArticles(page: number, limit: number) {
  const connection = await database.getConnection();

  try {
    const offset = (page - 1) * limit;

    // 1️⃣ 查总数
    const [countRows]: any = await connection.query(
      "SELECT COUNT(*) AS total FROM articles"
    );
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);

    // 2️⃣ 查数据
    const [rows]: any = await connection.query(
      `
      SELECT 
        a.id,
        a.title,
        a.content,
        a.category_id,
        a.is_active,
        u_author.username AS author,
        u_created.username AS created_by_name,
        u_updated.username AS updated_by_name
      FROM articles a
      LEFT JOIN users u_author ON a.author_id = u_author.id
      LEFT JOIN users u_created ON a.created_by = u_created.id
      LEFT JOIN users u_updated ON a.updated_by = u_updated.id
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

    // 3️⃣ 查 tags
    const articleIds = rows.map((r: any) => r.id);
    const [tagRows]: any = await connection.query(
      `
      SELECT at.article_id, t.name
      FROM article_tags at
      JOIN tags t ON at.tag_id = t.id
      WHERE at.article_id IN (?)
      `,
      [articleIds]
    );

    const tagMap = tagRows.reduce((acc: any, cur: any) => {
      if (!acc[cur.article_id]) acc[cur.article_id] = [];
      acc[cur.article_id].push(cur.name);
      return acc;
    }, {});

    // 4️⃣ 拼装数据
    const data = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      category_id: r.category_id,
      tags: tagMap[r.id] || [],
      author: r.author,
      created_by_name: r.created_by_name,
      updated_by_name: r.updated_by_name,
      is_active: Boolean(r.is_active),
    }));

    // 5️⃣ 返回带分页信息
    return {
      meta: { page, limit, total, totalPages },
      data,
    };
  } finally {
    connection.release();
  }
}

interface SearchParams {
  queryString?: string;
  categoryId?: number;
  tags?: string[];
  pageNumber: number;
  pageSize: number;
}

export async function searchArticles({
  queryString = "",
  categoryId,
  tags,
  pageNumber,
  pageSize,
}: SearchParams) {
  const from = (pageNumber - 1) * pageSize;

  // 🔍 构建 must / filter 条件
  const must: any[] = [];
  const filter: any[] = [{ term: { is_active: true } }];

  if (queryString) {
    must.push({
      multi_match: {
        query: queryString,
        fields: ["title", "content", "tags"],
        fuzziness: "AUTO",
      },
    });
  }

  if (categoryId) {
    filter.push({ term: { category_id: categoryId } });
  }

  if (tags && tags.length > 0) {
    filter.push({
      terms: { tags },
    });
  }

  const searchResponse = await esClient.search({
    index: "articles",
    from,
    size: pageSize,
    query: { bool: { must, filter } },
  });

  const hits = searchResponse.hits.hits;
  const totalHits =
    typeof searchResponse.hits.total === "number"
      ? searchResponse.hits.total
      : searchResponse.hits.total?.value || 0;

  const data = hits.map((hit: any) => ({
    id: parseInt(hit._id, 10),
    title: hit._source.title,
    content: hit._source.content,
    category_id: hit._source.category_id,
    tags: Array.isArray(hit._source.tags) ? hit._source.tags : [],
    author_id: hit._source.author_id,
    is_active: !!hit._source.is_active,
    created_at: hit._source.created_at,
    updated_at: hit._source.updated_at,
  }));

  const totalPages = Math.ceil(totalHits / pageSize);

  return {
    meta: {
      total: totalHits,
      page: pageNumber,
      totalPages,
      limit: pageSize,
    },
    data,
  };
}

export async function getArticleById(id: number, user: any) {
  // 1️⃣ 查文章
  const [rows]: any = await database.query(
    `
    SELECT 
      a.id,
      a.title,
      a.content,
      a.category_id,
      a.is_active,
      a.author_id,
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

  // 2️⃣ 权限检查
  if (
    !article.is_active &&
    user.role !== "admin" &&
    article.author_id !== user.id
  ) {
    throw new Error("FORBIDDEN_VIEW");
  }

  // 3️⃣ 查 tags
  const [tagRows]: any = await database.query(
    `
    SELECT t.name
    FROM article_tags at
    JOIN tags t ON at.tag_id = t.id
    WHERE at.article_id = ?
    `,
    [id]
  );

  const tags = tagRows.map((t: any) => t.name);

  // 4️⃣ 返回整合数据
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    category_id: article.category_id,
    category_name: article.category_name,
    tags,
    author: article.author_name,
    created_by: article.created_by_name,
    updated_by: article.updated_by_name,
    is_active: Boolean(article.is_active),
  };
}

export async function updateArticle(id: string, body: any, user: any) {
  const { title, content, category_id, tags } = body;

  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    // 1) 读取原文章与原 tags（用于 old_data / 默认值）
    const [originalRows]: any = await connection.query(
      "SELECT * FROM articles WHERE id = ?",
      [id]
    );
    if (originalRows.length === 0) {
      throw new Error("Article not found");
    }
    const original = originalRows[0];

    const [origTagRows]: any = await connection.query(
      "SELECT t.id, t.name FROM tags t JOIN article_tags at ON t.id = at.tag_id WHERE at.article_id = ?",
      [id]
    );
    const originalTagObjects: { id: number; name: string }[] =
      origTagRows || [];
    // 在 try { ... } 内，获取 original 文章后
    const [userRows]: any = await connection.query(
      `SELECT 
      u_created.username AS created_by_name,
      u_updated.username AS updated_by_name
    FROM users u_created
    JOIN users u_updated
      ON 1=1
    WHERE u_created.id = ? AND u_updated.id = ?`,
      [original.created_by, original.updated_by]
    );

    const createdBy = userRows[0]?.created_by_name || "";
    const updatedBy = userRows[0]?.updated_by_name || "";

    // 2) 计算更新后的值（如果对应字段未提供就用原来的）
    const updatedTitle = typeof title !== "undefined" ? title : original.title;
    const updatedContent =
      typeof content !== "undefined" ? content : original.content;
    const updatedCategory =
      typeof category_id !== "undefined"
        ? category_id === null
          ? null
          : category_id
        : original.category_id;
    const allowedFields = ["title", "content", "category_id", "tags"];
    const invalidFields = Object.keys(body).filter(
      (key) => !allowedFields.includes(key)
    );
    if (invalidFields.length > 0) {
      throw new Error(`Invalid fields: ${invalidFields.join(", ")}`);
    }

    // 3) 如果有传 tags（包括空数组），处理 tags 逻辑；如果没传 tags 则保持原 tags
    let finalTagObjects: { id: number; name: string }[] = originalTagObjects;

    if (typeof tags !== "undefined") {
      // tags 被明确传入（可能是 [] 或数组）
      if (!Array.isArray(tags)) {
        throw new Error("Tags must be an array");
      }

      // 删除旧的关联
      await connection.query("DELETE FROM article_tags WHERE article_id = ?", [
        id,
      ]);

      if (tags.length > 0) {
        // 确保 tags（已有的取出，新标签插入）
        const ensured = await ensureTags(connection, tags, user.id);
        finalTagObjects = ensured;

        // 插入 article_tags 关联
        const articleTagValues = finalTagObjects.map((t) => [id, t.id]);
        if (articleTagValues.length > 0) {
          await connection.query(
            "INSERT INTO article_tags (article_id, tag_id) VALUES ?",
            [articleTagValues]
          );
        }
      } else {
        // tags === [] -> finalTagObjects 已为 []
        finalTagObjects = [];
        // 已删除关联，无需再插入
      }
    }
    // 如果 tags 未传入 -> finalTagObjects 保持 originalTagObjects（不作改动）

    // 4) 动态构建 UPDATE 语句（只更新被提供的字段），并保证 updated_by / updated_at 总是写入
    const fields: string[] = [];
    const params: any[] = [];

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

    // Always update updated_by and updated_at
    fields.push("updated_by = ?");
    params.push(user.id);
    fields.push("updated_at = NOW()");

    if (fields.length > 0) {
      const sql = `UPDATE articles SET ${fields.join(", ")} WHERE id = ?`;
      params.push(id);
      await connection.query(sql, params);
    }

    // 5) 写日志：记录 old_data 与 new_data（完整快照）

    await connection.query(
      "INSERT INTO article_logs (article_id, action, changed_by, old_data, new_data) VALUES (?, 'UPDATE', ?, ?, ?)",
      [
        id,
        user.id,
        JSON.stringify({
          title: original.title,
          content: original.content,
          category_id: original.category_id,
        }),
        JSON.stringify({
          title,
          content,
          category_id,
          tags: finalTagObjects.map((t) => t.id),
        }),
      ]
    );
    console.log("🔍 Updating ES with document:", {
      index: "articles",
      id: id.toString(),
      refresh: true,
      title: updatedTitle,
      content: updatedContent,
      category_id: updatedCategory,
      tags: finalTagObjects.map((t) => t.name),
    });

    // 🔄 同步更新 articles.last_activity
    await connection.query(
      "UPDATE articles SET last_activity = ? WHERE id = ?",
      ["UPDATE", id]
    );

    // 6) 同步到 Elasticsearch（把完整最新内容 index/replace）
    try {
      console.log("🟡 Preparing to update Elasticsearch:", {
        id,
        title,
        content,
        category_id,
        tags: finalTagObjects.map((t) => t.name),
      });

      const result = await esClient.index({
        index: "articles",
        id: id.toString(),
        refresh: true,
        document: {
          title: updatedTitle,
          content: updatedContent,
          category_id: updatedCategory,
          author_id: original.author_id, // 如果需要 username 可以加 author: authorUsername
          tags: finalTagObjects.map((t) => t.name),
          is_active: !!original.is_active,
          created_by: createdBy, // 这里是用户名
          updated_by: updatedBy, // 这里是用户名
          created_at: original.created_at,
          updated_at: new Date().toISOString(),
        },
      });

      console.log("🟢 Elasticsearch response:", result);
    } catch (esErr) {
      console.error("❌ Elasticsearch update failed:", esErr);
    }

    await connection.commit();
    connection.release();

    // 7) 返回最新的文章快照（tags 为数组）
    return {
      id: parseInt(id, 10),
      title: updatedTitle,
      content: updatedContent,
      category_id: updatedCategory,
      tags: finalTagObjects.map((t) => t.name),
      author: user.username,
      created_by: createdBy,
      updated_by: updatedBy,
      is_active: original.is_active,
    };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

export async function deleteArticle(articleId: number, user: any) {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    // 1️⃣ 找到文章
    const [articles]: any = await connection.query(
      "SELECT * FROM articles WHERE id = ?",
      [articleId]
    );

    if (articles.length === 0) {
      throw new Error("Article not found");
    }

    const article = articles[0];

    // 2️⃣ 权限检查
    if (user.role !== "admin" && article.author_id !== user.id) {
      throw new Error("You cannot delete this article");
    }

    // 3️⃣ 写日志
    await connection.query(
      `INSERT INTO article_logs (article_id, action, changed_by, old_data, new_data)
       VALUES (?, 'SOFT_DELETE', ?, ?, ?)`,
      [
        articleId,
        user.id,
        JSON.stringify({
          title: article.title,
          content: article.content,
          category_id: article.category_id,
          tags: [], // 可扩展：也可以查关联 tags
        }),
        JSON.stringify({ is_active: false }),
      ]
    );

    // 4️⃣ 软删除
    await connection.query(
      "UPDATE articles SET is_active = 0, updated_by = ? WHERE id = ?",
      [user.id, articleId]
    );

    // 5️⃣ Elasticsearch 同步
    try {
      await esClient.update({
        index: "articles",
        id: articleId.toString(),
        doc: {
          is_active: false,
          updated_at: new Date(),
        },
      });
    } catch (esErr) {
      console.error("⚠️ Elasticsearch sync failed:", esErr);
    }

    await connection.commit();
    return { id: articleId, is_active: false };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function restoreArticle(id: string, user: any) {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    // 1️⃣ 查询文章
    const [rows]: any = await connection.query(
      "SELECT * FROM articles WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      throw new Error("Article not found");
    }

    const article = rows[0];

    // 2️⃣ 权限检查
    if (user.role !== "admin" && article.author_id !== user.id) {
      throw new Error("You cannot restore this article");
    }

    // 3️⃣ 写日志
    await connection.query(
      `INSERT INTO article_logs (article_id, action, changed_by, old_data, new_data)
       VALUES (?, 'RESTORE', ?, ?, ?)`,
      [
        id,
        user.id,
        JSON.stringify({ is_active: false }),
        JSON.stringify({ is_active: true }),
      ]
    );

    // 4️⃣ 恢复文章
    await connection.query(
      "UPDATE articles SET is_active = 1, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [user.id, id]
    );

    // 5️⃣ Elasticsearch 同步
    try {
      await esClient.update({
        index: "articles",
        id: id.toString(),
        doc: { is_active: true, updated_at: new Date() },
        refresh: true, // 👈 立即可见
      });
      console.log(`✅ Elasticsearch restored article ${id}`);
    } catch (esErr) {
      console.error("❌ Elasticsearch update failed:", esErr);
    }

    await connection.commit();
    connection.release();

    return { message: "Article restored successfully", id: parseInt(id, 10) };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

export async function hardDeleteArticle(id: string, user: any) {
  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    // 1️⃣ 查出旧数据
    const [articles]: any = await connection.query(
      "SELECT * FROM articles WHERE id = ?",
      [id]
    );
    if (!articles.length) throw new Error("Article not found");
    const article = articles[0];

    // 2️⃣ 权限检查
    if (user.role !== "admin" && article.author_id !== user.id) {
      throw new Error("You cannot delete this article");
    }

    // 3️⃣ 先写 log（确保记录留下来）
    await connection.query(
      `INSERT INTO article_logs (article_id, action, changed_by, old_data, new_data)
       VALUES (?, 'DELETE', ?, ?, ?)`,
      [
        article.id,
        user.id,
        JSON.stringify(article),
        JSON.stringify({ deleted: true }),
      ]
    );

    // 4️⃣ 删除关联表，避免外键冲突
    await connection.query("DELETE FROM article_tags WHERE article_id = ?", [
      id,
    ]);

    // 5️⃣ 删除主表
    await connection.query("DELETE FROM articles WHERE id = ?", [id]);

    // 6️⃣ 删除 ES
    try {
      await esClient.delete({
        index: "articles",
        id: id.toString(),
        refresh: true,
      });
    } catch (err) {
      console.error("❌ Elasticsearch delete failed:", err);
    }

    await connection.commit();
    connection.release();

    return { message: "Article permanently deleted" };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}
