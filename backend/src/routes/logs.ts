import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import database from "../db";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../constants/permission";

const router = Router();

/**
 * GET /logs
 * Query params:
 *   type        - 'article' | 'tag' | 'category' | (optional, default all)
 *   related_id  - id of target (optional)
 *   user_id     - filter by who changed (optional)
 *   page        - page number (default 1)
 *   limit       - page size (default 20)
 */
router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.LOG_READ),
  async (req: Request, res: Response) => {
    const { type, related_id, user_id } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    try {
      let query = "";
      const params: any[] = [];

      // choose query based on type
      switch (type) {
        case "article":
          query = `
          SELECT 'article' AS type, l.id, l.article_id AS target_id, l.action, l.changed_by, u.username AS changed_by_name,
                 l.changed_at, l.old_data, l.new_data
          FROM article_logs l
          JOIN users u ON l.changed_by = u.id
          WHERE 1=1
        `;
          if (related_id) {
            query += " AND l.article_id = ?";
            params.push(related_id);
          }
          if (user_id) {
            query += " AND l.changed_by = ?";
            params.push(user_id);
          }
          break;

        case "tag":
          query = `
          SELECT 'tag' AS type, l.id, l.tag_id AS target_id, l.action, l.changed_by, u.username AS changed_by_name,
                 l.changed_at, l.old_data, l.new_data
          FROM tag_logs l
          JOIN users u ON l.changed_by = u.id
          WHERE 1=1
        `;
          if (related_id) {
            query += " AND l.tag_id = ?";
            params.push(related_id);
          }
          if (user_id) {
            query += " AND l.changed_by = ?";
            params.push(user_id);
          }
          break;

        case "category":
          query = `
          SELECT 'category' AS type, l.id, l.category_id AS target_id, l.action, l.changed_by, u.username AS changed_by_name,
                 l.changed_at, l.old_data, l.new_data
          FROM category_logs l
          JOIN users u ON l.changed_by = u.id
          WHERE 1=1
        `;
          if (related_id) {
            query += " AND l.category_id = ?";
            params.push(related_id);
          }
          if (user_id) {
            query += " AND l.changed_by = ?";
            params.push(user_id);
          }
          break;

        default:
          // unified view of all logs
          query = `
          SELECT type, id, target_id, action, changed_by, changed_by_name, changed_at, old_data, new_data FROM (
            SELECT 'article' AS type, l.id, l.article_id AS target_id, l.action, l.changed_by, u.username AS changed_by_name,
                   l.changed_at, l.old_data, l.new_data
            FROM article_logs l JOIN users u ON l.changed_by = u.id
            UNION ALL
            SELECT 'tag' AS type, l.id, l.tag_id AS target_id, l.action, l.changed_by, u.username AS changed_by_name,
                   l.changed_at, l.old_data, l.new_data
            FROM tag_logs l JOIN users u ON l.changed_by = u.id
            UNION ALL
            SELECT 'category' AS type, l.id, l.category_id AS target_id, l.action, l.changed_by, u.username AS changed_by_name,
                   l.changed_at, l.old_data, l.new_data
            FROM category_logs l JOIN users u ON l.changed_by = u.id
          ) AS all_logs
          WHERE 1=1
        `;
          if (user_id) {
            query += " AND all_logs.changed_by = ?";
            params.push(user_id);
          }
          break;
      }

      // count query for pagination
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as total_logs`;
      const [countResult]: any = await database.query(countQuery, params);
      const total = countResult[0]?.total || 0;

      // add ordering and pagination
      query += " ORDER BY changed_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      const [rows]: any = await database.query(query, params);

      res.json({
        success: true,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        data: rows,
      });
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ success: false, message: "Failed to fetch logs" });
    }
  }
);

export default router;
