import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";
import { searchLimiter } from "../middleware/rateLimiters.js";
import { searchQuerySchema } from "../validators/search.schema.js";
import * as searchCtrl from "../controllers/search.controller.js";

const router = Router();

router.get(
  "/search",
  requireAuth,
  searchLimiter,
  validate({ query: searchQuerySchema }),
  searchCtrl.search,
);

// requireAuth then requireAdmin: a signed-in student gets 403, not 401, and an
// anonymous caller gets 401. Nothing below here reads a student's money.
router.get(
  "/admin/search",
  requireAuth,
  requireAdmin,
  searchLimiter,
  validate({ query: searchQuerySchema }),
  searchCtrl.adminSearch,
);

export default router;