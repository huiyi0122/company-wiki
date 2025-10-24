import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { successResponse, errorResponse } from "../../utils/response";
import { restoreCategory } from "../../services/categories";
import { AuthenticatedRequest, DatabaseError } from "../../types";

const router = Router();

router.patch(
  "/restore/:id",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_UPDATE),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const currentUser = (req as AuthenticatedRequest).user;

    if (!currentUser) {
      res.status(401).json(errorResponse("Unauthorized"));
      return;
    }

    try {
      const message = await restoreCategory(parseInt(id), currentUser);
      res.json(successResponse({ message }));
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("PATCH /categories/:id/restore error:", error);
      if (
        error.message === "Category not found" ||
        error.message === "Category is already active"
      ) {
        res.status(404).json(errorResponse(error.message));
        return;
      }
      res
        .status(500)
        .json(errorResponse(error.message || "Failed to restore category"));
    }
  }
);

export default router;
