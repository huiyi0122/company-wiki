import { Router, Request, Response } from "express";
import database from "../db";
import { authenticate } from "../middleware/auth";
import { successResponse, errorResponse } from "../utils/response";

const router = Router();

// Create article
router.post("/", authenticate, async (req: Request, res: Response) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json(errorResponse("Title and content required"));
  }

  try {
    const [result]: any = await database.query(
      "INSERT INTO articles (title, content) VALUES (?, ?)",
      [title, content]
    );
    res
      .status(201)
      .json(successResponse({ id: result.insertId, title, content }));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Database error"));
  }
});

// Read all articles
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [rows]: any = await database.query("SELECT * FROM articles");
    res.json(successResponse(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Database error"));
  }
});

// Search articles
router.get("/search", async (req: Request, res: Response) => {
  const { q, page = "1", limit = "10" } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClause = "";
    let values: any[] = [];

    if (q) {
      whereClause = "WHERE title LIKE ? OR content LIKE ?";
      values.push(`%${q}%`, `%${q}%`);
    }

    // 查文章
    const [rows]: any = await database.query(
      `SELECT * FROM articles ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, limitNum, offset]
    );

    // 查总数
    const [countRows]: any = await database.query(
      `SELECT COUNT(*) as total FROM articles ${whereClause}`,
      values
    );

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
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Database error"));
  }
});

// Read one article
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rows]: any = await database.query(
      "SELECT * FROM articles WHERE id = ?",
      [id]
    );
    if (!rows.length) {
      return res.status(404).json(errorResponse("Article not found"));
    }
    res.json(successResponse(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Database error"));
  }
});

// Update article
router.put("/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (!title && !content) {
    return res.status(400).json(errorResponse("At least one field required"));
  }

  try {
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

    values.push(id);

    await database.query(
      `UPDATE articles SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    res.json(successResponse({ id, title, content }));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Database error"));
  }
});

// Delete article
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await database.query("DELETE FROM articles WHERE id = ?", [id]);
    res.json(successResponse({ message: "Article deleted" }));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Database error"));
  }
});

export default router;
