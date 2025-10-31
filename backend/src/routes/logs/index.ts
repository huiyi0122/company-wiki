import { Router } from "express";
import getAllRouter from "./getAll";
import getByIdRouter from "./getById";

const router = Router();

router.use("/", getAllRouter);
router.use("/", getByIdRouter);

export default router;
