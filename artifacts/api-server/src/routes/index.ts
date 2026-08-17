import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analysisRouter from "./analysis";
import drugQueryRouter from "./drugQuery";
import urlQueryRouter from "./urlQuery";
import historyRouter from "./history";
import adminAuthRouter from "./admin/auth";
import adminStatsRouter from "./admin/stats";
import adminRecordsRouter from "./admin/records";
import adminDrugsRouter from "./admin/drugs";
import adminTagsRouter from "./admin/tags";
import adminRhetoricalRouter from "./admin/rhetoricalAnalyze";
import adminUrlQueriesRouter from "./admin/urlQueries";
import adminUsersRouter from "./admin/users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analysisRouter);
router.use(drugQueryRouter);
router.use(urlQueryRouter);
router.use(historyRouter);
router.use(adminAuthRouter);
router.use(adminStatsRouter);
router.use(adminRecordsRouter);
router.use(adminDrugsRouter);
router.use(adminTagsRouter);
router.use(adminRhetoricalRouter);
router.use(adminUrlQueriesRouter);
router.use(adminUsersRouter);

export default router;
