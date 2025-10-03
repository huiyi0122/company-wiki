import { Router, Request, Response } from "express";
import database from "../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticate } from "../middleware/auth";
import { successResponse, errorResponse } from "../utils/response";

const router = Router();

// Login
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    const [rows]: any = await database.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json(errorResponse("User not found"));
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json(errorResponse("Wrong password"));
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    res.json(
      successResponse({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      })
    );
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json(errorResponse("Something went wrong"));
  }
});

// Protected route
router.get("/protected", authenticate, (req: Request, res: Response) => {
  res.json(
    successResponse({
      message: "You made it! You're logged in.",
      user: (req as any).user,
    })
  );
});

export default router;
