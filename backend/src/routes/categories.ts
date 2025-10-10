import { Router, Request, Response } from "express";
import database from "../db";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../constants/permission";
import { successResponse, errorResponse } from "../utils/response";
import slugify from "slugify";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_CREATE),
  async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json(errorResponse("Category name is required"));
    }

    // 生成 slug（URL-safe 名称）
    const slug = slugify(name, { lower: true, strict: true });

    try {
      const [existing]: any = await database.query(
        "SELECT id FROM categories WHERE name = ? OR slug = ?",
        [name, slug]
      );
      if (existing.length > 0) {
        return res.status(400).json(errorResponse("Category already exists"));
      }

      // 插入分类
      await database.query(
        `INSERT INTO categories (name, slug, description, created_by) VALUES (?, ?, ?, ?)`,
        [name, slug, description || null, currentUser.id]
      );

      res.json(successResponse(`Category '${name}' created successfully`));
    } catch (err: any) {
      console.error("Error creating category:", err);
      res
        .status(500)
        .json(errorResponse("Internal Server Error while creating category"));
    }
  }
);

router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_READ),
  async (req: Request, res: Response) => {
    try {
      const search = (req.query.search as string)?.trim() || "";
      const includeInactive = req.query.include_inactive === "true";

      let whereClause = "WHERE 1=1";
      const params: any[] = [];

      if (!includeInactive) whereClause += " AND c.is_active = 1";
      if (search) {
        whereClause +=
          " AND MATCH(c.name, c.slug) AGAINST(? IN NATURAL LANGUAGE MODE)";
        params.push(search);
      }

      // 查询所有分类
      const [rows]: any = await database.query(
        `
        SELECT 
          c.id, 
          c.name, 
          c.slug, 
          c.is_active, 
          u1.username AS created_by_name,
          u2.username AS updated_by_name
        FROM categories c
        LEFT JOIN users u1 ON c.created_by = u1.id
        LEFT JOIN users u2 ON c.updated_by = u2.id
        ${whereClause}
        ORDER BY c.name ASC
        `,
        params
      );

      // FULLTEXT fallback（短关键词）
      let finalRows = rows;
      if (!rows.length && search && search.length < 4) {
        console.warn(
          `[Fallback] No FULLTEXT results for "${search}", using LIKE fallback...`
        );
        const likeWhere = whereClause.replace(
          "MATCH(c.name, c.slug) AGAINST(? IN NATURAL LANGUAGE MODE)",
          "(c.name LIKE CONCAT('%', ?, '%') OR c.slug LIKE CONCAT('%', ?, '%'))"
        );
        const [fallbackRows]: any = await database.query(
          `
          SELECT 
            c.id, 
            c.name, 
            c.slug, 
            c.is_active, 
            u1.username AS created_by_name,
            u2.username AS updated_by_name
          FROM categories c
          LEFT JOIN users u1 ON c.created_by = u1.id
          LEFT JOIN users u2 ON c.updated_by = u2.id
          ${likeWhere}
          ORDER BY c.name ASC
          `,
          [...params, search, search]
        );
        finalRows = fallbackRows;
      }

      res.json(
        successResponse({
          data: finalRows,
          meta: { total: finalRows.length },
        })
      );
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
      const [rows]: any = await database.query(
        `
          SELECT 
            c.id,
            c.name,
            c.slug,
            c.is_active,
            u1.username AS created_by_name,
            u2.username AS updated_by_name
          FROM categories c
          LEFT JOIN users u1 ON c.created_by = u1.id
          LEFT JOIN users u2 ON c.updated_by = u2.id
          WHERE c.id = ?
          `,
        [id]
      );

      if (!rows.length) {
        return res.status(404).json(errorResponse("Category not found"));
      }

      res.json(successResponse(rows[0]));
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
    const { name, slug, description, is_active } = req.body;
    const currentUser = (req as any).user;

    try {
      // 检查是否存在
      const [existing]: any = await database.query(
        "SELECT id FROM categories WHERE id = ?",
        [id]
      );
      if (existing.length === 0) {
        return res.status(404).json(errorResponse("Category not found"));
      }

      // 如果一个字段都没传
      if (
        name === undefined &&
        slug === undefined &&
        description === undefined &&
        is_active === undefined
      ) {
        return res
          .status(400)
          .json(errorResponse("No fields provided for update"));
      }

      // 动态构建 update SQL
      const fields: string[] = [];
      const values: any[] = [];

      if (name !== undefined) {
        fields.push("name = ?");
        values.push(name);
      }
      if (slug !== undefined) {
        fields.push("slug = ?");
        values.push(slug);
      }
      if (description !== undefined) {
        fields.push("description = ?");
        values.push(description);
      }
      if (is_active !== undefined) {
        fields.push("is_active = ?");
        values.push(is_active ? 1 : 0);
      }

      // always update updated_by
      fields.push("updated_by = ?");
      values.push(currentUser.id);

      // 最后是 where 条件
      values.push(id);

      const sql = `UPDATE categories SET ${fields.join(", ")} WHERE id = ?`;

      const [result]: any = await database.query(sql, values);

      if (result.affectedRows === 0) {
        return res.status(404).json(errorResponse("Category not found"));
      }

      res.json(successResponse("Category updated successfully"));
    } catch (err: any) {
      console.error("Error updating category:", err);
      if (err.code === "ER_DUP_ENTRY") {
        res
          .status(400)
          .json(errorResponse("Category name or slug already exists"));
      } else {
        res.status(500).json(errorResponse("Failed to update category"));
      }
    }
  }
);

