import { Router, Request, Response } from "express";
import database from "../db";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../constants/permission";
import { successResponse, errorResponse } from "../utils/response";

const router = Router();

// ✅ READ all tags
router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.TAG_READ),
  async (req: Request, res: Response) => {
    try {
      const [rows]: any = await database.query("SELECT * FROM tags");
      res.json(successResponse(rows));
    } catch (err) {
      console.error(err);
      res.status(500).json(errorResponse("Failed to fetch tags"));
    }
  }
);

// ✅ READ one tag
router.get(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.TAG_READ),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const [rows]: any = await database.query(
        "SELECT * FROM tags WHERE id = ?",
        [id]
      );

      if (!rows.length) {
        return res.status(404).json(errorResponse("Tag not found"));
      }

      res.json(successResponse(rows[0]));
    } catch (err) {
      console.error(err);
      res.status(500).json(errorResponse("Database error"));
    }
  }
);

// ✅ CREATE tag
router.post(
  "/",
  authenticate,
  authorize(PERMISSIONS.TAG_CREATE),
  async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name) return res.status(400).json(errorResponse("Name is required"));

    try {
      await database.query("INSERT INTO tags (name) VALUES (?)", [name]);
      res.json(successResponse(`Tag '${name}' created successfully`));
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        res.status(400).json(errorResponse("Tag already exists"));
      } else {
        res.status(500).json(errorResponse("Failed to create tag"));
      }
    }
  }
);

// ✅ UPDATE tag (admin only)
router.put(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.TAG_UPDATE),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json(errorResponse("Name is required"));

    try {
      const [result]: any = await database.query(
        "UPDATE tags SET name = ? WHERE id = ?",
        [name, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json(errorResponse("Tag not found"));
      }

      res.json(successResponse(`Tag updated to '${name}'`));
    } catch (err) {
      res.status(500).json(errorResponse("Failed to update tag"));
    }
  }
);

// ✅ DELETE tag (admin only)
router.delete(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.TAG_DELETE),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const [result]: any = await database.query(
        "DELETE FROM tags WHERE id = ?",
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json(errorResponse("Tag not found"));
      }

      res.json(successResponse("Tag deleted successfully"));
    } catch (err) {
      res.status(500).json(errorResponse("Failed to delete tag"));
    }
  }
);

export default router;
