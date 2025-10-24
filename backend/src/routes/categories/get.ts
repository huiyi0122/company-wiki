import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { successResponse, errorResponse } from "../../utils/response";
import { searchCategoriesES, getCategoryById } from "../../services/categories";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_READ),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const search = (req.query.search as string)?.trim();
      const includeInactive = req.query.include_inactive === "true";

      const result = await searchCategoriesES({
        search,
        includeInactive,
      });

      res.json(successResponse({ data: result }));
    } catch (err: unknown) {
      console.error("GET /categories error:", err);
      res.status(500).json(errorResponse("Failed to fetch categories"));
    }
  }
);

router.get(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_READ),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const category = await getCategoryById(Number(id));

      if (!category) {
        res.status(404).json(errorResponse("Category not found"));
        return;
      }

      res.json({
        success: true,
        ...category,
        is_active: Boolean(category.is_active),
      });
    } catch (err: unknown) {
      console.error("GET /categories/:id error:", err);
      res.status(500).json(errorResponse("Failed to fetch category details"));
    }
  }
);

export default router;
