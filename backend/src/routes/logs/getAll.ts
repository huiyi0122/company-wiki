import { Router, Response } from "express";

import { authenticate } from "../../middleware/auth";

import { authorize } from "../../middleware/authorize";

import { PERMISSIONS } from "../../constants/permission";

import { AuthenticatedRequest, LogRecord } from "../../types";

import database from "../../db";

import { RowDataPacket } from "mysql2";

interface CountResult extends RowDataPacket {
  total: number;
}

const router = Router();

router.get(
  "/",

  authenticate,

  authorize(PERMISSIONS.LOG_READ),

  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    let { type, related_id, user_id, startDate, endDate, year, month, date } =
      req.query;

    const page = parseInt(req.query.page as string) || 1;

    const limit = parseInt(req.query.limit as string) || 20;

    const offset = (page - 1) * limit;

    try {
      // 🔧 修复：处理不同的日期过滤场景

      if (date) {
        startDate = `${date}T00:00:00`;

        endDate = `${date}T23:59:59`;
      } else if (year && month) {
        const y = Number(year);

        const m = Number(month);

        const firstDay = `${y}-${String(m).padStart(2, "0")}-01`;

        const lastDay = new Date(y, m, 0).toISOString().split("T")[0];

        startDate = `${firstDay}T00:00:00`;

        endDate = `${lastDay}T23:59:59`;
      } else if (year) {
        const y = Number(year);

        startDate = `${y}-01-01T00:00:00`;

        endDate = `${y}-12-31T23:59:59`;
      } else if (startDate && endDate) {
        // 🆕 关键修复：处理从前端传来的纯日期格式

        // 前端传来的是 YYYY-MM-DD 格式，需要添加时间部分

        startDate = `${startDate}T00:00:00`;

        endDate = `${endDate}T23:59:59`;
      }

      let query = "";

      const params: (string | number)[] = [];

      const dateFilter =
        startDate && endDate ? " AND l.changed_at BETWEEN ? AND ?" : "";

      switch (type) {
        case "article":
          query = `

            SELECT 'article' AS type, l.id, l.article_id AS target_id, l.action, l.changed_by,

                   u.username AS changed_by_name, l.changed_at, l.old_data, l.new_data

            FROM article_logs l

            JOIN users u ON l.changed_by = u.id

            WHERE 1=1

          `;

          if (related_id) {
            query += " AND l.article_id = ?";

            params.push(Number(related_id));
          }

          if (user_id) {
            query += " AND l.changed_by = ?";

            params.push(Number(user_id));
          }

          if (startDate && endDate) {
            query += dateFilter;

            params.push(startDate as string, endDate as string);
          }

          break;

        case "tag":
          query = `

            SELECT 'tag' AS type, l.id, l.tag_id AS target_id, l.action, l.changed_by,

                   u.username AS changed_by_name, l.changed_at, l.old_data, l.new_data

            FROM tag_logs l

            JOIN users u ON l.changed_by = u.id

            WHERE 1=1

          `;

          if (related_id) {
            query += " AND l.tag_id = ?";

            params.push(Number(related_id));
          }

          if (user_id) {
            query += " AND l.changed_by = ?";

            params.push(Number(user_id));
          }

          if (startDate && endDate) {
            query += dateFilter;

            params.push(startDate as string, endDate as string);
          }

          break;

        case "category":
          query = `

           SELECT 'category' AS type, l.id, l.category_id AS target_id, l.action, l.changed_by,

                   u.username AS changed_by_name, l.changed_at, l.old_data, l.new_data

            FROM category_logs l

            JOIN users u ON l.changed_by = u.id

            WHERE 1=1

          `;

          if (related_id) {
            query += " AND l.category_id = ?";

            params.push(Number(related_id));
          }

          if (user_id) {
            query += " AND l.changed_by = ?";

            params.push(Number(user_id));
          }

          if (startDate && endDate) {
            query += dateFilter;

            params.push(startDate as string, endDate as string);
          }

          break;

        default:
          query = `

            SELECT type, id, target_id, action, changed_by, changed_by_name, changed_at, old_data, new_data FROM (

              SELECT 'article' AS type, l.id, l.article_id AS target_id, l.action, l.changed_by,

                     u.username AS changed_by_name, l.changed_at, l.old_data, l.new_data

              FROM article_logs l JOIN users u ON l.changed_by = u.id

              UNION ALL

              SELECT 'tag' AS type, l.id, l.tag_id AS target_id, l.action, l.changed_by,

                     u.username AS changed_by_name, l.changed_at, l.old_data, l.new_data

              FROM tag_logs l JOIN users u ON l.changed_by = u.id

              UNION ALL

              SELECT 'category' AS type, l.id, l.category_id AS target_id, l.action, l.changed_by,

                     u.username AS changed_by_name, l.changed_at, l.old_data, l.new_data

              FROM category_logs l JOIN users u ON l.changed_by = u.id

            ) AS all_logs

            WHERE 1=1

          `;

          if (user_id) {
            query += " AND all_logs.changed_by = ?";

            params.push(Number(user_id));
          }

          if (startDate && endDate) {
            query += " AND all_logs.changed_at BETWEEN ? AND ?";

            params.push(startDate as string, endDate as string);
          }

          break;
      }

      // 🆕 添加调试日志（可选，用于排查问题）

      console.log("📅 Date Filter Applied:", {
        originalStart: req.query.startDate,

        originalEnd: req.query.endDate,

        processedStart: startDate,

        processedEnd: endDate,
      });

      console.log("🔍 SQL Query:", query);

      console.log("📊 Query Params:", params);

      const [countResult] = await database.query<CountResult[]>(
        `SELECT COUNT(*) as total FROM (${query}) as total_logs`,

        params
      );

      const total = countResult?.[0]?.total || 0;

      query += " ORDER BY changed_at DESC LIMIT ? OFFSET ?";

      params.push(limit, offset);

      const [rows] = await database.query<LogRecord[]>(query, params);

      console.log("✅ Results Found:", rows.length);

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
