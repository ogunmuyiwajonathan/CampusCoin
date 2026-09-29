import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as controller from "../controllers/insights.controller.js";
import { idParamSchema, monthSchema } from "../validators/ledger.schema.js";

const router = Router();

// Per route rather than router.use, so an unknown path still answers 404.
const auth = [requireAuth];

router.get("/insights", ...auth, controller.listInsights);
router.get("/insights/month", ...auth, validate({ query: monthSchema }), controller.getInsight);
router.post(
  "/insights/month",
  ...auth,
  validate({ query: monthSchema }),
  controller.regenerateInsight,
);

router.get("/tips", ...auth, validate({ query: monthSchema }), controller.listTips);
router.get(
  "/tips/dismissed",
  ...auth,
  validate({ query: monthSchema }),
  controller.listDismissedTips,
);
router.post("/tips/:id/pin", ...auth, validate({ params: idParamSchema }), controller.pinTip);
router.post("/tips/:id/unpin", ...auth, validate({ params: idParamSchema }), controller.unpinTip);
router.post("/tips/:id/dismiss", ...auth, validate({ params: idParamSchema }), controller.dismissTip);
router.post("/tips/:id/restore", ...auth, validate({ params: idParamSchema }), controller.restoreTip);

export default router;
