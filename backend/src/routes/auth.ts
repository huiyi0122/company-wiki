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

//  JWT Secret Key
const ACCESS_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET = process.env.REFRESH_SECRET as string;

// Token generator
function generateAccessToken(user: any) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    ACCESS_SECRET,
    { expiresIn: "1h" }
  );
}

function generateRefreshToken(user: any) {
  return jwt.sign(
    { id: user.id, username: user.username },
    REFRESH_SECRET,
    { expiresIn: "7d" } // Refresh token 有效期 7 天
  );
}

//  LOGIN
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    const [rows]: any = await database.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    const user = rows[0];
    if (!user) return res.status(401).json(errorResponse("User not found"));

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches)
      return res.status(401).json(errorResponse("Wrong password"));

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    //Send both tokens via HttpOnly cookies
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15分钟
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    });

    //不返回 tokens 到 body
    res.json(
      successResponse({
        user: { id: user.id, username: user.username, role: user.role },
      })
    );
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json(errorResponse("Login failed"));
  }
});

router.post("/refresh-token", async (req: Request, res: Response) => {
  try {
    const oldToken = req.cookies.refreshToken;
    if (!oldToken)
      return res.status(401).json(errorResponse("No refresh token found"));

    const payload: any = jwt.verify(oldToken, REFRESH_SECRET);

    const [rows]: any = await database.query(
      "SELECT * FROM users WHERE id = ?",
      [payload.id]
    );
    const user = rows[0];
    if (!user)
      return res.status(403).json(errorResponse("User no longer exists"));

    //生成新的 token
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15分钟
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    });

    //不返回 token 到 body
    res.json(
      successResponse({
        user: { id: user.id, username: user.username, role: user.role },
      })
    );
  } catch (err: any) {
    console.error("Refresh token error:", err);
    res
      .status(403)
      .json(
        errorResponse("Refresh token expired or invalid, please login again")
      );
  }
});

// === LOGOUT ===
router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.json(successResponse({ message: "Logged out successfully" }));
});

// === TEST Protected Route ===
router.get("/protected", authenticate, (req: Request, res: Response) => {
  res.json(
    successResponse({
      message: "You are logged in!",
      user: (req as any).user,
    })
  );
});

// === UPDATE Username using token ID ===
router.put(
  "/update-username",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      const user = (req as any).user; // 从 JWT 里拿 user.id

      if (!username)
        return res.status(400).json(errorResponse("Username required"));

      await database.query("UPDATE users SET username = ? WHERE id = ?", [
        username,
        user.id,
      ]);

      res.json(successResponse({ message: "Username updated successfully" }));
    } catch (err: any) {
      console.error("Update username error:", err);
      res.status(500).json(errorResponse("Failed to update username"));
    }
  }
);

export default router;
