import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { successResponse, errorResponse } from "../../utils/response";
import { updateTag } from "../../services/tags";
import { AuthenticatedRequest, User } from "../../types";

const router = Router();

router.put(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.TAG_UPDATE),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, is_active } = req.body as {
      name?: string;
      is_active?: boolean;
    };
    const currentUser = (req as AuthenticatedRequest).user as User;

    try {
      const updated = await updateTag(
        parseInt(id),
        { name, is_active },
        currentUser
      );
      res.json(successResponse(updated));
    } catch (err: unknown) {
      console.error("PUT /tags/:id error:", err);
      const error = err as Error;
      if (
        error.message === "Tag not found" ||
        error.message === "Name is required"
      ) {
        res.status(404).json(errorResponse(error.message));
        return;
      }
      res.status(500).json(errorResponse("Failed to update tag"));
    }
  }
);

export default router;
