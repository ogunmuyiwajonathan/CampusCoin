import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "campuscoin.recentlyViewed";
const LIMIT = 5;

// The list lives in one module-level store so the page that records an entry
// (the transaction form) and the page that reads them back (the dashboard) see
// the same list without a context provider sitting above the router.
let cached = null;
const listeners = new Set();

function read() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function snapshot() {
  if (cached === null) cached = read();
  return cached;
}

function commit(next) {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // A full or blocked storage only costs the memory copy for this visit.
  }
  listeners.forEach((listener) => listener(next));
}

export function useRecentlyViewed() {
  const [items, setItems] = useState(snapshot);

  useEffect(() => {
    listeners.add(setItems);
    return () => listeners.delete(setItems);
  }, []);

  // Re-opening the same entry moves it to the front instead of listing it
  // twice, and the list never grows past the last five.
  const record = useCallback((entry) => {
    if (!entry?.transaction_id) return;
    const next = [
      entry,
      ...snapshot().filter((row) => row.transaction_id !== entry.transaction_id),
    ].slice(0, LIMIT);
    commit(next);
  }, []);

  return { items, record };
}
