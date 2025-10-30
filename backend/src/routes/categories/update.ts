import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { errorResponse } from "../../utils/response";
import { User } from "../../types";
import { updateCategory } from "../../services/categories";
import { AuthenticatedRequest } from "../../types";

const router = Router();
router.put(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_UPDATE),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, is_active } = req.body as {
      name?: string;
      is_active?: boolean;
    };
    const currentUser = (req as AuthenticatedRequest).user as User;

    try {
      const updated = await updateCategory(
        parseInt(id),
        { name, is_active },
        currentUser
      );

      res.json({
        success: true,
        ...updated,
        is_active: Boolean(updated.is_active),
      });
    } catch (err: unknown) {
      console.error("PUT /categories/:id error:", err);
      const error = err as Error;
      if (
        error.message === "Category not found" ||
        error.message === "Name is required"
      ) {
        res.status(404).json(errorResponse(error.message));
        return;
      }
      res.status(500).json(errorResponse("Failed to update category"));
    }
  }
);

export default router;
