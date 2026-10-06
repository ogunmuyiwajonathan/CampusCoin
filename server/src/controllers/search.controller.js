import asyncHandler from "../utils/asyncHandler.js";
import {
  searchAdminData,
  searchResponse,
  searchStudentData,
} from "../services/search.service.js";

/**
 * The student search reads `req.user._id` - the id in the session cookie - and
 * never the query string or the body. There is no parameter a caller can send
 * that would widen it beyond their own rows.
 */
export const search = asyncHandler(async (req, res) => {
  const q = req.validatedQuery.q;
  const groups = await searchStudentData(req.user._id, q);
  res.json(searchResponse(groups, q));
});

export const adminSearch = asyncHandler(async (req, res) => {
  const q = req.validatedQuery.q;
  const groups = await searchAdminData(q);
  res.json(searchResponse(groups, q));
});