// routes/user.ts
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import database from "../../db";
import { authenticate } from "../../middleware/auth";
import { successResponse, errorResponse } from "../../utils/response";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../../constants/permission";
import { User, AuthenticatedRequest, UpdateUserRequest } from "../../types";
import { RowDataPacket } from "mysql2";
type QueryResult<T> = (T & RowDataPacket)[];

const router = Router();

router.put(
  "/",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const currentUser = (req as AuthenticatedRequest).user;
    const { username, email, password, role } = req.body as UpdateUserRequest;

    if (!currentUser) {
      res.status(401).json(errorResponse("Unauthorized"));
      return;
    }

    try {
      if (currentUser.role !== "admin") {
        const rolePermissions = ROLE_PERMISSIONS[currentUser.role] || [];
        if (!rolePermissions.includes(PERMISSIONS.USER_EDIT_SELF)) {
          res.status(403).json(errorResponse("Forbidden"));
          return;
        }
      }

      const [rows] = await database.query<QueryResult<User>>(
        "SELECT * FROM users WHERE id = ?",
        [currentUser.id]
      );

      if (rows.length === 0) {
        res.status(404).json(errorResponse("User not found"));
        return;
      }

      const updates: string[] = [];
      const values: unknown[] = [];

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
        res.status(400).json(errorResponse("No valid fields to update"));
        return;
      }

      values.push(currentUser.id);
      await database.query(
        `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
        values
      );

      res.json(successResponse({ message: "User updated successfully" }));
    } catch (err) {
      console.error(err);
      res.status(500).json(errorResponse("Failed to update user"));
    }
  }
);

export default router;
