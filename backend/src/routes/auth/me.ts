import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { successResponse } from "../../utils/response";
import { AuthenticatedRequest, ApiResponse } from "../../types";

const router = Router();

router.get(
  "/me",
  authenticate,
  (req: Request, res: Response<ApiResponse<any>>) => {
    const user = (req as AuthenticatedRequest).user;
    res.json(
      successResponse({
        user: user
          ? { id: user.id, username: user.username, role: user.role }
          : undefined,
      })
    );
  }
);

export default router;
