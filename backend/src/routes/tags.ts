import { Router, Request, Response } from "express";
import database from "../db";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../constants/permission";
import { successResponse, errorResponse } from "../utils/response";
import { error } from "console";

const router = Router();

// ✅ 获取所有标签
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const [rows]: any = await database.query("SELECT * FROM tags");
    res.json(successResponse(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Failed to fetch tags"));
  }
});

// ✅ 新增标签（admin/editor）
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
        "UPDATE tags SET name = ? WHERE is = ?",
        [name, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json(errorResponse("Tag not found"));
      }
      res.json(successResponse(`Tag Update to '${name}'`));
    } catch (err) {
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

    try {
      const [result]: any = await database.query(
        "DELETE FROM tags WHERE id =?",
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
