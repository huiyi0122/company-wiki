import { Router, Request, Response } from "express";
import database from "../db";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../constants/permission";
import { successResponse, errorResponse } from "../utils/response";

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

    const slug = name.trim().toLowerCase().replace(/\s+/g, "-");

    try {
      const [result]: any = await database.query(
        `
        INSERT INTO tags (name, slug, created_by)
        VALUES (?, ?, ?)
        `,
        [name.trim(), slug, user.id]
      );

      res.json(
        successResponse({
          message: `Tag '${name}' created successfully`,
          tag: { id: result.insertId, name, slug },
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
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const lastId = parseInt(req.query.lastId as string) || 0;
      const search = (req.query.search as string)?.trim() || "";
      const includeInactive = req.query.include_inactive === "true";
      const withCount = req.query.with_count === "true";

      let whereClause = "WHERE 1=1";
      const params: any[] = [];

      if (!includeInactive) whereClause += " AND t.is_active = 1";
      if (search) {
        whereClause +=
          " AND MATCH(t.name, t.slug) AGAINST(? IN NATURAL LANGUAGE MODE)";
        params.push(search);
      }
      if (lastId > 0) {
        whereClause += " AND t.id < ?";
        params.push(lastId);
      }

      const [rows]: any = await database.query(
        `
        SELECT 
          t.id, 
          t.name, 
          t.slug, 
          t.is_active, 
          u1.username AS created_by_name,
          u2.username AS updated_by_name
        FROM tags t
        LEFT JOIN users u1 ON t.created_by = u1.id
        LEFT JOIN users u2 ON t.updated_by = u2.id
        ${whereClause}
        ORDER BY t.id DESC
        LIMIT ?
        `,
        [...params, limit]
      );

      // fallback for short keywords
      let finalRows = rows;
      if (!rows.length && search && search.length < 4) {
        console.warn(
          `[Fallback] No FULLTEXT results for "${search}", using LIKE fallback...`
        );
        const likeWhere = whereClause.replace(
          "MATCH(t.name, t.slug) AGAINST(? IN NATURAL LANGUAGE MODE)",
          "(t.name LIKE CONCAT('%', ?, '%') OR t.slug LIKE CONCAT('%', ?, '%'))"
        );
        const [fallbackRows]: any = await database.query(
          `
          SELECT 
            t.id, 
            t.name, 
            t.slug, 
            t.is_active, 
            u1.username AS created_by_name,
            u2.username AS updated_by_name
          FROM tags t
          LEFT JOIN users u1 ON t.created_by = u1.id
          LEFT JOIN users u2 ON t.updated_by = u2.id
          ${likeWhere}
          ORDER BY t.id DESC
          LIMIT ?
          `,
          [...params, search, search, limit]
        );
        finalRows = fallbackRows;
      }

      let total = null;
      if (withCount) {
        const [[countResult]]: any = await database.query(
          `SELECT COUNT(*) as total FROM tags ${whereClause}`,
          params
        );
        total = countResult.total;
      }

      res.json(
        successResponse({
          meta: {
            total,
            limit,
            nextCursor: finalRows.length
              ? finalRows[finalRows.length - 1].id
              : null,
          },
          data: finalRows,
        })
      );
    } catch (err) {
      console.error("GET /tags error:", err);
      res.status(500).json(errorResponse("Failed to fetch tags"));
    }
  }
);

router.get(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.TAG_READ),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const [rows]: any = await database.query(
        `
        SELECT 
          t.id,
          t.name,
          t.slug,
          t.is_active,
          u1.username AS created_by_name,
          u2.username AS updated_by_name
        FROM tags t
        LEFT JOIN users u1 ON t.created_by = u1.id
        LEFT JOIN users u2 ON t.updated_by = u2.id
        WHERE t.id = ?
        `,
        [id]
      );

      if (!rows.length) {
        return res.status(404).json(errorResponse("Tag not found"));
      }

      res.json(successResponse(rows[0]));
    } catch (err) {
      console.error("GET /tags/:id error:", err);
      res.status(500).json(errorResponse("Failed to fetch tag details"));
    }
  }
);

