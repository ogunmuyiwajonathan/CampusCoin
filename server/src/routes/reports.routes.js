import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as reports from "../controllers/reports.controller.js";
import { reportsQuerySchema, shareReportSchema } from "../validators/reports.schema.js";

const router = Router();
const auth = [requireAuth];

router.get("/reports", ...auth, validate({ query: reportsQuerySchema }), reports.getReports);
router.get("/reports/categories", ...auth, reports.getReportCategories);
router.post("/reports/share", ...auth, validate({ body: shareReportSchema }), reports.shareReport);

export default router;
