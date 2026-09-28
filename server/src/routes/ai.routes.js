import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { env } from "../config/env.js";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as ai from "../controllers/ai.controller.js";
import {
  chatSchema,
  conversationListQuerySchema,
  conversationParamsSchema,
  renameConversationSchema,
} from "../validators/ai.schema.js";

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.aiRateLimit,
  keyGenerator: (req) => req.user?._id?.toString() ?? ipKeyGenerator(req.ip),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: { message: "You have asked Rix a lot today. Try again in an hour." },
  },
});

router.post("/chat", requireAuth, validate({ body: chatSchema }), aiLimiter, ai.askAi);

router.get(
  "/conversations",
  requireAuth,
  validate({ query: conversationListQuerySchema }),
  ai.listConversations,
);

router.get(
  "/conversations/:id/messages",
  requireAuth,
  validate({ params: conversationParamsSchema }),
  ai.getConversationMessages,
);

router.patch(
  "/conversations/:id",
  requireAuth,
  validate({ params: conversationParamsSchema, body: renameConversationSchema }),
  ai.renameConversation,
);

router.delete(
  "/conversations/:id",
  requireAuth,
  validate({ params: conversationParamsSchema }),
  ai.deleteConversation,
);

router.post(
  "/messages/:id/confirm",
  requireAuth,
  validate({ params: conversationParamsSchema }),
  ai.confirmProposal,
);

router.post(
  "/messages/:id/cancel",
  requireAuth,
  validate({ params: conversationParamsSchema }),
  ai.cancelProposal,
);

export default router;
