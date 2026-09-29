import asyncHandler from "../utils/asyncHandler.js";
import * as insights from "../services/insights.service.js";
import * as tips from "../services/tips.service.js";
import ApiError from "../utils/ApiError.js";

const me = (req) => req.user._id;

export const listInsights = asyncHandler(async (req, res) => {
  res.json({ insights: await insights.listInsights(me(req)) });
});

export const getInsight = asyncHandler(async (req, res) => {
  const month = req.validatedQuery?.month;
  if (!month) throw ApiError.badRequest("Ask for a month like 2026-09.");
  res.json({ insight: await insights.getOrGenerateInsight(me(req), month) });
});

export const regenerateInsight = asyncHandler(async (req, res) => {
  const month = req.validatedQuery?.month;
  if (!month) throw ApiError.badRequest("Ask for a month like 2026-09.");
  await insights.regenerateInsight(me(req), month);
  res.json({ insight: await insights.getOrGenerateInsight(me(req), month) });
});

export const listTips = asyncHandler(async (req, res) => {
  const month = req.validatedQuery?.month;
  if (!month) throw ApiError.badRequest("Ask for a month like 2026-09.");
  res.json({ tips: await tips.listTips(me(req), month) });
});

export const listDismissedTips = asyncHandler(async (req, res) => {
  const month = req.validatedQuery?.month;
  if (!month) throw ApiError.badRequest("Ask for a month like 2026-09.");
  res.json({ tips: await tips.listDismissedTips(me(req), month) });
});

export const pinTip = asyncHandler(async (req, res) => {
  const tip = await tips.setTipPinned(me(req), req.params.id, true);
  if (!tip) throw ApiError.notFound("That tip was not found.");
  res.json({ tip });
});

export const unpinTip = asyncHandler(async (req, res) => {
  const tip = await tips.setTipPinned(me(req), req.params.id, false);
  if (!tip) throw ApiError.notFound("That tip was not found.");
  res.json({ tip });
});

export const dismissTip = asyncHandler(async (req, res) => {
  const tip = await tips.dismissTip(me(req), req.params.id);
  if (!tip) throw ApiError.notFound("That tip was not found.");
  res.json({ tip });
});

export const restoreTip = asyncHandler(async (req, res) => {
  const tip = await tips.restoreTip(me(req), req.params.id);
  if (!tip) throw ApiError.notFound("That tip was not found.");
  res.json({ tip });
});
