import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "../../components/Icon.jsx";
import SubmitSpinner from "../../components/SubmitSpinner.jsx";
import { useSubmitLock } from "../../hooks/useSubmitLock.js";

const FALLBACK_RULES = [
  {
    rule: "category_share_above",
    label: "A category is too big a share of spending",
    description: "Fires when one category is more than the threshold percent of the month's spending.",
    uses_threshold: true,
    threshold_label: "Share of spending (%)",
    placeholders: ["category", "percentage", "weekly"],
  },
  {
    rule: "budget_near_limit",
    label: "A budget is close to its limit",
    description: "Fires when spending on a category has reached the threshold percent of its budget.",
    uses_threshold: true,
    threshold_label: "Percent of budget used",
    placeholders: ["category", "percentage", "remaining"],
  },
  {
    rule: "no_transactions",
    label: "The student has logged nothing yet",
    description: "Fires only when the month has no transactions at all.",
    uses_threshold: false,
    threshold_label: null,
    placeholders: [],
  },
];

const SAMPLE_VALUES = {
  category: "Food",
  percentage: "42",
  weekly: "N5,000",
  remaining: "N3,200",
};

const NO_PLACEHOLDERS = [];

function renderPreview(text, placeholders) {
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    placeholders.includes(name) && SAMPLE_VALUES[name] ? SAMPLE_VALUES[name] : match,
  );
}

