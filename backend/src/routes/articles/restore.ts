import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { successResponse, errorResponse } from "../../utils/response";
import { restoreArticle } from "../../services/articles";
import { AuthenticatedRequest, Article, ApiResponse } from "../../types";

const router = Router();

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
