import { useState } from "react";
import Icon from "./Icon.jsx";
import SubmitSpinner from "./SubmitSpinner.jsx";
import { useTips } from "../hooks/useTips.js";

function TipRow({ tip, pending, onPin, onUnpin, onDismiss }) {
  return (
    <li className="flex items-start gap-3 border-b border-slate-100 px-5 py-3.5 last:border-b-0">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          tip.is_pinned ? "bg-amber-100 text-amber-600" : "bg-emerald-50 text-emerald-600"
        }`}
      >
        <Icon name={tip.is_pinned ? "bookmark" : "lightbulb"} size={14} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-ink-900">{tip.text}</p>
        {tip.savings_impact > 0 && (
          <p className="mt-1 text-xs font-semibold text-ink-500">
            Worth about {tip.savings_impact}% of a spending change
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => (tip.is_pinned ? onUnpin(tip.tip_id) : onPin(tip.tip_id))}
          disabled={pending}
          aria-pressed={Boolean(tip.is_pinned)}
          aria-label={tip.is_pinned ? `Unpin tip: ${tip.text}` : `Pin tip: ${tip.text}`}
          className={`rounded-lg p-1.5 transition disabled:opacity-50 ${
            tip.is_pinned
              ? "text-amber-600 hover:bg-amber-50"
              : "text-ink-500 hover:bg-slate-50 hover:text-ink-900"
          }`}
        >
          <Icon name="bookmark" size={15} />
        </button>
        <button
          type="button"
          onClick={() => onDismiss(tip.tip_id)}
          disabled={pending}
          aria-label={`Dismiss tip: ${tip.text}`}
          className="rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-50 hover:text-ink-900 disabled:opacity-50"
        >
          <Icon name="x" size={15} />
        </button>
      </div>
    </li>
  );
}

export default function TipsPanel() {
  const tips = useTips();
  const [error, setError] = useState("");

  if (tips.status === "absent") return null;

  const run = async (id, call) => {
    setError("");
    const result = await call(id);
    if (!result.ok) setError(result.error);
  };

  const showHidden = tips.dismissed.length > 0;

  return (
    <div className="rounded-card bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-display text-base font-bold tracking-tight text-ink-900">
            Money tips
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Built from your own spending and budgets
          </p>
        </div>
        <Icon name="lightbulb" size={18} className="text-amber-500" />
      </div>

      {tips.status === "loading" && (
        <div className="space-y-3 px-5 py-4" role="status" aria-busy="true">
          <span className="sr-only">Loading tips.</span>
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-11 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      )}

      {tips.status === "error" && (
        <div className="px-5 py-4" role="alert">
          <p className="text-sm font-semibold text-red-500">{tips.error}</p>
          <button
            type="button"
            onClick={tips.refresh}
            className="mt-2 text-sm font-semibold text-emerald-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {tips.status === "ready" && tips.tips.length === 0 && tips.dismissed.length === 0 && (
        <p className="px-5 py-6 text-sm text-ink-500">
          Nothing to flag this month. Tips appear here once a category or budget is worth a
          second look.
        </p>
      )}

      {tips.status === "ready" && tips.tips.length > 0 && (
        <ul>
          {tips.tips.map((tip) => (
            <TipRow
              key={tip.tip_id}
              tip={tip}
              pending={tips.pendingId === tip.tip_id}
              onPin={(id) => run(id, tips.pin)}
              onUnpin={(id) => run(id, tips.unpin)}
              onDismiss={(id) => run(id, tips.dismiss)}
            />
          ))}
        </ul>
      )}

      {showHidden && tips.status === "ready" && (
        <div className="border-t border-slate-100 px-5 py-3.5">
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-ink-500">
              {tips.dismissed.length} dismissed {tips.dismissed.length === 1 ? "tip" : "tips"}
            </summary>
            <ul className="mt-2 space-y-1">
              {tips.dismissed.map((tip) => (
                <li
                  key={tip.tip_id}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <p className="min-w-0 flex-1 truncate text-sm text-ink-500">{tip.text}</p>
                  <button
                    type="button"
                    onClick={() => run(tip.tip_id, tips.restore)}
                    disabled={Boolean(tips.pendingId)}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                  >
                    {tips.pendingId === tip.tip_id ? <SubmitSpinner /> : null}
                    Bring back
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {error && (
        <p className="border-t border-slate-100 px-5 py-3 text-sm font-semibold text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