function unusedPlaceholders(text, placeholders) {
  const found = [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
  return [...new Set(found)].filter((name) => !placeholders.includes(name));
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function messageFrom(res, fallback) {
  const payload = res?.error?.message;
  if (typeof payload === "string" && payload) return payload;
  return fallback;
}

function TipModal({ tip, rules, onClose, onSaved }) {
  const [key, setKey] = useState(tip?.key ?? "");
  const [text, setText] = useState(tip?.text ?? "");
  const [rule, setRule] = useState(tip?.rule ?? rules[0]?.rule ?? "");
  const [threshold, setThreshold] = useState(tip?.threshold ?? "");
  const [savingsImpact, setSavingsImpact] = useState(tip?.savings_impact ?? "");
  const [isActive, setIsActive] = useState(tip?.is_active ?? true);
  const [error, setError] = useState("");
  const { locked: saving, done, run, minWidth, measure } = useSubmitLock();

  const active = useMemo(
    () => rules.find((entry) => entry.rule === rule) ?? rules[0],
    [rule, rules],
  );
  const placeholders = active?.placeholders ?? NO_PLACEHOLDERS;
  const stray = useMemo(() => unusedPlaceholders(text, placeholders), [text, placeholders]);
  const needsThreshold =
    active?.uses_threshold === true && threshold !== "" && Number(threshold) < 0;

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError("");

    if (!key.trim()) {
      setError("Give the tip a key so it can be found again.");
      return;
    }
    if (stray.length) {
      setError(
        `This rule does not fill in ${stray.map((name) => `{${name}}`).join(", ")}. The words would reach a student unfinished.`,
      );
      return;
    }
    if (needsThreshold) {
      setError("The threshold cannot be below zero.");
      return;
    }

    const body = {
      key: key.trim(),
      text: text.trim(),
      rule,
      is_active: isActive,
      savings_impact: savingsImpact === "" ? 0 : Number(savingsImpact),
    };
    if (active?.uses_threshold) body.threshold = threshold === "" ? null : Number(threshold);

    try {
      await run(async () => {
        const res = await fetch(tip ? `/api/admin/tips/${tip.id}` : "/api/admin/tips", {
          method: tip ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(messageFrom(await readJson(res), "That tip could not be saved."));
      }, { oneShot: true });
      onSaved();
    } catch (err) {
      setError(err.message || "That tip could not be saved.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={tip ? "Edit tip template" : "New tip template"}
    >
      <div className="max-h-[90svh] w-full max-w-xl overflow-y-auto rounded-card bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold tracking-tight text-ink-900">
            {tip ? "Edit tip" : "New tip"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-50 hover:text-ink-900 disabled:opacity-50"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="tip-key" className="mb-1.5 block text-sm font-semibold text-ink-900">
              Key
            </label>
            <input
              id="tip-key"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              required
              disabled={Boolean(tip)}
              placeholder="top_category_share"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-ink-500"
            />
            <p className="mt-1 text-xs text-ink-500">
              Lowercase letters, numbers and underscores. Set once and never changed.
            </p>
          </div>

          <div>
            <label htmlFor="tip-rule" className="mb-1.5 block text-sm font-semibold text-ink-900">
              When to show it
            </label>
            <select
              id="tip-rule"
              value={rule}
              onChange={(event) => setRule(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {rules.map((entry) => (
                <option key={entry.rule} value={entry.rule}>
                  {entry.label}
                </option>
              ))}
            </select>
            {active?.description && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-500">
                <Icon name="info" size={13} className="mt-0.5 shrink-0" />
                {active.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {active?.uses_threshold && (
              <div>
                <label
                  htmlFor="tip-threshold"
                  className="mb-1.5 block text-sm font-semibold text-ink-900"
                >
                  {active.threshold_label}
                </label>
                <input
                  id="tip-threshold"
                  type="number"
                  min="0"
                  max="100"
                  value={threshold}
                  onChange={(event) => setThreshold(event.target.value)}
                  placeholder={active.rule === "budget_near_limit" ? "95" : "30"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            )}
            <div className={active?.uses_threshold ? "" : "sm:col-span-2"}>
              <label
                htmlFor="tip-impact"
                className="mb-1.5 block text-sm font-semibold text-ink-900"
              >
                Priority
              </label>
              <input
                id="tip-impact"
                type="number"
                min="0"
                max="100"
                value={savingsImpact}
                onChange={(event) => setSavingsImpact(event.target.value)}
                placeholder="90"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="mt-1 text-xs text-ink-500">
                Higher shows first. The most valuable tip a student can act on is 100.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="tip-text" className="mb-1.5 block text-sm font-semibold text-ink-900">
              What the student reads
            </label>
            <textarea
              id="tip-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              required
              rows={3}
              placeholder="Food is your biggest expense at 42% of spending."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />

            {placeholders.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-ink-500">Tap to insert:</span>
                {placeholders.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setText((current) => `${current}{${name}}`)}
                    className="rounded-full bg-mint-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-700 transition hover:bg-emerald-100"
                  >
                    {`{${name}}`}
                  </button>
                ))}
              </div>
            )}

            {text.trim() && (
              <div className="mt-2 rounded-lg border border-emerald-100 bg-mint-50 p-3">
                <p className="text-xs font-semibold text-ink-500">A student would read</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-900">
                  {renderPreview(text.trim(), placeholders) || "Nothing yet."}
                </p>
                {stray.length > 0 && (
                  <p className="mt-1.5 text-xs font-semibold text-red-500" role="alert">
                    {stray.map((name) => `{${name}}`)} is not filled in by this rule and would reach
                    the student as written.
                  </p>
                )}
              </div>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-900">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            Show this tip to students
          </label>

          {error && (
            <p className="text-sm font-semibold text-red-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              ref={measure}
              disabled={saving || !key.trim() || !text.trim()}
              aria-busy={saving}
              style={minWidth ? { minWidth } : undefined}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <SubmitSpinner className="h-3.5 w-3.5" />}
              {saving ? "Saving..." : done ? "Saved" : "Save tip"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-ink-500 transition hover:bg-mint-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Tips() {
  const [tips, setTips] = useState([]);
  const [rules, setRules] = useState(FALLBACK_RULES);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [modal, setModal] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [notice, setNotice] = useState("");
  const loadLock = useRef(false);

  const load = useCallback(async () => {
    if (loadLock.current) return;
    loadLock.current = true;
    try {
      const [tipsRes, rulesRes] = await Promise.all([
        fetch("/api/admin/tips"),
        fetch("/api/admin/tip-rules"),
      ]);
      const tipsBody = await readJson(tipsRes);
      if (!tipsRes.ok) throw new Error(messageFrom(tipsBody, "The tip list could not be loaded."));
      setTips(Array.isArray(tipsBody) ? tipsBody : (tipsBody?.tips ?? []));
      if (rulesRes.ok) {
        const rulesBody = await readJson(rulesRes);
        if (Array.isArray(rulesBody?.rules) && rulesBody.rules.length) {
          setRules(rulesBody.rules);
        }
      }
    } finally {
      loadLock.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLock.current = true;
    Promise.all([fetch("/api/admin/tips"), fetch("/api/admin/tip-rules")])
      .then(async ([tipsRes, rulesRes]) => {
        if (cancelled) return;
        const tipsBody = await readJson(tipsRes);
        if (!tipsRes.ok) throw new Error(messageFrom(tipsBody, "The tip list could not be loaded."));
        const rows = Array.isArray(tipsBody) ? tipsBody : (tipsBody?.tips ?? []);
        const rulesBody = rulesRes.ok ? await readJson(rulesRes) : null;
        setTips(rows);
        if (Array.isArray(rulesBody?.rules) && rulesBody.rules.length) {
          setRules(rulesBody.rules);
        }
        setError("");
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "The tip list could not be loaded.");
        setStatus("error");
      })
      .finally(() => {
        loadLock.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const act = async (id, run) => {
    if (pendingId) return;
    setPendingId(id);
    setActionError("");
    setNotice("");
    try {
      const message = await run(id);
      await load();
      setNotice(message ?? "");
    } catch (err) {
      setActionError(err.message || "That did not work. Try again.");
    } finally {
      setPendingId(null);
    }
  };

  const toggleActive = (tip) =>
    act(tip.id, async (id) => {
      const res = await fetch(`/api/admin/tips/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !tip.is_active }),
      });
      if (!res.ok) throw new Error(messageFrom(await readJson(res), "That tip could not be changed."));
      return tip.is_active
        ? `"${tip.key}" is hidden from students.`
        : `"${tip.key}" is now shown to students.`;
    });

  const handleDelete = (tip) => {
    if (!window.confirm(`Delete "${tip.key}"? Students stop seeing it immediately.`)) return;
    act(tip.id, async (id) => {
      const res = await fetch(`/api/admin/tips/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(messageFrom(await readJson(res), "That tip could not be deleted."));
      return `"${tip.key}" was deleted.`;
    });
  };

  if (status === "loading") {
    return (
      <div className="space-y-4" role="status" aria-busy="true">
        <span className="sr-only">Loading tip templates.</span>
        <div className="h-10 w-64 animate-pulse rounded-card bg-surface shadow-card" />
        <div className="h-72 w-full animate-pulse rounded-card bg-surface shadow-card" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="rounded-card border border-red-200 bg-red-50 p-6 text-center text-red-900"
        role="alert"
      >
        <Icon name="triangle-alert" size={32} className="mx-auto mb-2 text-red-500" />
        <p className="font-semibold">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 rounded-lg bg-red-100 px-4 py-2 font-medium text-red-900 hover:bg-red-200"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Tip Templates
          </h1>
          <p className="text-sm text-ink-500">
            {tips.length} {tips.length === 1 ? "template" : "templates"} ·{" "}
            {rules.length} {rules.length === 1 ? "rule" : "rules"} the engine can run
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ tip: null })}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          <Icon name="plus" size={16} /> New Tip
        </button>
      </div>

      {notice && (
        <p
          className="rounded-lg border border-emerald-100 bg-mint-50 px-4 py-3 text-sm text-emerald-700"
          role="status"
        >
          {notice}
        </p>
      )}
      {actionError && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
          role="alert"
        >
          {actionError}
        </p>
      )}

      {tips.length === 0 ? (
        <div className="rounded-card border border-dashed border-slate-200 bg-surface p-12 text-center">
          <Icon name="lightbulb" size={32} className="mx-auto mb-3 text-ink-500" />
          <p className="font-medium text-ink-900">No tip templates yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
            Add one and it starts reaching students on their next dashboard load.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {tips.map((tip) => {
            const known = rules.find((entry) => entry.rule === tip.rule);
            return (
              <li
                key={tip.id}
                className={`flex flex-col rounded-card bg-surface p-5 shadow-card transition ${
                  tip.is_active ? "" : "opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-ink-900">{tip.key}</p>
                    <p className="mt-1 text-sm text-ink-700">{tip.text}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      tip.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-ink-500"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        tip.is_active ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {tip.is_active ? "Live" : "Off"}
                  </span>
                </div>

                <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
                  <div className="flex gap-1">
                    <dt>When:</dt>
                    <dd className="font-medium text-ink-700">
                      {known?.label ?? (tip.rule || "unknown rule")}
                    </dd>
                  </div>
                  {tip.threshold !== null && tip.threshold !== undefined && (
                    <div className="flex gap-1">
                      <dt>At:</dt>
                      <dd className="font-medium text-ink-700">{tip.threshold}%</dd>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <dt>Priority:</dt>
                    <dd className="font-medium text-ink-700">{tip.savings_impact ?? 0}</dd>
                  </div>
                </dl>

                {!known && (
                  <p
                    className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700"
                    role="status"
                  >
                    <Icon name="triangle-alert" size={13} className="mt-0.5 shrink-0" />
                    The engine has no rule called "{tip.rule}", so this tip is never shown.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setModal({ tip })}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink-500 transition hover:bg-mint-50 hover:text-ink-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(tip)}
                    disabled={pendingId === tip.id}
                    aria-busy={pendingId === tip.id}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink-500 transition hover:bg-mint-50 hover:text-ink-900 disabled:opacity-50"
                  >
                    {pendingId === tip.id && <SubmitSpinner className="h-3 w-3" />}
                    {pendingId === tip.id ? "Working..." : tip.is_active ? "Turn off" : "Turn on"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tip)}
                    disabled={Boolean(pendingId)}
                    className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {pendingId === tip.id && <SubmitSpinner className="h-3 w-3" />}
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {modal !== null && (
        <TipModal
          tip={modal.tip}
          rules={rules}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            setNotice("Saved. Students see the change on their next dashboard load.");
            await load();
          }}
        />
      )}
    </div>
  );
}
