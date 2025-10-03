import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/response";
import { PERMISSIONS } from "../constants/permissions";

export const authorize = (action: keyof (typeof PERMISSIONS)["admin"]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !user.role) {
      return res.status(403).json(errorResponse("Unauthorized: No role found"));
    }

    const role = user.role as keyof typeof PERMISSIONS;
    const allowed = PERMISSIONS[role]?.[action];

    if (!allowed) {
      return res
        .status(403)
        .json(errorResponse("Forbidden: You don't have permission"));
    }

    next();
  };
};
