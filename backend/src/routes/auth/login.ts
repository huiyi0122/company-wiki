import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { RowDataPacket } from "mysql2";
import database from "../../db";
import { successResponse, errorResponse } from "../../utils/response";
import { User, ApiResponse } from "../../types";
import { generateAccessToken, generateRefreshToken } from "./tokenHelper";

dotenv.config();
const router = Router();

router.post("/login", async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json(errorResponse("Username and password required"));
      return;
    }

    const [rows] = await database.query<(User & RowDataPacket)[]>(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );
    const user = rows[0];
    if (!user) throw new Error("User not found");

    const valid = await bcrypt.compare(password, user.password || "");
    if (!valid) {
      res.status(401).json(errorResponse("Wrong password"));
      return;
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json(
      successResponse({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      })
    );
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json(errorResponse("Login failed"));
  }
});

export default router;
