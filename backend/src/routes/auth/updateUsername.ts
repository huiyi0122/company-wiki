import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import database from "../../db";
import { successResponse, errorResponse } from "../../utils/response";
import { AuthenticatedRequest } from "../../types";

const router = Router();

router.put(
  "/update-username",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        res.status(401).json(errorResponse("Unauthorized"));
        return;
      }

      if (!username) {
        res.status(400).json(errorResponse("Username required"));
        return;
      }

      await database.query("UPDATE users SET username = ? WHERE id = ?", [
        username,
        user.id,
      ]);

      res.json(successResponse({ message: "Username updated successfully" }));
    } catch (err) {
      console.error("Update username error:", err);
      res.status(500).json(errorResponse("Failed to update username"));
    }
  }
);

export default router;
