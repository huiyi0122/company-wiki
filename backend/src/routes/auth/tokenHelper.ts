import jwt from "jsonwebtoken";
import { User } from "../../types";

const ACCESS_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET = process.env.REFRESH_SECRET as string;

export function generateAccessToken(user: User): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    ACCESS_SECRET,
    { expiresIn: "1h" }
  );
}

export function generateRefreshToken(user: User): string {
  return jwt.sign({ id: user.id, username: user.username }, REFRESH_SECRET, {
    expiresIn: "7d",
  });
}

export interface TokenPayload {
  id: number;
  username: string;
  role?: string;
}
