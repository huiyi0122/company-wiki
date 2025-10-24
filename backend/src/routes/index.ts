import { Router } from "express";
import authRoutes from "./auth";
import categoriesRoutes from "./categories";
import articlesRoutes from "./articles";

const router = Router();

router.use("/", authRoutes);
router.use("/categories", categoriesRoutes);
router.use("/articles", articlesRoutes);

export default router;
