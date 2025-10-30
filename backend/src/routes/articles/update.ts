import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { successResponse, errorResponse } from "../../utils/response";
import { updateArticle } from "../../services/articles";
import { AuthenticatedRequest } from "../../types";

const router = Router();

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

export default router;
