import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sentinelopsRouter from "./sentinelops";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sentinelopsRouter);

export default router;
