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
    { expiresIn: "1h" } // 改为 15 分钟，更安全
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
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const [rows]: any = await database.query(
    "SELECT * FROM users WHERE username = ?",
    [username]
  );
  const user = rows[0];
  if (!user) return res.status(401).json(errorResponse("User not found"));

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json(errorResponse("Wrong password"));

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "none",
    secure: false, // ✅ 因为你是 HTTP
    path: "/",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "none",
    secure: false,
    path: "/",
  });

  res.json(
    successResponse({
      user: { id: user.id, username: user.username, role: user.role },
    })
  );
});

router.post("/refresh-token", async (req, res) => {
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

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "none",
      secure: false, // ✅ 因为你是 HTTP
      path: "/",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: false,
      path: "/",
    });

    res.json(
      successResponse({
        user: { id: user.id, username: user.username, role: user.role },
      })
    );
  } catch (err) {
    console.error(err);
    res.status(403).json(errorResponse("Refresh token invalid"));
  }
});

// === LOGOUT ===
router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
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
