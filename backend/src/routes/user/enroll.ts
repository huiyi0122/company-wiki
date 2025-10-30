import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import database from "../../db";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/response";
import { PERMISSIONS } from "../../constants/permission";
import {
  User,
  AuthenticatedRequest,
  ApiResponse,
  EnrollRequest,
  EnrollResponse,
  ValidRole,
  generateAccessToken,
  generateRefreshToken,
} from "../../types";
import { RowDataPacket } from "mysql2";
type QueryResult<T> = (T & RowDataPacket)[];

const router = Router();

router.post(
  "/enroll",
  authenticate,
  authorize(PERMISSIONS.USER_ENROLL),
  async (
    req: Request,
    res: Response<ApiResponse<EnrollResponse>>
  ): Promise<void> => {
    const { username, password, role, email } = req.body as EnrollRequest;

    if (!username || !password || !role || !email) {
      res.status(400).json(errorResponse("All fields are required"));
      return;
    }

    const validRoles: ValidRole[] = ["admin", "editor", "viewer"];
    if (!validRoles.includes(role as ValidRole)) {
      res.status(400).json(errorResponse("Invalid role"));
      return;
    }

    try {
      const [existingUsers] = await database.query<QueryResult<User>>(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        [username, email]
      );

      if (existingUsers.length > 0) {
        res.status(400).json(errorResponse("Username or email already exists"));
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [insertResult]: any = await database.query(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
        [username, email, hashedPassword, role]
      );

      const userId = insertResult.insertId;

      const user: User = {
        id: userId,
        username,
        email,
        role: role as ValidRole,
      };

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json(
        successResponse({
          message: `User '${username}' enrolled successfully`,
          user,
          access_token: accessToken,
          refreshToken,
        })
      );
    } catch (err: unknown) {
      console.error("Enroll error:", err);
      res.status(500).json(errorResponse("Server error"));
    }
  }
);
export default router;
