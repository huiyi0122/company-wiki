import { Router, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();

import database from "../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { authenticate } from "../middleware/auth";
import { successResponse, errorResponse } from "../utils/response";

const router = Router();
router.use(cookieParser());

const ACCESS_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET = process.env.REFRESH_SECRET as string;

// --- 生成 Token ---
function generateAccessToken(user: any) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    ACCESS_SECRET,
    { expiresIn: "1h" }
  );
}

function generateRefreshToken(user: any) {
  return jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: "7d" });
}

// --- Login ---
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    console.log("ENV:", { JWT_SECRET: ACCESS_SECRET, REFRESH_SECRET });

    const [rows]: any = await database.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );
    console.log("DB rows:", rows);

    const user = rows[0];
    if (!user) return res.status(401).json(errorResponse("User not found"));

    const passwordMatches = await bcrypt.compare(password, user.password);
    console.log("Password matches:", passwordMatches);
    if (!passwordMatches)
      return res.status(401).json(errorResponse("Wrong password"));

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    console.log("AccessToken:", accessToken);
    console.log("RefreshToken:", refreshToken);

    await database.query("UPDATE users SET refresh_token = ? WHERE id = ?", [
      refreshToken,
      user.id,
    ]);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json(
      successResponse({
        token: accessToken,
        user: { id: user.id, username: user.username, role: user.role },
      })
    );
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json(errorResponse(err.message || "Something went wrong"));
  }
});

// --- Refresh Token ---
router.post("/refresh-token", async (req: Request, res: Response) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json(errorResponse("No refresh token"));

    const payload: any = jwt.verify(token, REFRESH_SECRET);
    const [rows]: any = await database.query(
      "SELECT * FROM users WHERE id = ? AND refresh_token = ?",
      [payload.id, token]
    );
    const user = rows[0];
    if (!user)
      return res.status(403).json(errorResponse("Invalid refresh token"));

    const newAccessToken = generateAccessToken(user);
    res.json(successResponse({ token: newAccessToken }));
  } catch (err: any) {
    console.error("Refresh token error:", err);
    res
      .status(403)
      .json(errorResponse(err.message || "Refresh token expired or invalid"));
  }
});

// --- Logout ---
router.post("/logout", async (req: Request, res: Response) => {
  try {
    const token = req.cookies.refreshToken;
    if (token)
      await database.query(
        "UPDATE users SET refresh_token = NULL WHERE refresh_token = ?",
        [token]
      );

    res.clearCookie("refreshToken");
    res.json(successResponse({ message: "Logged out" }));
  } catch (err: any) {
    console.error("Logout error:", err);
    res.status(500).json(errorResponse(err.message || "Something went wrong"));
  }
});

// --- Protected route (获取自己信息) ---
router.get("/protected", authenticate, (req: Request, res: Response) => {
  res.json(
    successResponse({
      message: "You made it! You're logged in.",
      user: (req as any).user,
    })
  );
});

// --- Optional: /protected/:id (获取指定用户) ---
router.get(
  "/protected/:id",
  authenticate,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const [rows]: any = await database.query(
        "SELECT id, username, role FROM users WHERE id = ?",
        [id]
      );
      const user = rows[0];
      if (!user) return res.status(404).json(errorResponse("User not found"));
      res.json(successResponse({ user }));
    } catch (err: any) {
      console.error("Protected/:id error:", err);
      res
        .status(500)
        .json(errorResponse(err.message || "Something went wrong"));
    }
  }
);

export default router;
