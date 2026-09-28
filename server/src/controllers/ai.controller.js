import asyncHandler from "../utils/asyncHandler.js";
import * as ai from "../services/ai.service.js";

// req.user._id, the ObjectId, not the snake_case string virtual: an aggregation
// $match does not cast, so the string would match nothing and every figure Rix
// quoted would come back as zero.
const me = (req) => req.user._id;

export const askAi = asyncHandler(async (req, res) => {
  const answer = await ai.answerQuestion(me(req), req.body.question);
  res.json(answer);
});
