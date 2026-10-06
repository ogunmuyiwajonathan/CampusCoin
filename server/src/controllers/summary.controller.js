import asyncHandler from "../utils/asyncHandler.js";
import { getSummary } from "../services/summary.service.js";

const me = (req) => req.user._id;

/**
 * GET /api/summary?month=YYYY-MM  — month-scoped totals plus last month.
 * GET /api/summary               — all-time totals.
 *
 * The month is optional and validated by monthSchema upstream, so a bad value
 * never reaches the aggregation.
 */
export const summary = asyncHandler(async (req, res) => {
  const month = req.validatedQuery?.month ?? null;
  res.json({ summary: await getSummary(me(req), month) });
});
