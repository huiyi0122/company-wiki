import { Router, Request, Response } from "express";
import database from "../../db";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/response";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../../constants/permission";
import { User } from "../../types";
import { RowDataPacket } from "mysql2";
type QueryResult<T> = (T & RowDataPacket)[];

const router = Router();
router.delete(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.USER_ENROLL),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
      const [rows] = await database.query<QueryResult<User>>(
        "SELECT * FROM users WHERE id = ?",
        [id]
      );

      if (rows.length === 0) {
        res.status(404).json(errorResponse("User not found"));
        return;
      }

      await database.query("DELETE FROM users WHERE id = ?", [id]);
      res.json(
        successResponse(`User '${rows[0].username}' deleted successfully`)
      );
    } catch (err) {
      console.error(err);
      res.status(500).json(errorResponse("Failed to delete user"));
    }
  }
);

export default router;
