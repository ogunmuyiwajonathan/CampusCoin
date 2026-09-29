import asyncHandler from "../utils/asyncHandler.js";
import * as service from "../services/categorise.service.js";

const me = (req) => req.user._id;

export const suggestCategory = asyncHandler(async (req, res) => {
  const result = await service.suggestCategory(me(req), req.validatedQuery.q);
  res.json({
    suggestion: {
      category_id: String(result.category._id),
      category_name: result.category.name,
      type: result.category.type,
      source: result.source,
      confidence: Math.round(result.confidence * 100) / 100,
      matched: result.matched,
    },
  });
});

export const confirmSuggestion = asyncHandler(async (req, res) => {
  const result = await service.recordSuggestion(
    me(req),
    req.body.description,
    req.body.category_id,
  );
  res.status(201).json({ ok: true, learned: result.learned });
});

export const suggestBatch = asyncHandler(async (req, res) => {
  res.json({ suggestions: await service.suggestBatch(me(req), req.body.rows) });
});
