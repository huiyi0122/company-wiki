// backend/middleware/authorize.ts
import { Request, Response, NextFunction } from "express";
import { ROLE_PERMISSIONS } from "../constants/permission";
import { errorResponse } from "../utils/response";

export const authorize = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !user.role) {
      return res.status(403).json(errorResponse("User not authenticated"));
    }

    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json(errorResponse("Forbidden: Access denied"));
    }

    next();
  };
};
