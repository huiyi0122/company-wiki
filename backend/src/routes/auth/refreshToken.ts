import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { RowDataPacket } from "mysql2";
import database from "../../db";
import { successResponse, errorResponse } from "../../utils/response";
import { User, ApiResponse } from "../../types";
import {
  generateAccessToken,
  generateRefreshToken,
  TokenPayload,
} from "./tokenHelper";

const router = Router();
const REFRESH_SECRET = process.env.REFRESH_SECRET as string;

router.post(
  "/refresh-token",
  async (req: Request, res: Response<ApiResponse<any>>) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(401).json(errorResponse("Refresh token required"));
        return;
      }

      const payload = jwt.verify(refreshToken, REFRESH_SECRET) as TokenPayload;
      const [rows] = await database.query<(User & RowDataPacket)[]>(
        "SELECT * FROM users WHERE id = ?",
        [payload.id]
      );
      const user = rows[0];
      if (!user) throw new Error("User not found");

      const newAccess = generateAccessToken(user);
      const newRefresh = generateRefreshToken(user);

      res.json(
        successResponse({
          accessToken: newAccess,
          refreshToken: newRefresh,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
          },
        })
      );
    } catch (err) {
      console.error("Refresh token error:", err);
      res.status(401).json(errorResponse("Refresh token invalid or expired"));
    }
  }
);

export default router;
