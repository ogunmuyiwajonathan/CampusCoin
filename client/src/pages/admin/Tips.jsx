import { useState, useEffect, useRef } from "react";
import Icon from "../../components/Icon.jsx";
import SubmitSpinner from "../../components/SubmitSpinner.jsx";
import { useSubmitLock } from "../../hooks/useSubmitLock.js";

function TipModal({ tip, onClose, onSave }) {
  const [key, setKey] = useState(tip?.key ?? "");
  const [text, setText] = useState(tip?.text ?? "");
  const [rule, setRule] = useState(tip?.rule ?? "");
  const [threshold, setThreshold] = useState(tip?.threshold ?? "");
  const [savingsImpact, setSavingsImpact] = useState(tip?.savings_impact ?? "");
  const [isActive, setIsActive] = useState(tip?.is_active ?? true);
  const [error, setError] = useState("");
  const { locked: saving, done, run, minWidth, measure } = useSubmitLock();

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    try {
      await run(async () => {
        const url = tip ? `/api/admin/tips/${tip.id}` : "/api/admin/tips";
        const method = tip ? "PUT" : "POST";
        const body = {
          key: key.trim(),
          text: text.trim(),
          rule: rule.trim(),
          is_active: isActive,
        };
        if (threshold !== "") body.threshold = Number(threshold);
        if (savingsImpact !== "") body.savings_impact = Number(savingsImpact);
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Save failed");
        onSave(data);
      }, { oneShot: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-card bg-surface p-6 shadow-card">
        <h3 className="text-lg font-bold text-ink-900">{tip ? "Edit Tip" : "New Tip"}</h3>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink-900">Key</label>
              <input value={key} onChange={(e) => setKey(e.target.value)} required placeholder="e.g. top_category_share"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink-900">Rule</label>
              <input value={rule} onChange={(e) => setRule(e.target.value)} placeholder="e.g. category_share_above"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink-900">Text</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} required rows={3}
              placeholder="Tip text. Use {category}, {percentage}, etc."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink-900">Threshold</label>
              <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink-900">Savings Impact</label>
              <input type="number" value={savingsImpact} onChange={(e) => setSavingsImpact(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-900">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
            Active
          </label>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-ink-500 transition hover:bg-mint-50 disabled:opacity-50">Cancel</button>
            <button
              type="submit"
              ref={measure}
              disabled={saving || !key.trim() || !text.trim()}
              aria-busy={saving}
              style={minWidth ? { minWidth } : undefined}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <SubmitSpinner className="h-3.5 w-3.5" />}
              {saving ? "Saving..." : done ? "Saved" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Tips() {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const deleteLockRef = useRef(false);

  const requestTips = async () => {
    const res = await fetch("/api/admin/tips");
    if (!res.ok) throw new Error("Failed to load tips");
    return res.json();
  };

  const load = async () => {
    try {
      setLoading(true);
      setTips(await requestTips());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    requestTips()
      .then((data) => {
        if (cancelled) return;
        setTips(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleActive = async (tip) => {
    setToggling(tip.id);
    try {
      const res = await fetch(`/api/admin/tips/${tip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tip, is_active: !tip.is_active }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      await load();
    } catch {
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (tip) => {
    if (deleteLockRef.current) return;
    if (!window.confirm(`Delete tip "${tip.key}"?`)) return;
    deleteLockRef.current = true;
    setDeleting(tip.id);
    try {
      await fetch(`/api/admin/tips/${tip.id}`, { method: "DELETE" });
      await load();
    } catch {
    } finally {
      deleteLockRef.current = false;
      setDeleting(null);
    }
  };

  if (loading && tips.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-card bg-surface shadow-card" />
        <div className="h-72 w-full animate-pulse rounded-card bg-surface shadow-card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-900">
        <Icon name="alert-circle" size={32} className="mx-auto mb-2 text-red-500" />
        <p className="font-semibold">{error}</p>
        <button onClick={() => load()} className="mt-4 rounded-lg bg-red-100 px-4 py-2 font-medium text-red-900 hover:bg-red-200">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Tip Templates</h1>
          <p className="text-sm text-ink-500">Rule-based tips shown to students</p>
        </div>
        <button onClick={() => setModal({ tip: null })} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700">
          <Icon name="plus" size={16} /> New Tip
        </button>
      </div>

      {tips.length === 0 ? (
        <div className="rounded-card border border-dashed border-slate-200 bg-surface p-12 text-center">
          <Icon name="lightbulb" size={32} className="mx-auto mb-3 text-ink-500" />
          <p className="font-medium text-ink-900">No tip templates yet</p>
          <p className="mt-1 text-sm text-ink-500">Add your first tip template to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card bg-surface shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-mint-50 text-ink-500">
              <tr>
                <th className="px-6 py-3 font-medium">Key</th>
                <th className="px-6 py-3 font-medium">Rule</th>
                <th className="px-6 py-3 font-medium">Impact</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-100">
              {tips.map((tip) => (
                <tr key={tip.id} className="hover:bg-mint-50/50">
                  <td className="px-6 py-4">
                    <p className="font-mono text-xs font-medium text-ink-900">{tip.key}</p>
                    <p className="mt-0.5 max-w-xs truncate text-xs text-ink-500">{tip.text}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-ink-500">{tip.rule || "-"}</td>
                  <td className="px-6 py-4 text-xs text-ink-500">{tip.savings_impact ?? "-"}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActive(tip)} disabled={toggling === tip.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition ${
                        tip.is_active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-ink-500 hover:bg-slate-200"
                      }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${tip.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {tip.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setModal({ tip })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink-500 transition hover:bg-mint-50">Edit</button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tip)}
                        disabled={deleting === tip.id}
                        aria-busy={deleting === tip.id}
                        className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deleting === tip.id && <SubmitSpinner className="h-3 w-3" />}
                        {deleting === tip.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <TipModal tip={modal.tip} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}
