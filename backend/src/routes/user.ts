import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import database from "../db";
import { authenticate } from "../middleware/auth";
import { successResponse, errorResponse } from "../utils/response";

const router = Router();

router.post("/enroll", authenticate, async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { username, password, role, email } = req.body;

  if (currentUser.role !== "admin") {
    return res.status(403).json(errorResponse("Forbidden: Admin only"));
  }

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
    await database.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, role]
    );

    const [newUserRows]: any = await database.query(
      "SELECT id, username, email, role FROM users WHERE username = ?",
      [username]
    );
    const newUser = newUserRows[0];

    return res.status(201).json(
      successResponse({
        message: `User '${username}' enrolled successfully`,
        user: newUser,
      })
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse("Server error"));
  }
});

router.get("/", authenticate, async (req: Request, res: Response) => {
  const currentUser = (req as any).user;

  if (currentUser.role !== "admin") {
    return res.status(403).json(errorResponse("Forbidden: Admin only"));
  }

  try {
    const [rows]: any = await database.query(
      "SELECT id, username, email, role FROM users"
    );
    res.json(successResponse(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Failed to fetch users"));
  }
});

router.put("/:id", authenticate, async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { username, email, password, role } = req.body;

  // ✅ 允许 admin 或者 当前用户自己修改自己的资料
  if (currentUser.role !== "admin" && currentUser.id !== Number(id)) {
    return res
      .status(403)
      .json(errorResponse("Forbidden: Not allowed to edit other users"));
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
    if (role && currentUser.role === "admin") {
      // ⚠️ 只有 admin 才能改 role
      updates.push("role = ?");
      values.push(role);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push("password = ?");
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json(errorResponse("No fields to update"));
    }

    values.push(id);
    await database.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    return res.json(successResponse("User updated successfully"));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse("Failed to update user"));
  }
});

router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;

  if (currentUser.role !== "admin") {
    return res.status(403).json(errorResponse("Forbidden: Admin only"));
  }

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
});

router.get("/me", authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json(successResponse(user));
});

export default router;
