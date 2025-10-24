import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { successResponse, errorResponse } from "../../utils/response";
import { searchTagsES, getTagById } from "../../services/tags";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.TAG_READ),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const search = (req.query.search as string | undefined)?.trim();
      const includeInactive = req.query.include_inactive === "true";
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await searchTagsES({
        search,
        includeInactive,
        page,
        limit,
      });

      res.json(successResponse(result));
    } catch (err: unknown) {
      console.error("GET /tags error:", err);
      res.status(500).json(errorResponse("Failed to fetch tags"));
    }
  }
);

router.get(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.TAG_READ),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const tag = await getTagById(Number(id));

      if (!tag) {
        res.status(404).json(errorResponse("Tag not found"));
        return;
      }

      console.log(
        "🔍 Route - Tag from getTagById:",
        JSON.stringify(tag, null, 2)
      );
      console.log(
        "🔍 Route - is_active type:",
        typeof tag.is_active,
        "value:",
        tag.is_active
      );

      const response = successResponse(tag);
      console.log(
        "🔍 Route - Response after successResponse:",
        JSON.stringify(response, null, 2)
      );

      res.json(response);
    } catch (err: unknown) {
      console.error("GET /tags/:id error:", err);
      res.status(500).json(errorResponse("Failed to fetch tag details"));
    }
  }
);

export default router;
