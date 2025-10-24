import { Router } from "express";
import loginRoute from "./login";
import refreshRoute from "./refreshToken";
import logoutRoute from "./logout";
import meRoute from "./me";
import protectedRoute from "./protected";
import updateUsernameRoute from "./updateUsername";

const router = Router();

router.use("/", loginRoute);
router.use("/", refreshRoute);
router.use("/", logoutRoute);
router.use("/", meRoute);
router.use("/", protectedRoute);
router.use("/", updateUsernameRoute);

export default router;
