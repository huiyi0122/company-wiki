import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/response";
import { AuthenticatedRequest } from "../types";
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("Missing or invalid Authorization header");
    res.status(401).json(errorResponse("Missing token"));
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AuthenticatedRequest["user"];

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification failed:", (err as Error).message);
    res.status(403).json(errorResponse("Token invalid or expired"));
  }
};
