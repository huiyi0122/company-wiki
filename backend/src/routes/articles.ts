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
  getArticleById,
  hardDeleteArticle,
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
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

      const result = await getArticles(page, limit); // 👈 改参数

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

      res.json(
        successResponse({
          meta: result.meta,
          data: result.data,
        })
      );
    } catch (err: any) {
      console.error("Elasticsearch search error:", err);
      res.status(500).json(errorResponse(err.message || "Search failed"));
    }
  }
);

router.get(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_READ),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user;

    try {
      const article = await getArticleById(Number(id), user);

      if (!article) {
        return res.status(404).json(errorResponse("Article not found"));
      }

      res.json(successResponse({ data: article }));
    } catch (err: any) {
      if (err.message === "FORBIDDEN_VIEW") {
        return res
          .status(403)
          .json(errorResponse("You cannot view this article"));
      }

      console.error("GET /articles/:id error:", err);
      res.status(500).json(errorResponse("Database error"));
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
  "/restore/:id",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_UPDATE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const result = await restoreArticle(id, user);
      res.json(successResponse(result));
    } catch (err: any) {
      if (err.message === "Article not found") {
        return res.status(404).json(errorResponse(err.message));
      } else if (err.message === "You cannot restore this article") {
        return res.status(403).json(errorResponse(err.message));
      }
      console.error("Restore error:", err);
      res.status(500).json(errorResponse(err.message));
    }
  }
);

router.delete(
  "/hard/:id",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_DELETE_HARD),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const result = await hardDeleteArticle(id, user);
      res.json(successResponse(result));
    } catch (err: any) {
      console.error("Hard delete article error:", err);
      if (err.message === "Article not found") {
        res.status(404).json(errorResponse(err.message));
      } else if (err.message.includes("cannot delete")) {
        res.status(403).json(errorResponse(err.message));
      } else {
        res.status(500).json(errorResponse(err.message || "Database error"));
      }
    }
  }
);

export default router;
