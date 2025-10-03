// src/middleware/authorize.ts
import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/response";
import { ROLE_PERMISSIONS } from "../constants/permission";

/**
 * 权限检查中间件
 * @param requiredPermission 需要的权限（比如 PERMISSIONS.ARTICLE_CREATE）
 */
export const authorize = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json(errorResponse("Unauthorized"));
    }

    const role = user.role;
    const permissions = ROLE_PERMISSIONS[role] || [];

    if (!permissions.includes(requiredPermission)) {
      return res.status(403).json(errorResponse("Forbidden: no permission"));
    }

    next();
  };
};
