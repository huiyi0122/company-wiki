import { Router, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import database from "../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticate } from "../middleware/auth";
import { successResponse, errorResponse } from "../utils/response";

const router = Router();

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
  return jwt.sign({ id: user.id, username: user.username }, REFRESH_SECRET, {
    expiresIn: "7d",
  });
}

// === LOGIN ===
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json(errorResponse("Username and password required"));
    }

    const [rows]: any = await database.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json(errorResponse("User not found"));
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json(errorResponse("Wrong password"));
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 直接在响应体返回 tokens，不存 cookies
    res.json(
      successResponse({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      })
    );
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json(errorResponse("Login failed"));
  }
});

// === REFRESH TOKEN ===
router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json(errorResponse("Refresh token required"));
    }

    const payload: any = jwt.verify(refreshToken, REFRESH_SECRET);
    const [rows]: any = await database.query(
      "SELECT * FROM users WHERE id = ?",
      [payload.id]
    );
    const user = rows[0];

    if (!user) {
      return res.status(403).json(errorResponse("User no longer exists"));
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json(
      successResponse({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      })
    );
  } catch (err: any) {
    console.error("Refresh token error:", err.message);
    res.status(403).json(errorResponse("Refresh token invalid or expired"));
  }
});

// === LOGOUT ===
router.post("/logout", (req: Request, res: Response) => {
  // localStorage tokens 由前端管理清除，后端只需返回成功响应
  res.json(successResponse({ message: "Logged out successfully" }));
});

// === GET CURRENT USER (ME) ===
router.get("/me", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json(
    successResponse({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    })
  );
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

// === UPDATE USERNAME ===
router.put(
  "/update-username",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      const user = (req as any).user;

      if (!username) {
        return res.status(400).json(errorResponse("Username required"));
      }

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
