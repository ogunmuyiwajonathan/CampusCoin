import { useEffect, useState } from "react";
import { listCategories } from "../lib/apiClient.js";
import { allCategories, applyCategories, resetCategories } from "../data/mockData.js";
import { useAuth } from "./useAuth.js";

let pending = null;

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

  const [loaded, setLoaded] = useState({ userId: null, list: null, status: "idle" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const notify = () => setReloadKey((value) => value + 1);
    listeners.add(notify);
    return () => listeners.delete(notify);
  }, []);

  useEffect(() => {
    if (authStatus !== "ready") return;

    if (!userId) {
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
        if (active) setLoaded({ userId, list: null, status: "error" });
      },
    );
    return () => {
      active = false;
    };
  }, [authStatus, userId, reloadKey]);

  const mine = loaded.userId === userId ? loaded : null;

  let status = "idle";
  if (authStatus !== "ready") status = "loading";
  else if (userId) status = mine?.status ?? "loading";

  return { categories: mine?.list ?? allCategories(), status };
}
