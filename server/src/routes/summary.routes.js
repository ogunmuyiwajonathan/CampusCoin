import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { summary } from "../controllers/summary.controller.js";
import { monthSchema } from "../validators/ledger.schema.js";

const router = Router();

router.get("/summary", requireAuth, validate({ query: monthSchema }), summary);

export default router;
