import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { successResponse, errorResponse } from "../../utils/response";
import { createCategory } from "../../services/categories";
import { AuthenticatedRequest, DatabaseError } from "../../types";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_CREATE),
  async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body as { name?: string };
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      res.status(401).json(errorResponse("Unauthorized"));
      return;
    }

    if (!name || !name.trim()) {
      res.status(400).json(errorResponse("Category name is required"));
      return;
    }

    try {
      const category = await createCategory(name, user);
      res.json(
        successResponse({
          message: `Category '${name}' created successfully`,
          category,
        })
      );
    } catch (err: unknown) {
      const error = err as DatabaseError;
      console.error("Create Category error:", error);
      if (error.code === "ER_DUP_ENTRY") {
        res.status(400).json(errorResponse("Category already exists"));
        return;
      }
      res.status(500).json(errorResponse("Failed to create category"));
    }
  }
);

export default router;
