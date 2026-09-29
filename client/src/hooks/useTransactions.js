import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from "../lib/apiClient.js";
import { currentMonthKey } from "../lib/formatMonth.js";

export function useTransactions(month = currentMonthKey()) {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState({ key: null, items: [], error: null });

  const key = `${month}:${nonce}`;

  useEffect(() => {
    let cancelled = false;
    listTransactions(month)
      .then((data) => {
        if (cancelled) return;
        setResult({ key, items: data.transactions, error: null });
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
      add,
      update,
      remove,
      refresh,
      clearError,
    }),
    [status, settled, result, add, update, remove, refresh, clearError],
  );
}
