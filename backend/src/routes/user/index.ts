import { Router } from "express";
import deleteRoutes from "./delete";
import enrollRoutes from "./enroll";
import getRoutes from "./get";
import updateRoutes from "./update";

const router = Router();

// 顺序无关紧要，但逻辑上建议：
router.use("/", getRoutes); // GET /users
router.use("/", enrollRoutes); // POST /users/enroll
router.use("/", updateRoutes); // PUT /users
router.use("/", deleteRoutes); // DELETE /users/:id

export default router;
