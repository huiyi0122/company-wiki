import { Router, Request, Response } from "express";
import database from "../db";
import { authenticate } from "../middleware/auth";

const router = Router();

// Create article
router.post("/", authenticate, async (req: Request, res: Response) => {
  const { title, content } = req.body;
  if (!title || !content)
    return res.status(400).json({ error: "Title and content required" });

  try {
    const [result]: any = await database.query(
      "INSERT INTO articles (title, content) VALUES (?, ?)",
      [title, content]
    );
    res.status(201).json({ id: result.insertId, title, content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Read all articles
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [rows]: any = await database.query("SELECT * FROM articles");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
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
    if (!rows.length)
      return res.status(404).json({ error: "Article not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Update article
router.put("/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, content } = req.body;
  if (!title || !content)
    return res.status(400).json({ error: "Title and content required" });

  try {
    await database.query(
      "UPDATE articles SET title = ?, content = ? WHERE id = ?",
      [title, content, id]
    );
    res.json({ id, title, content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete article
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await database.query("DELETE FROM articles WHERE id = ?", [id]);
    res.json({ message: "Article deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
