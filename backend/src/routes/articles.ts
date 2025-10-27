// routes/articles.ts
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
} from "../services/articleService";
import { AuthenticatedRequest, Article, ApiResponse } from "../types";
 
const router = Router();
 
router.post(
  "/",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_CREATE),
  async (req: Request, res: Response<ApiResponse<Article>>): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        res.status(401).json(errorResponse("Unauthorized"));
        return;
      }
 
      const data = await createArticle(req.body, user);
      res.status(201).json(successResponse({ data }));
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("Create article error:", error);
      res.status(500).json(errorResponse(error.message || "Server error"));
    }
  }
);
 
router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_READ),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
 
      const result = await getArticles(page, limit);
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      res.json(successResponse(result));
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("GET /articles error:", error);
      res.status(500).json(errorResponse(error.message || "Database error"));
    }
  }
);
 
router.get(
  "/search",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_READ),
  async (req: Request, res: Response): Promise<void> => {
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
 
router.put(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_UPDATE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        res.status(401).json(errorResponse("Unauthorized"));
        return;
      }
 
      const data = await updateArticle(req.params.id, req.body, user);
      res.status(200).json(successResponse({ data }));
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("Update article error:", error);
      res.status(500).json(errorResponse(error.message || "Server error"));
    }
  }
);
 
router.delete(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_DELETE),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = (req as AuthenticatedRequest).user;
 
    if (!user) {
      res.status(401).json(errorResponse("Unauthorized"));
      return;
    }
 
    try {
      const result = await deleteArticle(Number(id), user);
      res.json(
        successResponse({ message: "Article deleted successfully", result })
      );
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
 
      if (error.message === "Article has already been deleted") {
        res.status(400).json(errorResponse(error.message));
        return;
      }
 
      console.error("Delete article failed:", error);
      res.status(500).json(errorResponse("Internal server error"));
    }
  }
);
router.post(
  "/restore/:id",
  authenticate,
  authorize(PERMISSIONS.ARTICLE_UPDATE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = (req as AuthenticatedRequest).user;
 
      if (!user) {
        res.status(401).json(errorResponse("Unauthorized"));
        return;
      }
 
      const articleId = Number(id);
      if (isNaN(articleId)) {
        res.status(400).json(errorResponse("Invalid article ID"));
        return;
      }
 
      const result = await restoreArticle(articleId, user);
      res.json(successResponse(result));
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
 
      if (error.message === "Article not found") {
        res.status(404).json(errorResponse(error.message));
        return;
      }
      if (error.message === "You cannot restore this article") {
        res.status(403).json(errorResponse(error.message));
        return;
      }
 
      console.error("Restore error:", error);
      res.status(500).json(errorResponse(error.message));
    }
  }
);
 
export default router;
 
 