import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import SubmitSpinner from "./SubmitSpinner.jsx";
import { listTransactionHistory, restoreTransaction } from "../lib/apiClient.js";
import { formatCurrency } from "../lib/formatCurrency.js";
import { formatDate } from "../lib/formatMonth.js";

function deletedAt(value) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function DeletedTransactionsDialog({ onClose, onRestored }) {
  const [status, setStatus] = useState("loading");
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [restoringId, setRestoringId] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setStatus("loading");
    setError("");
    try {
      const data = await listTransactionHistory();
      setItems(data.history);
      setStatus("ready");
    } catch (err) {
      setError(err.message || "Couldn't load your deleted transactions.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listTransactionHistory()
      .then((data) => {
        if (cancelled) return;
        setItems(data.history);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Couldn't load your deleted transactions.");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !restoringId) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, restoringId]);

  const restore = async (historyId) => {
    if (restoringId) return;
    setRestoringId(historyId);
    setError("");
    try {
      await restoreTransaction(historyId);
      await load(false);
      onRestored?.();
    } catch (err) {
      setError(err.message || "Couldn't restore that transaction.");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Deleted transactions"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={restoringId ? undefined : onClose}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[90svh] w-full max-w-lg flex-col overflow-hidden rounded-card bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">
              Recently Deleted
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Deleting a transaction keeps it here, so you can put it back.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(restoringId)}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-50 hover:text-ink-900 disabled:opacity-50"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {status === "loading" ? (
            <div className="space-y-3 px-6 py-5" role="status" aria-busy="true">
              <span className="sr-only">Loading deleted transactions.</span>
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-ink-500">
                <Icon name="history" size={24} />
              </span>
              <div>
                <p className="font-display text-base font-bold text-ink-900">
                  Nothing deleted
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  Transactions you delete will show up here for a while.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => {
                const snapshot = item.transaction ?? {};
                const isIncome = snapshot.type === "income";
                return (
                  <li
                    key={item.history_id}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: item.category?.color ?? "#64748b" }}
                    >
                      <Icon name="trash-2" size={15} className="text-white" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {snapshot.description || item.category?.name || "Transaction"}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {formatDate(snapshot.date)} ·{" "}
                        {isIncome ? "Income" : "Expense"} · deleted {deletedAt(item.deleted_at)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-bold tabular-nums ${
                        isIncome ? "text-emerald-600" : "text-ink-900"
                      }`}
                    >
                      {formatCurrency(snapshot.amount ?? 0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => restore(item.history_id)}
                      disabled={Boolean(restoringId)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink-500 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {restoringId === item.history_id ? (
                        <SubmitSpinner />
                      ) : (
                        <Icon name="undo" size={13} />
                      )}
                      {restoringId === item.history_id ? "Restoring" : "Restore"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <p
            className="border-t border-slate-100 px-6 py-3 text-sm font-semibold text-red-500"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(restoringId)}
            className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
