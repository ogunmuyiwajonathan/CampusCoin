/**
 * The admin user search is passed straight into a MongoDB `$regex`. Unescaped
 * input such as "(" is not a valid pattern and makes the query throw (a 500),
 * and ".*" quietly turns a search into "return every row". Both are fixed by
 * escaping the metacharacters: the search still matches literally, and an
 * attacker cannot use it to change what the query means.
 */
export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Long patterns cost the database time without helping anybody find a user. */
export const MAX_SEARCH_LENGTH = 100;

export function normaliseSearch(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.slice(0, MAX_SEARCH_LENGTH);
}
