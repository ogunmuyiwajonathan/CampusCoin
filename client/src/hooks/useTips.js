import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/apiClient.js";
import { currentMonthKey } from "../lib/formatMonth.js";

// The tips engine ships as its own stage of work, so this hook treats a route
// that does not exist as "not there yet" instead of as a failure: the card on
// the dashboard stays out of the way rather than showing an error the student
// cannot fix. Every other answer - a real tip list, an empty one, a server
// fault - is reported so the card can render its own state. The month is part
// of the contract: tips are generated per month, so the current one is asked
// for by name.
export function useTips() {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState({
    key: null,
    tips: [],
    dismissed: [],
    error: null,
    absent: false,
  });
  const [pendingId, setPendingId] = useState(null);

  const key = String(nonce);

  useEffect(() => {
    let cancelled = false;
    const month = currentMonthKey();
    Promise.all([
      apiFetch(`/tips?month=${month}`),
      apiFetch(`/tips/dismissed?month=${month}`).catch(() => ({ tips: [] })),
    ])
      .then(([live, hidden]) => {
        if (cancelled) return;
        setResult({
          key,
          tips: live?.tips ?? [],
          dismissed: hidden?.tips ?? [],
          error: null,
          absent: false,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        const absent = error.status === 404 || error.status === 405;
        setResult({ key, tips: [], dismissed: [], error: absent ? null : error.message, absent });
      });
    return () => {
      cancelled = true;
    };
  }, [nonce, key]);

  const settled = result.key === key;
  const status = result.absent
    ? "absent"
    : settled
      ? result.error
        ? "error"
        : "ready"
      : "loading";

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  // Every write goes through here: the server is the only copy of whether a tip
  // is pinned, so the row is re-read rather than patched locally. Optimistic
  // local state would be a second answer to the same question, and the two drift
  // the moment a request fails.
  const act = useCallback(
    async (id, call) => {
      if (pendingId) return { ok: false, error: "One change at a time." };
      setPendingId(id);
      try {
        await call(id);
        setNonce((value) => value + 1);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error.message || "That did not work." };
      } finally {
        setPendingId(null);
      }
    },
    [pendingId],
  );

  const pin = useCallback((id) => act(id, (tipId) => pinTip(tipId)), [act]);
  const unpin = useCallback((id) => act(id, (tipId) => unpinTip(tipId)), [act]);
  const dismiss = useCallback((id) => act(id, (tipId) => dismissTip(tipId)), [act]);
  const restore = useCallback((id) => act(id, (tipId) => restoreTip(tipId)), [act]);

  return useMemo(
    () => ({
      status,
      tips: settled && !result.absent ? result.tips : [],
      dismissed: settled && !result.absent ? result.dismissed : [],
      error: result.error,
      pendingId,
      refresh,
      pin,
      unpin,
      dismiss,
      restore,
    }),
    [status, settled, result, pendingId, refresh, pin, unpin, dismiss, restore],
  );
}
