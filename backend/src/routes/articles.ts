import { Router, Request, Response } from "express";
import database from "../db";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../constants/permission";
import { successResponse, errorResponse } from "../utils/response";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_CREATE),
  async (req: Request, res: Response) => {
    const { title, content, category_id, tags } = req.body;
    const user = (req as any).user;

    if (!title || !content) {
      return res.status(400).json(errorResponse("Title and content required"));
    }

    try {
      const [result]: any = await database.query(
        "INSERT INTO articles (title, content, category_id, author_id) VALUES (?, ?, ?, ?)",
        [title, content, category_id || null, user.id]
      );

      const articleId = result.insertId;

      if (tags && Array.isArray(tags)) {
        for (const tagName of tags) {
          const [existingTags]: any = await database.query(
            "SELECT id FROM tags WHERE name = ?",
            [tagName]
          );

          let tagId;
          if (existingTags.length > 0) {
            tagId = existingTags[0].id;
          } else {
            const [newTag]: any = await database.query(
              "INSERT INTO tags (name) VALUES (?)",
              [tagName]
            );
            tagId = newTag.insertId;
          }

          await database.query(
            "INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)",
            [articleId, tagId]
          );
        }
      }

      res.status(201).json(
        successResponse({
          id: articleId,
          title,
          content,
          category_id,
          tags,
          author: {
            id: user.id,
            username: user.username,
          },
        })
      );
    } catch (err) {
      console.error("Create article error:", err);
      res.status(500).json(errorResponse("Database error"));
    }
  }
);

router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_READ),
  async (_req: Request, res: Response) => {
    try {
      const [rows]: any = await database.query(`
        SELECT 
          a.*, 
          u.username AS author
        FROM articles a
        LEFT JOIN users u ON a.author_id = u.id
        ORDER BY a.created_at DESC
      `);
      res.json(successResponse(rows));
    } catch (err) {
      console.error(err);
      res.status(500).json(errorResponse("Database error"));
    }
  }
);

router.get(
  "/search",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_READ),
  async (req: Request, res: Response) => {
    const { q, category_id, tags, page = "1", limit = "10" } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    try {
      let whereClause = "WHERE 1=1";
      const values: any[] = [];

      // ✅ 搜索扩展: 支持标题、内容、作者、分类、标签
      if (q) {
        whereClause += `
          AND (
            a.title LIKE ?
            OR a.content LIKE ?
            OR u.username LIKE ?
            OR c.name LIKE ?
            OR a.id IN (
              SELECT at.article_id
              FROM article_tags at
              JOIN tags t ON at.tag_id = t.id
              WHERE t.name LIKE ?
            )
          )
        `;
        const keyword = `%${q}%`;
        values.push(keyword, keyword, keyword, keyword, keyword);
      }

      if (category_id) {
        whereClause += " AND a.category_id = ?";
        values.push(category_id);
      }

      // ✅ 保留 tags 精确筛选
      let tagSubQuery = "";
      if (tags) {
        const tagList = (tags as string).split(",").map((t) => t.trim());
        if (tagList.length > 0) {
          tagSubQuery = `
            AND a.id IN (
              SELECT at.article_id
              FROM article_tags at
              JOIN tags t ON at.tag_id = t.id
              WHERE t.name IN (${tagList.map(() => "?").join(",")})
              GROUP BY at.article_id
              HAVING COUNT(DISTINCT t.name) = ?
            )
          `;
          values.push(...tagList, tagList.length);
        }
      }

      // ✅ 主查询
      const [rows]: any = await database.query(
        `
        SELECT
          a.*,
          u.username AS author,
          c.name AS category
        FROM articles a
        LEFT JOIN users u ON a.author_id = u.id
        LEFT JOIN categories c ON a.category_id = c.id
        ${whereClause}
        ${tagSubQuery}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `,
        [...values, limitNum, offset]
      );

      // ✅ 计数
      const countQuery = `
        SELECT COUNT(DISTINCT a.id) AS total
        FROM articles a
        LEFT JOIN users u ON a.author_id = u.id
        LEFT JOIN categories c ON a.category_id = c.id
        ${whereClause}
        ${tagSubQuery}
      `;
      const [countRows]: any = await database.query(countQuery, values);

      res.json(
        successResponse({
          articles: rows,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: countRows[0].total,
          },
        })
      );
    } catch (err: any) {
      console.error("Search articles error:", err);
      res.status(500).json(errorResponse(err.message || "Database error"));
    }
  }
);
router.get(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_READ),
  async (req, res) => {
    const { id } = req.params;
    try {
      const [articles]: any = await database.query(
        `
      SELECT a.*, u.username AS author
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `,
        [id]
      );

      if (!articles.length)
        return res.status(404).json(errorResponse("Article not found"));
      const article = articles[0];

      // ✅ 查询 tag_ids
      const [tags]: any = await database.query(
        `SELECT tag_id FROM article_tags WHERE article_id = ?`,
        [id]
      );
      const tag_ids = tags.map((t: any) => t.tag_id);

      res.json(successResponse({ ...article, tag_ids }));
    } catch (err) {
      console.error(err);
      res.status(500).json(errorResponse("Database error"));
    }
  }
);
router.put(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_UPDATE),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, content, category_id, tags } = req.body; // 👈 接收 tags 数组
    const user = (req as any).user;

    try {
      const [articles]: any = await database.query(
        "SELECT author_id FROM articles WHERE id = ?",
        [id]
      );

      if (articles.length === 0) {
        return res.status(404).json(errorResponse("Article not found"));
      }

      const article = articles[0];

      if (user.role !== "admin" && article.author_id !== user.id) {
        return res
          .status(403)
          .json(errorResponse("You cannot edit this article"));
      }

      if (!title && !content && !category_id && !tags) {
        return res
          .status(400)
          .json(errorResponse("At least one field required"));
      }

      const fields: string[] = [];
      const values: any[] = [];

      if (title) {
        fields.push("title = ?");
        values.push(title);
      }
      if (content) {
        fields.push("content = ?");
        values.push(content);
      }
      if (category_id) {
        fields.push("category_id = ?");
        values.push(category_id);
      }

      if (fields.length > 0) {
        values.push(id);
        await database.query(
          `UPDATE articles SET ${fields.join(", ")} WHERE id = ?`,
          values
        );
      }

      if (Array.isArray(tags)) {
        await database.query("DELETE FROM article_tags WHERE article_id = ?", [
          id,
        ]);

        for (const tagId of tags) {
          await database.query(
            "INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)",
            [id, tagId]
          );
        }
      }

      res.json(successResponse({ id, title, content, category_id, tags }));
    } catch (err) {
      console.error("Update article error:", err);
      res.status(500).json(errorResponse("Database error"));
    }
  }
);

router.delete(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_DELETE),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user;

    try {
      const [articles]: any = await database.query(
        "SELECT author_id FROM articles WHERE id = ?",
        [id]
      );

      if (articles.length === 0) {
        return res.status(404).json(errorResponse("Article not found"));
      }

      const article = articles[0];

      if (user.role !== "admin" && article.author_id !== user.id) {
        return res
          .status(403)
          .json(errorResponse("You cannot delete this article"));
      }

      await database.query("DELETE FROM article_tags WHERE article_id = ?", [
        id,
      ]);

      await database.query("DELETE FROM articles WHERE id = ?", [id]);

      res.json(successResponse({ message: "Article deleted successfully" }));
    } catch (err: any) {
      console.error("Delete article error:", err);
      res.status(500).json(errorResponse(err.message || "Database error"));
    }
  }
);

export default router;
