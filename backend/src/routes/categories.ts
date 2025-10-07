import { Router, Request, Response } from "express";
import database from "../db";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../constants/permission";
import { successResponse, errorResponse } from "../utils/response";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_READ),
  async (req: Request, res: Response) => {
    try {
      const [rows]: any = await database.query("SELECT * FROM categories");
      res.json(successResponse(rows));
    } catch (err) {
      console.error(err);
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
      const [rows]: any = await database.query(
        `
  SELECT 
    c.*
  FROM categories c
  WHERE c.id = ?
  `,
        [id]
      );

      if (!rows.length) {
        return res.status(404).json(errorResponse("Categories not found"));
      }

      res.json(successResponse(rows[0]));
    } catch (err) {
      console.error(err);
      res.status(500).json(errorResponse("Database error"));
    }
  }
);
router.post(
  "/",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_CREATE),
  async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name) return res.status(400).json(errorResponse("Name is required"));

    try {
      await database.query("INSERT INTO categories (name) VALUES (?)", [name]);
      res.json(successResponse(`Category '${name}' created successfully`));
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        res.status(400).json(errorResponse("Category already exists"));
      } else {
        res.status(500).json(errorResponse("Failed to create category"));
      }
    }
  }
);

router.put(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_UPDATE),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json(errorResponse("Name is required"));

    try {
      const [result]: any = await database.query(
        "UPDATE categories SET name = ? WHERE id = ?",
        [name, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json(errorResponse("Category not found"));
      }

      res.json(successResponse(`Category updated to '${name}'`));
    } catch (err) {
      res.status(500).json(errorResponse("Failed to update category"));
    }
  }
);

router.delete(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_DELETE),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const [result]: any = await database.query(
        "DELETE FROM categories WHERE id = ?",
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json(errorResponse("Category not found"));
      }

      res.json(successResponse("Category deleted successfully"));
    } catch (err) {
      res.status(500).json(errorResponse("Failed to delete category"));
    }
  }
);
export default router;
