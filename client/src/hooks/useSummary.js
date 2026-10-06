import { useCallback, useEffect, useState } from "react";
import { getSummary } from "../lib/apiClient.js";
import { currentMonthKey } from "../lib/formatMonth.js";

/**
 * Loads the server-computed month summary. Pass `null` for the all-time view.
 * Totals never come from the transaction list, so they stay correct once that
 * list is paginated.
 */
export function useSummary(month = currentMonthKey()) {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });

  const key = `${month ?? "all"}:${nonce}`;

  useEffect(() => {
    let cancelled = false;
    getSummary(month)
      .then((data) => {
        if (cancelled) return;
        setResult({ key, data: data.summary, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        setResult({ key, data: null, error: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [month, nonce, key]);

  const settled = result.key === key;
  const status = settled ? (result.error ? "error" : "ready") : "loading";

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  return { status, summary: result.data, error: result.error, refresh };
}
