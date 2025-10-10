import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../constants/permission";
import { successResponse, errorResponse } from "../utils/response";
import { createTag } from "../services/tagService";
import { getTags } from "../services/tagService";
import { updateTag } from "../services/tagService";
import { deleteTag } from "../services/tagService";
import { hardDeleteTag } from "../services/tagService";
import { restoreTag } from "../services/tagService";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize(PERMISSIONS.TAG_CREATE),
  async (req: Request, res: Response) => {
    const { name } = req.body;
    const user = (req as any).user;

    if (!name || !name.trim()) {
      return res.status(400).json(errorResponse("Tag name is required"));
    }

    try {
      const tag = await createTag(name, user);
      res.json(
        successResponse({
          message: `Tag '${name}' created successfully`,
          tag,
        })
      );
    } catch (err: any) {
      console.error("Create tag error:", err);
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json(errorResponse("Tag already exists"));
      }
      res.status(500).json(errorResponse("Failed to create tag"));
    }
  }
);

router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.TAG_READ),
  async (req: Request, res: Response) => {
    try {
      const tags = await getTags({
        limit: parseInt(req.query.limit as string) || 10,
        lastId: parseInt(req.query.lastId as string) || 0,
        search: req.query.search as string,
        includeInactive: req.query.include_inactive === "true",
        withCount: req.query.with_count === "true",
      });

      res.json(successResponse(tags));
    } catch (err) {
      console.error("GET /tags error:", err);
      res.status(500).json(errorResponse("Failed to fetch tags"));
    }
  }
);

router.put(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.TAG_UPDATE),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUser = (req as any).user;
    const { name, is_active } = req.body;

    try {
      const updated = await updateTag(
        parseInt(id),
        { name, is_active },
        currentUser
      );
      res.json(successResponse(updated));
    } catch (err: any) {
      console.error("PUT /tags/:id error:", err);
      if (
        err.message === "Tag not found" ||
        err.message === "Name is required"
      ) {
        return res.status(404).json(errorResponse(err.message));
      }
      res.status(500).json(errorResponse("Failed to update tag"));
    }
  }
);

router.delete(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.TAG_DELETE),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUser = (req as any).user;
    const force = req.query.force === "true";

    try {
      const message = await deleteTag(parseInt(id), currentUser, force);
      res.json(successResponse({ message }));
    } catch (err: any) {
      console.error("DELETE /tags/:id error:", err);
      if (err.message === "Tag not found") {
        return res.status(404).json(errorResponse(err.message));
      }
      if (err.message.includes("still used by articles")) {
        return res.status(400).json(errorResponse(err.message));
      }
      res.status(500).json(errorResponse("Failed to delete tag"));
    }
  }
);

router.delete(
  "/hard/:id",
  authenticate,
  authorize(PERMISSIONS.TAG_DELETE_HARD),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUser = (req as any).user;

    try {
      const message = await hardDeleteTag(parseInt(id), currentUser);
      res.json(successResponse({ message }));
    } catch (err: any) {
      console.error("DELETE /tags/hard/:id error:", err);
      if (err.message === "Tag not found") {
        return res.status(404).json(errorResponse(err.message));
      }
      res.status(500).json(errorResponse(err.message || "Database error"));
    }
  }
);

router.patch(
  "/restore/:id",
  authenticate,
  authorize(PERMISSIONS.TAG_UPDATE),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUser = (req as any).user;

    try {
      const message = await restoreTag(parseInt(id), currentUser);
      res.json(successResponse({ message }));
    } catch (err: any) {
      console.error("PATCH /tags/:id/restore error:", err);
      if (
        err.message === "Tag not found" ||
        err.message === "Tag is already active"
      ) {
        return res.status(404).json(errorResponse(err.message));
      }
      res
        .status(500)
        .json(errorResponse(err.message || "Failed to restore tag"));
    }
  }
);

export default router;
