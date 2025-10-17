import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";

import { PERMISSIONS } from "../constants/permission";
import { successResponse, errorResponse } from "../utils/response";
import {
  createCategory,
  GetCategoriesOptions,
  getCategoryById,
  updateCategory,
  deleteCategory,
  hardDeleteCategory,
  restoreCategory,
  searchCategoriesES,
} from "../services/categoryService";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_CREATE),
  async (req: Request, res: Response) => {
    const { name } = req.body;
    const user = (req as any).user;

    if (!name || !name.trim()) {
      return res.status(400).json(errorResponse("Category name is required"));
    }

    try {
      const category = await createCategory(name, user);
      res.json(
        successResponse({
          message: `Category '${name}' created successfully`,
          category,
        })
      );
    } catch (err: any) {
      console.error("Create Category error:", err);
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json(errorResponse("Category already exists"));
      }
      res.status(500).json(errorResponse("Failed to create category"));
    }
  }
);

router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_READ),
  async (req: Request, res: Response) => {
    try {
      const search = (req.query.search as string)?.trim();
      const includeInactive = req.query.include_inactive === "true";

      const result = await searchCategoriesES({
        search,
        includeInactive,
      });

      res.json(successResponse({ data: result }));
    } catch (err) {
      console.error("GET /categories error:", err);
      res.status(500).json(errorResponse("Failed to fetch categories"));
    }
  }
);

router.get(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_READ),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const category = await getCategoryById(Number(id));

      if (!category) {
        return res.status(404).json(errorResponse("Category not found"));
      }

      res.json(successResponse(category));
    } catch (err) {
      console.error("GET /categories/:id error:", err);
      res.status(500).json(errorResponse("Failed to fetch category details"));
    }
  }
);

router.put(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_UPDATE),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, is_active } = req.body;
    const currentUser = (req as any).user;

    try {
      const updated = await updateCategory(
        parseInt(id),
        { name, is_active }, // 现在可以直接传对象
        currentUser
      );

      res.json(successResponse(updated));
    } catch (err: any) {
      console.error("PUT /categories/:id error:", err);
      if (
        err.message === "Category not found" ||
        err.message === "Name is required"
      ) {
        return res.status(404).json(errorResponse(err.message));
      }
      res.status(500).json(errorResponse("Failed to update category"));
    }
  }
);

router.delete(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_DELETE),
  async (req: Request, res: Response) => {
    console.log("DELETE /categories/:id hit", req.params.id);

    const { id } = req.params;
    const currentUser = (req as any).user;
    const force = req.query.force === "true";

    try {
      const message = await deleteCategory(parseInt(id), currentUser, force);
      res.json(successResponse({ message }));
    } catch (err: any) {
      console.error("DELETE /categories/:id error:", err);
      if (err.message === "Category not found") {
        return res.status(404).json(errorResponse(err.message));
      }
      if (err.message.includes("still used by articles")) {
        return res.status(400).json(errorResponse(err.message));
      }
      res.status(500).json(errorResponse("Failed to delete Category"));
    }
  }
);

router.delete(
  "/hard/:id",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_DELETE_HARD),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUser = (req as any).user;

    try {
      const message = await hardDeleteCategory(parseInt(id), currentUser);
      res.json(successResponse({ message }));
    } catch (err: any) {
      console.error("DELETE /categories/hard/:id error:", err);
      if (err.message === "Category not found") {
        return res.status(404).json(errorResponse(err.message));
      }
      res.status(500).json(errorResponse(err.message || "Database error"));
    }
  }
);

router.patch(
  "/restore/:id",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_UPDATE),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUser = (req as any).user;

    try {
      const message = await restoreCategory(parseInt(id), currentUser);
      res.json(successResponse({ message }));
    } catch (err: any) {
      console.error("PATCH /categories/:id/restore error:", err);
      if (
        err.message === "Category not found" ||
        err.message === "Category is already active"
      ) {
        return res.status(404).json(errorResponse(err.message));
      }
      res
        .status(500)
        .json(errorResponse(err.message || "Failed to restore category"));
    }
  }
);
export default router;
