import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { env } from "../config/env.js";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as ai from "../controllers/ai.controller.js";
import { askAiSchema } from "../validators/ai.schema.js";

const router = Router();

// Every assistant answer costs money, so this is a spending limit rather than an
// abuse limit: 20 questions an hour per account. Keyed on the session's user id,
// with the IP as the fallback, so an unauthenticated caller cannot spend a
// student's quota. The IP goes through ipKeyGenerator because a raw IPv6 address
// is a whole /64, which one client can rotate through freely; the helper buckets
// it so the limit cannot be walked around. The test run raises the ceiling so the
// suite's own calls do not throttle each other.
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.nodeEnv === "test" ? 1000 : 20,
  keyGenerator: (req) => req.user?._id?.toString() ?? ipKeyGenerator(req.ip),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: { message: "You have asked Rix a lot today. Try again in an hour." },
  },
});

router.post("/chat", requireAuth, validate({ body: askAiSchema }), aiLimiter, ai.askAi);

export default router;
