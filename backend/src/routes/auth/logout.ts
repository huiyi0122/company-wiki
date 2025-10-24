import { Router } from "express";
import { successResponse } from "../../utils/response";

const router = Router();

router.post("/logout", (req, res) => {
  res.json(successResponse({ message: "Logged out successfully" }));
});

export default router;
