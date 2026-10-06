import { useCallback, useState } from "react";

/**
 * Recent searches, kept in this browser only.
 *
 * Nothing is sent to the server and nothing is logged: what somebody typed into
 * a search box is their own business, and the brief is explicit that search text
 * must not be stored server side. The key is namespaced per surface so an admin's
 * searches do not appear in the student's list on a shared device.
 */
const PREFIX = "campuscoin.searchHistory.";
const LIMIT = 5;

function read(key) {
  try {
    const raw = window.localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list
      .filter((entry) => typeof entry === "string" && entry.trim())
      .map((entry) => entry.trim())
      .slice(0, LIMIT);
  } catch {
    return [];
  }
}

function write(key, list) {
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // A full or blocked storage is not worth failing a search over.
  }
}

export function useSearchHistory(scope) {
  const key = `${PREFIX}${scope}`;
  // The scope is a prop, so it can change under the hook. React's pattern for
  // that is to adjust state during render rather than re-reading inside an
  // effect, which would mean one wasted frame showing the previous list.
  const [seenKey, setSeenKey] = useState(key);
  const [entries, setEntries] = useState(() => read(key));

  if (seenKey !== key) {
    setSeenKey(key);
    setEntries(read(key));
  }

  const remember = useCallback(
    (value) => {
      const term = String(value ?? "").trim();
      if (!term) return;
      const next = [term, ...read(key).filter((entry) => entry !== term)].slice(0, LIMIT);
      write(key, next);
      setEntries(next);
    },
    [key],
  );

  const clear = useCallback(() => {
    write(key, []);
    setEntries([]);
  }, [key]);

  return { entries, remember, clear };
}