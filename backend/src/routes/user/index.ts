import { Router } from "express";
import deleteRoutes from "./delete";
import enrollRoutes from "./enroll";
import getRoutes from "./get";
import updateRoutes from "./update";

const router = Router();

router.use("/", getRoutes);
router.use("/", enrollRoutes);
router.use("/", updateRoutes);
router.use("/", deleteRoutes);

export default router;
