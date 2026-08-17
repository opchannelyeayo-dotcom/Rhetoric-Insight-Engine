import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analysisRouter from "./analysis";
import drugQueryRouter from "./drugQuery";
import urlQueryRouter from "./urlQuery";
import historyRouter from "./history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analysisRouter);
router.use(drugQueryRouter);
router.use(urlQueryRouter);
router.use(historyRouter);

export default router;
