import { Router, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { PERMISSIONS } from "../../constants/permission";
import { AuthenticatedRequest, LogRecord } from "../../types";
import database from "../../db";
import { RowDataPacket } from "mysql2";

const router = Router();

router.get(
  "/:type/:id",
  authenticate,
  authorize(PERMISSIONS.LOG_READ),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { type, id } = req.params;

    try {
      const tableMap: Record<string, { table: string; idField: string }> = {
        article: { table: "article_logs", idField: "article_id" },
        tag: { table: "tag_logs", idField: "tag_id" },
        category: { table: "category_logs", idField: "category_id" },
      };

      if (!tableMap[type]) {
        res.status(400).json({
          success: false,
          message: "Invalid log type. Use one of: article, tag, category.",
        });
        return;
      }

      const { table, idField } = tableMap[type];

      const [rows] = await database.query<LogRecord[]>(
        `
        SELECT 
          '${type}' AS type,
          l.id,
          l.${idField} AS target_id,
          l.action,
          l.changed_by,
          u.username AS changed_by_name,
          l.changed_at,
          l.old_data,
          l.new_data
        FROM ${table} l
        JOIN users u ON l.changed_by = u.id
        WHERE l.id = ?
        `,
        [id]
      );

      if (rows.length === 0) {
        res.status(404).json({
          success: false,
          message: `No ${type} log found with id ${id}`,
        });
        return;
      }

      res.json({
        success: true,
        data: rows[0],
      });
    } catch (error) {
      console.error("Error fetching log detail:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch log details",
      });
    }
  }
);

export default router;