import slugify from "slugify";

router.put(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.TAG_UPDATE),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, is_active } = req.body;
    const currentUser = (req as any).user;

    if (!name?.trim()) {
      return res.status(400).json(errorResponse("Name is required"));
    }

    try {
      // ✅ 1. 检查 tag 是否存在
      const [existing]: any = await database.query(
        "SELECT id FROM tags WHERE id = ?",
        [id]
      );
      if (!existing.length) {
        return res.status(404).json(errorResponse("Tag not found"));
      }

      // ✅ 2. 自动生成 slug（统一格式）
      const slug = slugify(name, { lower: true, strict: true });

      // ✅ 3. 更新记录
      const [result]: any = await database.query(
        `
        UPDATE tags
        SET name = ?, slug = ?, is_active = COALESCE(?, is_active),
            updated_at = NOW(), updated_by = ?
        WHERE id = ?
        `,
        [name, slug, is_active, currentUser.id, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json(errorResponse("Tag not found"));
      }

      // ✅ 4. 返回更新后的数据
      const [[updatedTag]]: any = await database.query(
        `
        SELECT 
          t.id, t.name, t.slug, t.is_active, 
          u1.username AS created_by_name,
          u2.username AS updated_by_name
        FROM tags t
        LEFT JOIN users u1 ON t.created_by = u1.id
        LEFT JOIN users u2 ON t.updated_by = u2.id
        WHERE t.id = ?
        `,
        [id]
      );

      res.json(successResponse(updatedTag));
    } catch (err) {
      console.error("PUT /tags/:id error:", err);
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
      // 1️⃣ 检查 tag 是否存在
      const [existing]: any = await database.query(
        "SELECT * FROM tags WHERE id = ?",
        [id]
      );
      if (existing.length === 0) {
        return res.status(404).json(errorResponse("Tag not found"));
      }

      // 2️⃣ 检查关联文章
      const [used]: any = await database.query(
        "SELECT COUNT(*) AS count FROM article_tags WHERE tag_id = ?",
        [id]
      );
      if (used[0].count > 0 && !force) {
        return res
          .status(400)
          .json(
            errorResponse(
              "Cannot delete tag because it’s still used by articles. Use ?force=true to override."
            )
          );
      }

      // 3️⃣ force 删除关联
      if (force) {
        await database.query("DELETE FROM article_tags WHERE tag_id = ?", [id]);
      }

      // 4️⃣ soft delete
      const [result]: any = await database.query(
        "UPDATE tags SET is_active = 0, updated_by = ? WHERE id = ?",
        [currentUser.id, id]
      );

      res.json(
        successResponse(
          force
            ? "Tag forcibly deactivated and unlinked from articles"
            : "Tag deactivated successfully"
        )
      );
    } catch (err) {
      console.error("Delete tag error:", err);
      res.status(500).json(errorResponse("Failed to delete tag"));
    }
  }
);

router.patch(
  "/:id/restore",
  authenticate,
  authorize(PERMISSIONS.TAG_UPDATE),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUser = (req as any).user;

    try {
      // 先确认分类是否存在
      const [rows]: any = await database.query(
        "SELECT * FROM tags WHERE id = ?",
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json(errorResponse("Tag not found"));
      }

      // 如果已经是启用状态
      if (rows[0].is_active === 1) {
        return res.status(400).json(errorResponse("Tag is already active"));
      }

      // 恢复
      const [result]: any = await database.query(
        "UPDATE tags SET is_active = 1, updated_by = ? WHERE id = ?",
        [currentUser.id, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json(errorResponse("Tag not found"));
      }

      res.json(successResponse("Tag restored successfully"));
    } catch (err) {
      console.error("Restore tag error:", err);
      res.status(500).json(errorResponse("Failed to restore tag"));
    }
  }
);
export default router;
