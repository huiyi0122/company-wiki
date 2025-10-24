import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { successResponse, errorResponse } from "../../utils/response";
import { deleteTag } from "../../services/tags";
import { AuthenticatedRequest, User, Tag, DatabaseError } from "../../types";

const router = Router();

router.delete(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.TAG_DELETE),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const currentUser = (req as AuthenticatedRequest).user as User;

    if (!currentUser) {
      res.status(401).json(errorResponse("Unauthorized"));
      return;
    }

    try {
      const message = await deleteTag(parseInt(id), currentUser);
      res.json(successResponse({ message }));
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("DELETE /tags/:id error:", error);

      if (error.message.includes("still used by")) {
        res.status(400).json(errorResponse(error.message));
        return;
      }

      if (error.message.includes("not found")) {
        res.status(404).json(errorResponse(error.message));
        return;
      }

      if (error.message.includes("already deleted")) {
        res.status(400).json(errorResponse(error.message));
        return;
      }

      res.status(500).json(errorResponse("Failed to delete Tag"));
    }
  }
);

export default router;
