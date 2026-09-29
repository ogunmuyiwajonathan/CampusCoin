import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { env } from "../config/env.js";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as ai from "../controllers/ai.controller.js";
import * as categorise from "../controllers/categorise.controller.js";
import {
  batchSuggestSchema,
  chatSchema,
  confirmSuggestionSchema,
  conversationListQuerySchema,
  conversationParamsSchema,
  renameConversationSchema,
  suggestSchema,
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

// Typing hints are frequent and cheap, so they carry their own generous budget
// rather than the hourly AI one: being throttled mid-sentence is a worse outcome
// than the provider call ever was.
const suggestLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.user?._id?.toString() ?? ipKeyGenerator(req.ip),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: { message: "Too many suggestions at once. Give it a second." },
  },
});

router.get(
  "/categorise/suggest",
  requireAuth,
  validate({ query: suggestSchema }),
  suggestLimiter,
  categorise.suggestCategory,
);

router.post(
  "/categorise/confirm",
  requireAuth,
  validate({ body: confirmSuggestionSchema }),
  categorise.confirmSuggestion,
);

router.post(
  "/categorise/batch",
  requireAuth,
  validate({ body: batchSuggestSchema }),
  suggestLimiter,
  categorise.suggestBatch,
);

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
