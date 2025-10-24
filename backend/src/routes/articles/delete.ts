import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { successResponse, errorResponse } from "../../utils/response";
import { deleteArticle } from "../../services/articles";
import { AuthenticatedRequest } from "../../types";

const router = Router();

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

export default router;
