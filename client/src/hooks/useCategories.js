import { useEffect, useState } from "react";
import { listCategories } from "../lib/apiClient.js";
import { allCategories, applyCategories, resetCategories } from "../data/mockData.js";
import { useAuth } from "./useAuth.js";

// One request per signed-in user, shared by every mount in the app. The entry
// records who it is for, so a reply that lands after a logout or an account
// switch is recognisable as stale and is dropped instead of being pushed into
// the registry. Cleared on failure so the next auth change or remount retries.
let pending = null;

// Everyone holding a category list hears about a change to it, so adding a
// category in one place does not leave the next dropdown showing the old list.
const listeners = new Set();

export function invalidateCategories() {
  pending = null;
  for (const notify of [...listeners]) notify();
}

function loadFor(userId) {
  if (pending && pending.userId === userId) return pending.promise;

  const entry = { userId, promise: null };
  entry.promise = listCategories().then(
    (data) => {
      // A newer request, or a signed-out session, has taken over since this
      // went out. Publishing now would put one account's categories under
      // another, so hand back null and let the caller ignore it.
      if (pending !== entry) return null;
      const list = data.categories ?? [];
      applyCategories(list);
      return list;
    },
    (error) => {
      if (pending === entry) pending = null;
      throw error;
    },
  );
  pending = entry;
  return entry.promise;
}

export function useCategories() {
  const { user, status: authStatus } = useAuth();
  const userId = user?.user_id ?? null;

  // Tagged with the user it belongs to, so an entry left over from the previous
  // account is never read as this account's data.
  const [loaded, setLoaded] = useState({ userId: null, list: null, status: "idle" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const notify = () => setReloadKey((value) => value + 1);
    listeners.add(notify);
    return () => listeners.delete(notify);
  }, []);

  useEffect(() => {
    // The server has not said who this is yet. Guessing here is what fired a
    // request for a visitor who had no session and collected a 401.
    if (authStatus !== "ready") return;

    if (!userId) {
      // Signed out. Drop the cache and put the seed back, so the previous
      // account's own categories do not linger behind a public page.
      pending = null;
      resetCategories();
      return;
    }

    let active = true;
    loadFor(userId).then(
      (list) => {
        if (!active || !list) return;
        setLoaded({ userId, list, status: "ready" });
      },
      () => {
        // The seed stays in the registry so the pages still render, and the
        // cache was cleared in loadFor so the next attempt retries.
        if (active) setLoaded({ userId, list: null, status: "error" });
      },
    );
    return () => {
      active = false;
    };
  }, [authStatus, userId, reloadKey]);

  const mine = loaded.userId === userId ? loaded : null;

  // Derived from what is in hand rather than stored separately, so status can
  // never claim "ready" before the matching categories have actually arrived.
  let status = "idle";
  if (authStatus !== "ready") status = "loading";
  else if (userId) status = mine?.status ?? "loading";

  return { categories: mine?.list ?? allCategories(), status };
}
