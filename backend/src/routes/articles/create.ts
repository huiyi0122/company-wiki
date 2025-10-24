import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { successResponse, errorResponse } from "../../utils/response";
import { createArticle } from "../../services/articles";
import { AuthenticatedRequest, Article, ApiResponse } from "../../types";

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

export default router;
