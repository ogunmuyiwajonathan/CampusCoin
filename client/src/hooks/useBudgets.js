import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createBudget,
  deleteBudget,
  listBudgets,
  updateBudget,
} from "../lib/apiClient.js";
import { currentMonthKey } from "../lib/formatMonth.js";

// Spent, percentage and the near/over band are all computed by the server from
// the same aggregation the budgets page used to run by hand in the browser, so
// the numbers on screen are the database's numbers.
export function useBudgets(month = currentMonthKey()) {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState({ key: null, items: [], error: null });

  // Same request-tagging as useTransactions: the answer carries the key it
  // answers, and anything else counts as still loading.
  const key = `${month}:${nonce}`;

  useEffect(() => {
    let cancelled = false;
    listBudgets(month)
      .then((data) => {
        if (cancelled) return;
        setResult({ key, items: data.budgets, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        setResult({ key, items: [], error: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [month, nonce, key]);

  const settled = result.key === key;
  const status = settled ? (result.error ? "error" : "ready") : "loading";

  const run = useCallback(async (action) => {
    try {
      await action();
      setNonce((value) => value + 1);
      return { ok: true };
    } catch (error) {
      setResult((prev) => ({ ...prev, error: error.message }));
      return { ok: false, error: error.message };
    }
  }, []);

  const add = useCallback((payload) => run(() => createBudget(payload)), [run]);
  const update = useCallback((id, payload) => run(() => updateBudget(id, payload)), [run]);
  const remove = useCallback((id) => run(() => deleteBudget(id)), [run]);
  const refresh = useCallback(() => setNonce((value) => value + 1), []);
  const clearError = useCallback(
    () => setResult((prev) => ({ ...prev, error: null })),
    [],
  );

  return useMemo(
    () => ({
      status,
      items: settled ? result.items : [],
      error: result.error,
      add,
      update,
      remove,
      refresh,
      clearError,
    }),
    [status, settled, result, add, update, remove, refresh, clearError],
  );
}
