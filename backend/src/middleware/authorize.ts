import { Response, NextFunction } from "express";
import { ROLE_PERMISSIONS } from "../constants/permission";
import { errorResponse } from "../utils/response";
import { AuthenticatedRequest } from "../types";

export const authorize = (requiredPermission: string) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const user = req.user;

    if (!user || !user.role) {
      res.status(403).json(errorResponse("User not authenticated"));
      return;
    }

    const userPermissions = ROLE_PERMISSIONS[user.role] || [];

    if (!userPermissions.includes(requiredPermission)) {
      res.status(403).json(errorResponse("Forbidden: Access denied"));
      return;
    }

    next();
  };
};
