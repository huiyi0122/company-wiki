import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/response";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.accessToken;
  if (!token) {
    return res.status(401).json(errorResponse("Missing token"));
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET as string,
    (err: jwt.VerifyErrors | null, decoded: any) => {
      if (err) {
        return res.status(403).json(errorResponse("Token invalid or expired"));
      }

      (req as any).user = decoded;
      next();
    }
  );
};
