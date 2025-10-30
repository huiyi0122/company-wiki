import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { successResponse, errorResponse } from "../../utils/response";
import { restoreTag } from "../../services/tags";
import { AuthenticatedRequest, User } from "../../types";

const router = Router();

router.patch(
  "/restore/:id",
  authenticate,
  authorize(PERMISSIONS.TAG_UPDATE),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const currentUser = (req as AuthenticatedRequest).user as User;

    try {
      const message = await restoreTag(parseInt(id), currentUser);
      res.json(successResponse({ message }));
    } catch (err: unknown) {
      console.error("PATCH /tags/:id/restore error:", err);
      const error = err as Error;
      if (
        error.message === "Tag not found" ||
        error.message === "Tag is already active"
      ) {
        res.status(404).json(errorResponse(error.message));
        return;
      }
      res
        .status(500)
        .json(errorResponse(error.message || "Failed to restore tag"));
    }
  }
);
export default router;
