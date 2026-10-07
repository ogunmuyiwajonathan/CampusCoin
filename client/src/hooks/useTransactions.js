import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from "../lib/apiClient.js";
import { currentMonthKey } from "../lib/formatMonth.js";

/**
 * `month` of null means every month, which is paged server-side. Pass `page`
 * to walk it; the response's `total` drives the pager. A month-scoped call is
 * returned whole by the server, so `paged` comes back false.
 */
export function useTransactions(month = currentMonthKey(), { page, limit } = {}) {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState({ key: null, items: [], error: null });

  const key = `${month ?? "all"}:${page ?? 1}:${limit ?? ""}:${nonce}`;

  useEffect(() => {
    let cancelled = false;
    listTransactions(month, { page, limit })
      .then((data) => {
        if (cancelled) return;
        setResult({
          key,
          items: data.transactions,
          error: null,
          total: data.total ?? data.transactions.length,
          paged: Boolean(data.paged),
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setResult({ key, items: [], error: error.message, total: 0, paged: false });
      });
    return () => {
      cancelled = true;
    };
  }, [month, page, limit, nonce, key]);

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

  const add = useCallback((payload) => run(() => createTransaction(payload)), [run]);
  const update = useCallback((id, payload) => run(() => updateTransaction(id, payload)), [run]);
  const remove = useCallback((id) => run(() => deleteTransaction(id)), [run]);
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
      total: settled ? (result.total ?? 0) : 0,
      paged: settled ? Boolean(result.paged) : false,
      add,
      update,
      remove,
      refresh,
      clearError,
    }),
    [status, settled, result, add, update, remove, refresh, clearError],
  );
}
