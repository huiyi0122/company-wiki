import { Router } from "express";
import createRouter from "./create";
import getRouter from "./get";
import updateRouter from "./update";
import deleteRouter from "./delete";
import restoreRouter from "./restore";

const router = Router();

// 按功能模块组合
router.use("/", createRouter);
router.use("/", getRouter);
router.use("/", updateRouter);
router.use("/", deleteRouter);
router.use("/", restoreRouter);

export default router;
