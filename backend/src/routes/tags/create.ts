import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { successResponse, errorResponse } from "../../utils/response";
import { createTag } from "../../services/tags";
import { AuthenticatedRequest, User, Tag, DatabaseError } from "../../types";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize(PERMISSIONS.TAG_CREATE),
  async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body as { name?: string };
    const user = (req as AuthenticatedRequest).user as User;

    if (!name || !name.trim()) {
      res.status(400).json(errorResponse("Tag name is required"));
      return;
    }

    try {
      const tag = await createTag(name, user);
      res.json(
        successResponse({
          message: `Tag '${name}' created successfully`,
          tag,
        })
      );
    } catch (err: unknown) {
      console.error("Create tag error:", err);
      const error = err as DatabaseError;
      if (error.code === "ER_DUP_ENTRY") {
        res.status(400).json(errorResponse("Tag already exists"));
        return;
      }
      res.status(500).json(errorResponse("Failed to create tag"));
    }
  }
);

export default router;
