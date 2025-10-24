// routes/user.ts
import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { successResponse } from "../../utils/response";
import { RowDataPacket } from "mysql2";
import { AuthenticatedRequest } from "../../types";
type QueryResult<T> = (T & RowDataPacket)[];

const router = Router();

router.get("/me", authenticate, (req: Request, res: Response): void => {
  const user = (req as AuthenticatedRequest).user;
  res.json(successResponse(user));
});

export default router;
