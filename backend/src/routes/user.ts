import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import database from "../db";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { successResponse, errorResponse } from "../utils/response";
import { PERMISSIONS } from "../constants/permission";

const router = Router();

const ACCESS_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET = process.env.REFRESH_SECRET as string;

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

router.post(
  "/enroll",
  authenticate,
  authorize(PERMISSIONS.USER_ENROLL),
  async (req: Request, res: Response) => {
    const { username, password, role, email } = req.body;

    // 1️⃣ 基本验证
    if (!username || !password || !role || !email) {
      return res.status(400).json(errorResponse("All fields are required"));
    }

    const validRoles = ["admin", "editor", "viewer"];
    if (!validRoles.includes(role)) {
      return res.status(400).json(errorResponse("Invalid role"));
    }

    try {
      // 2️⃣ 检查 username / email 是否已存在
      const [existingRows]: any = await database.query(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        [username, email]
      );
      if (existingRows.length > 0) {
        return res
          .status(400)
          .json(errorResponse("Username or email already exists"));
      }

      // 3️⃣ 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 4️⃣ 创建用户
      const [insertResult]: any = await database.query(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
        [username, email, hashedPassword, role]
      );

      const userId = insertResult.insertId;

      // ✅ 这里不生成 refresh token 也不存进数据库
      const user = { id: userId, username, role };
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // ✅ 直接发 cookie（不入 DB）
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // 5️⃣ 返回结果
      return res.status(201).json(
        successResponse({
          message: `User '${username}' enrolled successfully`,
          user: { id: userId, username, email, role },
          access_token: accessToken,
          refreshToken: refreshToken,
        })
      );
    } catch (err: any) {
      console.error("Enroll error:", err);
      return res.status(500).json(errorResponse("Server error"));
    }
  }
);

router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.USER_ENROLL),
  async (req: Request, res: Response) => {
    const currentUser = (req as any).user;

    try {
      const [rows]: any = await database.query(
        "SELECT id, username, email, role FROM users"
      );
      res.json(successResponse(rows));
    } catch (err) {
      console.error(err);
      res.status(500).json(errorResponse("Failed to fetch users"));
    }
  }
);

router.put("/", authenticate, async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { username, email, password, role } = req.body;

  try {
    // 只有自己能改自己的资料（非 admin）
    if (currentUser.role !== "admin") {
      const { ROLE_PERMISSIONS } = await import("../constants/permission");
      const rolePermissions = ROLE_PERMISSIONS[currentUser.role] || [];

      if (!rolePermissions.includes(PERMISSIONS.USER_EDIT_SELF)) {
        return res.status(403).json(errorResponse("Forbidden"));
      }
    }

    // 查当前用户是否存在
    const [rows]: any = await database.query(
      "SELECT * FROM users WHERE id = ?",
      [currentUser.id]
    );
    if (rows.length === 0) {
      return res.status(404).json(errorResponse("User not found"));
    }

    // 动态组装更新字段
    const updates: string[] = [];
    const values: any[] = [];

    if (username) {
      updates.push("username = ?");
      values.push(username);
    }
    if (email) {
      updates.push("email = ?");
      values.push(email);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push("password = ?");
      values.push(hashedPassword);
    }

    // 只有 admin 才能改 role
    if (role && currentUser.role === "admin") {
      updates.push("role = ?");
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json(errorResponse("No valid fields to update"));
    }

    values.push(currentUser.id);
    await database.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    return res.json(successResponse({ message: "User updated successfully" }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse("Failed to update user"));
  }
});

router.delete(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.USER_ENROLL),
  async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    const { id } = req.params;

    try {
      const [rows]: any = await database.query(
        "SELECT * FROM users WHERE id = ?",
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json(errorResponse("User not found"));
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

router.get("/me", authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json(successResponse(user));
});

export default router;