router.delete(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_DELETE),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUser = (req as any).user;
    const force = req.query.force === "true";

    try {
      // 检查是否存在
      const [existing]: any = await database.query(
        "SELECT * FROM categories WHERE id = ?",
        [id]
      );
      if (existing.length === 0) {
        return res.status(404).json(errorResponse("Category not found"));
      }

      // 检查是否有文章使用
      const [used]: any = await database.query(
        "SELECT COUNT(*) AS count FROM articles WHERE category_id = ?",
        [id]
      );

      if (used[0].count > 0 && !force) {
        return res
          .status(400)
          .json(
            errorResponse(
              "Cannot delete category because it’s still used by articles. Use ?force=true to override."
            )
          );
      }

      if (force) {
        await database.query(
          "UPDATE articles SET category_id = NULL WHERE category_id = ?",
          [id]
        );
      }

      // Soft delete: 只是停用，不真正删除
      const [result]: any = await database.query(
        "UPDATE categories SET is_active = 0, updated_by = ? WHERE id = ?",
        [currentUser.id, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json(errorResponse("Category not found"));
      }

      res.json(
        successResponse(
          force
            ? "Category forcibly deactivated and unlinked from articles"
            : "Category deactivated successfully"
        )
      );
    } catch (err) {
      console.error("Delete category error:", err);
      res.status(500).json(errorResponse("Failed to delete category"));
    }
  }
);

router.delete(
  "/hard/:id",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_DELETE_HARD),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user;
    const connection = await database.getConnection();
    await connection.beginTransaction();

    try {
      // 查询分类
      const [categories]: any = await connection.query(
        "SELECT * FROM categories WHERE id = ?",
        [id]
      );
      if (categories.length === 0) {
        return res.status(404).json(errorResponse("Category not found"));
      }
      const category = categories[0];

      // 写日志
      await connection.query(
        "INSERT INTO category_logs (category_id, action, changed_by, old_data, new_data) VALUES (?, 'DELETE', ?, ?, ?)",
        [
          id,
          user.id,
          JSON.stringify(category),
          JSON.stringify({ deleted: true }),
        ]
      );

      // 删除数据库
      await connection.query("DELETE FROM categories WHERE id = ?", [id]);

      await connection.commit();
      connection.release();

      res.json(successResponse({ message: "Category permanently deleted" }));
    } catch (err: any) {
      await connection.rollback();
      connection.release();
      console.error("Hard delete category error:", err);
      res.status(500).json(errorResponse(err.message || "Database error"));
    }
  }
);

router.patch(
  "/:id/restore",
  authenticate,
  authorize(PERMISSIONS.CATEGORY_UPDATE),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUser = (req as any).user;

    try {
      // 先确认分类是否存在
      const [rows]: any = await database.query(
        "SELECT * FROM categories WHERE id = ?",
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json(errorResponse("Category not found"));
      }

      // 如果已经是启用状态
      if (rows[0].is_active === 1) {
        return res
          .status(400)
          .json(errorResponse("Category is already active"));
      }

      // 恢复
      const [result]: any = await database.query(
        "UPDATE categories SET is_active = 1, updated_by = ? WHERE id = ?",
        [currentUser.id, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json(errorResponse("Category not found"));
      }

      res.json(successResponse("Category restored successfully"));
    } catch (err) {
      console.error("Restore category error:", err);
      res.status(500).json(errorResponse("Failed to restore category"));
    }
  }
);

export default router;
