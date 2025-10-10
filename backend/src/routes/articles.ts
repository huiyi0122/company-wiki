import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../constants/permission";
import { successResponse, errorResponse } from "../utils/response";
import {
  createArticle,
  restoreArticle,
  getArticles,
  updateArticle,
  deleteArticle,
  searchArticles,
} from "../services/articleService";

const router = Router();

// ✅ 创建文章
router.post(
  "/",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_CREATE),
  async (req: Request, res: Response) => {
    try {
      const data = await createArticle(req.body, (req as any).user);
      res.status(201).json(successResponse({ data }));
    } catch (err: any) {
      console.error("Create article error:", err);
      res.status(500).json(errorResponse(err.message || "Server error"));
    }
  }
);

router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_READ),
  async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 5, 100);
      const lastId = parseInt(req.query.lastId as string) || 0;

      const result = await getArticles(limit, lastId); // 👈 调用 service

      res.json(successResponse(result));
    } catch (err: any) {
      console.error("GET /articles error:", err);
      res.status(500).json(errorResponse(err.message || "Database error"));
    }
  }
);
// routes/articles.ts
router.get(
  "/search",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_READ),
  async (req: Request, res: Response) => {
    try {
      const { page = "1", limit = "20", q, category_id, tags } = req.query;

      const pageNumber = Math.max(parseInt(page as string, 10), 1);
      const pageSize = Math.min(parseInt(limit as string, 10), 100);

      const result = await searchArticles({
        queryString: q ? String(q) : "",
        categoryId: category_id ? Number(category_id) : undefined,
        tags:
          typeof tags === "string"
            ? tags.split(",").map((t) => t.trim())
            : Array.isArray(tags)
            ? tags.map((t) => String(t))
            : undefined,
        pageNumber,
        pageSize,
      });

      res.json(successResponse(result));
    } catch (err: any) {
      console.error("Elasticsearch search error:", err);
      res.status(500).json(errorResponse(err.message || "Search failed"));
    }
  }
);

router.put(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_UPDATE),
  async (req: Request, res: Response) => {
    try {
      const data = await updateArticle(
        req.params.id,
        req.body,
        (req as any).user
      );
      res.status(200).json(successResponse({ data }));
    } catch (err: any) {
      console.error("Update article error:", err);
      res.status(500).json(errorResponse(err.message || "Server error"));
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
      const result = await deleteArticle(Number(id), user);
      res.json(
        successResponse({ message: "Article deleted successfully", result })
      );
    } catch (err: any) {
      console.error("❌ Delete article failed:", err);
      res
        .status(500)
        .json(errorResponse(err.message || "Internal server error"));
    }
  }
);

router.post(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_UPDATE),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user;
    try {
      const result = await restoreArticle(id, user); // 👈 调用 service
      res.json(successResponse(result));
    } catch (err: any) {
      console.error("Restore article error:", err);
      res.status(500).json(errorResponse(err.message || "Database error"));
    }
  }
);
export default router;
