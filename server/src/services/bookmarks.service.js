import { Bookmark, Insight, Tip } from "../models/index.js";
import { serializeAll } from "../utils/idOptions.js";

// A student saves a month, an insight or a tip with an optional note. Exactly
// one target is set, which the route validates, and every read is scoped to the
// session's user so one student can never see another's saved notes.
export async function listBookmarks(userId) {
  const rows = await Bookmark.find({ user_id: userId }).sort({ createdAt: -1 }).lean();

  // The saved insight and tip text is resolved up front so the list renders in
  // one pass rather than asking for each card as it scrolls into view.
  const insightIds = rows.map((r) => r.insight_id).filter(Boolean);
  const tipIds = rows.map((r) => r.tip_id).filter(Boolean);
  const [insights, tips] = await Promise.all([
    Insight.find({ _id: { $in: insightIds } }).select("month summary_text").lean(),
    Tip.find({ _id: { $in: tipIds } }).select("text savings_impact").lean(),
  ]);
  const insightById = new Map(insights.map((i) => [String(i._id), i]));
  const tipById = new Map(tips.map((t) => [String(t._id), t]));

  return serializeAll(
    rows.map((row) => ({
      ...row,
      insight_text: row.insight_id ? insightById.get(String(row.insight_id))?.summary_text ?? null : null,
      tip_text: row.tip_id ? tipById.get(String(row.tip_id))?.text ?? null : null,
    })),
    "bookmark_id",
  );
}

export async function createBookmark(userId, body) {
  // One save per month per student: the bookmark button is a toggle, and a
  // double click must not leave two rows behind.
  const existing = body.month
    ? await Bookmark.findOne({ user_id: userId, month: body.month })
    : null;

  if (existing) {
    // Returned as a document rather than through serialize(): a document keeps
    // its fields in _doc and only its toJSON exposes them. serialize() is for
    // lean rows.
    const updated = await Bookmark.findByIdAndUpdate(
      existing._id,
      { $set: { note: body.note ?? existing.note } },
      { new: true, runValidators: true },
    );
    return { bookmark: updated, created: false };
  }

  const row = await Bookmark.create({
    user_id: userId,
    month: body.month ?? null,
    insight_id: body.insight_id ?? null,
    tip_id: body.tip_id ?? null,
    note: body.note ?? "",
  });
  return { bookmark: row, created: true };
}

export async function updateBookmark(userId, id, body) {
  return Bookmark.findOneAndUpdate(
    { _id: id, user_id: userId },
    { $set: { note: body.note, ...(body.month ? { month: body.month } : {}) } },
    { new: true, runValidators: true },
  );
}

export async function deleteBookmark(userId, id) {
  const result = await Bookmark.deleteOne({ _id: id, user_id: userId });
  return result.deletedCount === 1;
}
