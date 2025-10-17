import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/response";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 从 Authorization header 获取 token
  // 格式: "Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ Missing or invalid Authorization header");
    return res.status(401).json(errorResponse("Missing token"));
  }

  const token = authHeader.substring(7); // 移除 "Bearer " 前缀

  jwt.verify(
    token,
    process.env.JWT_SECRET as string,
    (err: jwt.VerifyErrors | null, decoded: any) => {
      if (err) {
        console.error("Token verification failed:", err.message);
        return res.status(403).json(errorResponse("Token invalid or expired"));
      }

      (req as any).user = decoded;
      next();
    }
  );
};
