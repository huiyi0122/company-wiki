import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import database from "../../db";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/response";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../../constants/permission";
import { User } from "../../types";
import { RowDataPacket } from "mysql2";
type QueryResult<T> = (T & RowDataPacket)[];

const router = Router();

router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.USER_ENROLL),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const [rows] = await database.query<QueryResult<User>>(
        "SELECT id, username, email, role FROM users"
      );
      res.json(successResponse(rows));
    } catch (err) {
      console.error(err);
      res.status(500).json(errorResponse("Failed to fetch users"));
    }
  }
);

export default router;
