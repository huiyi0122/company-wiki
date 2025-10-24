import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { successResponse } from "../../utils/response";
import { AuthenticatedRequest, ApiResponse } from "../../types";

const router = Router();

router.get(
  "/protected",
  authenticate,
  (req: Request, res: Response<ApiResponse<any>>) => {
    res.json(
      successResponse({
        message: "You are logged in!",
        user: (req as AuthenticatedRequest).user,
      })
    );
  }
);

export default router;
