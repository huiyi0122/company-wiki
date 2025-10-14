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

router.post(
  "/enroll",
  authenticate,
  authorize(PERMISSIONS.USER_ENROLL),
  async (req: Request, res: Response) => {
    const { username, password, role, email } = req.body;

    if (!username || !password || !role || !email) {
      return res.status(400).json(errorResponse("All fields are required"));
    }

    const validRoles = ["admin", "editor", "viewer"];
    if (!validRoles.includes(role)) {
      return res.status(400).json(errorResponse("Invalid role"));
    }

    try {
      const [existingRows]: any = await database.query(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        [username, email]
      );
      if (existingRows.length > 0) {
        return res
          .status(400)
          .json(errorResponse("Username or email already exists"));
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // 👇 先创建用户（临时没有 token）
      const [insertResult]: any = await database.query(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
        [username, email, hashedPassword, role]
      );

      const userId = insertResult.insertId;
      const user = { id: userId, username, role };

      // 👇 再生成 token
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // 👇 存入 refresh token
      await database.query("UPDATE users SET refresh_token = ? WHERE id = ?", [
        refreshToken,
        userId,
      ]);

      // 👇 返回结果（可选：也可设置 cookie）
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json(
        successResponse({
          message: `User '${username}' enrolled successfully`,
          user: { id: userId, username, email, role },
          token: accessToken, // Access Token
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

router.put("/:id", authenticate, async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { username, email, password, role } = req.body;

  const isSelf = currentUser.id === Number(id);

  if (currentUser.role !== "admin" && !isSelf) {
    return res
      .status(403)
      .json(errorResponse("Forbidden: You can only edit your own profile"));
  }

  if (!isSelf && currentUser.role !== "admin") {
    return res.status(403).json(errorResponse("Forbidden"));
  }

  if (isSelf && currentUser.role !== "admin") {
    const { ROLE_PERMISSIONS } = await import("../constants/permission");
    const rolePermissions = ROLE_PERMISSIONS[currentUser.role] || [];
    if (!rolePermissions.includes(PERMISSIONS.USER_EDIT_SELF)) {
      return res.status(403).json(errorResponse("Forbidden"));
    }
  }

  try {
    const [rows]: any = await database.query(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json(errorResponse("User not found"));
    }

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

    if (role && currentUser.role === "admin") {
      updates.push("role = ?");
      values.push(role);
    }

    if (updates.length === 0) {
      return res
        .status(400)
        .json(errorResponse("You're not allow to edit role!"));
    }

    values.push(id);
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
