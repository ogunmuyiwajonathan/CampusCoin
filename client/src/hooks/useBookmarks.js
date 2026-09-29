import { useCallback, useEffect, useState } from "react";
import { listBookmarks, removeBookmark, saveBookmark } from "../lib/apiClient.js";

let cache = null;
let inFlight = null;

async function fetchBookmarks() {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = listBookmarks()
      .then((data) => {
        cache = data.bookmarks ?? [];
        return cache;
      })
      .catch(() => [])
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function syncBookmarks(rows) {
  cache = rows;
  return rows;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    let alive = true;
    fetchBookmarks().then((rows) => {
      if (!alive) return;
      setBookmarks(rows);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const findForMonth = useCallback(
    (month) => bookmarks.find((b) => b.month === month) ?? null,
    [bookmarks],
  );

  const toggle = useCallback(
    async (month, note) => {
      const existing = findForMonth(month);
      if (existing) {
        await removeBookmark(existing.bookmark_id);
        const next = bookmarks.filter((b) => b.bookmark_id !== existing.bookmark_id);
        cache = next;
        setBookmarks(next);
        return { saved: false };
      }
      const data = await saveBookmark({ month, note: note ?? "" });
      const next = [data.bookmark, ...bookmarks];
      cache = next;
      setBookmarks(next);
      return { saved: true, bookmark: data.bookmark };
    },
    [bookmarks, findForMonth],
  );

  return { bookmarks, loading, findForMonth, toggle };
}
