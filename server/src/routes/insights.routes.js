import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as controller from "../controllers/insights.controller.js";
import { monthSchema, objectIdParamSchema } from "../validators/ledger.schema.js";

const router = Router();

// Per route rather than router.use, so an unknown path still answers 404 instead
// of being swallowed by a blanket auth check.
const auth = [requireAuth];

router.get("/insights", ...auth, controller.listInsights);
router.get("/insights/month", ...auth, validate({ query: monthSchema }), controller.getInsight);
router.post(
  "/insights/month",
  ...auth,
  validate({ query: monthSchema }),
  controller.regenerateInsight,
);

// Declared before /tips/:id/... on purpose: an id route would otherwise match
// the word "dismissed" and try to look up a tip by that name.
router.get("/tips", ...auth, validate({ query: monthSchema }), controller.listTips);
router.get(
  "/tips/dismissed",
  ...auth,
  validate({ query: monthSchema }),
  controller.listDismissedTips,
);

const byId = (handler) => [
  ...auth,
  validate({ params: objectIdParamSchema }),
  handler,
];

router.post("/tips/:id/pin", byId(controller.pinTip));
router.post("/tips/:id/unpin", byId(controller.unpinTip));
router.post("/tips/:id/dismiss", byId(controller.dismissTip));
router.post("/tips/:id/restore", byId(controller.restoreTip));

export default router;
