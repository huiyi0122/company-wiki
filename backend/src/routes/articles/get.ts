// routes/articles.ts
import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { successResponse, errorResponse } from "../../utils/response";
import {
  getArticleById,
  getArticles,
  searchArticles,
} from "../../services/articles";
import { AuthenticatedRequest } from "../../types";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_READ),
  async (req: Request, res: Response) => {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const includeInactive = req.query.include_inactive === "true";

      const result = await getArticles(page, limit, includeInactive);
      res.json(successResponse(result));
    } catch (err: any) {
      console.error("GET /articles error:", err);
      res.status(500).json(errorResponse(err.message || "Database error"));
    }
  }
);

router.get(
  "/search",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_READ),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = "1",
        limit = "20",
        q,
        category_id,
        tags,
        author_id,
      } = req.query;
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
        authorId: author_id ? Number(author_id) : undefined,
        pageNumber,
        pageSize,
      });

      res.json(
        successResponse({
          meta: result.meta,
          data: result.data,
        })
      );
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("Elasticsearch search error:", error);
      res.status(500).json(errorResponse(error.message || "Search failed"));
    }
  }
);

router.get(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_READ),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      res.status(401).json(errorResponse("Unauthorized"));
      return;
    }

    try {
      const article = await getArticleById(Number(id), user);

      if (!article) {
        res.status(404).json(errorResponse("Article not found"));
        return;
      }

      res.json(successResponse({ data: article }));
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.message === "FORBIDDEN_VIEW") {
        res.status(403).json(errorResponse("You cannot view this article"));
        return;
      }

      console.error("GET /articles/:id error:", error);
      res.status(500).json(errorResponse("Database error"));
    }
  }
);

export default router;
