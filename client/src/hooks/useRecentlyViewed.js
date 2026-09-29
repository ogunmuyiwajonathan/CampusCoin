import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "campuscoin.recentlyViewed";
const LIMIT = 5;

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
  }
  listeners.forEach((listener) => listener(next));
}

export function useRecentlyViewed() {
  const [items, setItems] = useState(snapshot);

  useEffect(() => {
    listeners.add(setItems);
    return () => listeners.delete(setItems);
  }, []);

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
