import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  createBookmark,
  deleteBookmark,
  listBookmarks,
  updateBookmark,
} from "../services/bookmarks.service.js";

export const getBookmarks = asyncHandler(async (req, res) => {
  res.json({ bookmarks: await listBookmarks(req.user.user_id) });
});

export const postBookmark = asyncHandler(async (req, res) => {
  const { bookmark, created } = await createBookmark(req.user.user_id, req.body);
  res.status(created ? 201 : 200).json({ bookmark, created });
});

export const patchBookmark = asyncHandler(async (req, res) => {
  const bookmark = await updateBookmark(req.user.user_id, req.params.id, req.body);
  if (!bookmark) throw ApiError.notFound("That bookmark no longer exists.");
  res.json({ bookmark });
});

export const removeBookmark = asyncHandler(async (req, res) => {
  const deleted = await deleteBookmark(req.user.user_id, req.params.id);
  if (!deleted) throw ApiError.notFound("That bookmark no longer exists.");
  res.json({ deleted: true });
});
