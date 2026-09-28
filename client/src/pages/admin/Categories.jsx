import { useState, useEffect, useRef } from "react";
import Icon from "../../components/Icon.jsx";
import CategoryIcon from "../../components/CategoryIcon.jsx";
import CategoryIconPicker from "../../components/CategoryIconPicker.jsx";
import SubmitSpinner from "../../components/SubmitSpinner.jsx";
import { useSubmitLock } from "../../hooks/useSubmitLock.js";

function CategoryModal({ cat, onClose, onSave }) {
  const [name, setName] = useState(cat?.name ?? "");
  const [type, setType] = useState(cat?.type ?? "expense");
  const [iconKey, setIconKey] = useState(cat?.icon_key ?? null);
  const [iconSvg, setIconSvg] = useState(cat?.icon_svg ?? null);
  const [error, setError] = useState("");
  const { locked: saving, done, run, minWidth, measure } = useSubmitLock();

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    try {
      await run(async () => {
        const url = cat ? `/api/admin/categories/${cat.id}` : "/api/admin/categories";
        const method = cat ? "PUT" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), type, icon_key: iconKey, icon_svg: iconSvg }),
        });
        const data = await res.json();
        if (!res.ok) {
          const detail = data.error?.details?.icon_svg ?? data.error?.details?.icon_key;
          throw new Error(detail ?? data.error?.message ?? data.message ?? "Save failed");
        }
        onSave(data);
      }, { oneShot: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-card bg-surface p-6 shadow-card">
        <h3 className="text-lg font-bold text-ink-900">{cat ? "Edit Category" : "New Category"}</h3>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink-900">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink-900">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-ink-900">Icon</span>
            <CategoryIconPicker
              iconKey={iconKey}
              iconSvg={iconSvg}
              onChange={({ iconKey: nextKey, iconSvg: nextSvg }) => {
                setIconKey(nextKey);
                setIconSvg(nextSvg);
              }}
            />
          </div>
          {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-ink-500 transition hover:bg-mint-50 disabled:opacity-50">
              Cancel
            </button>
            <button
              type="submit"
              ref={measure}
              disabled={saving || !name.trim()}
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

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const deleteLockRef = useRef(false);
  const loadLockRef = useRef(false);

  const requestCategories = async () => {
    const res = await fetch("/api/admin/categories");
    if (!res.ok) throw new Error("Failed to load categories");
    return res.json();
  };

  const load = async () => {
    try {
      setLoading(true);
      setCategories(await requestCategories());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    requestCategories()
      .then((data) => {
        if (cancelled) return;
        setCategories(data);
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

  const handleDelete = async (cat) => {
    if (deleteLockRef.current) return;
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    deleteLockRef.current = true;
    setDeleteError(null);
    setDeleting(cat.id);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");
      await load();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      deleteLockRef.current = false;
      setDeleting(null);
    }
  };

  const handleSave = async () => {
    setModal(null);
    if (loadLockRef.current) return;
    loadLockRef.current = true;
    try {
      await load();
    } finally {
      loadLockRef.current = false;
    }
  };

  if (loading && categories.length === 0) {
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
        <button onClick={() => load()} className="mt-4 rounded-lg bg-red-100 px-4 py-2 font-medium text-red-900 hover:bg-red-200">
          Retry
        </button>
      </div>
    );
  }

  const expense = categories.filter((c) => c.type === "expense");
  const income = categories.filter((c) => c.type === "income");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Default Categories</h1>
          <p className="text-sm text-ink-500">System categories visible to all students</p>
        </div>
        <button
          onClick={() => setModal({ cat: null })}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          <Icon name="plus" size={16} />
          New Category
        </button>
      </div>

      {deleteError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <Icon name="alert-circle" size={18} className="shrink-0 text-red-500" />
          <p className="text-sm font-medium text-red-800">{deleteError}</p>
          <button onClick={() => setDeleteError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      {[{ label: "Expense", items: expense }, { label: "Income", items: income }].map(({ label, items }) => (
        <div key={label}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-500">{label}</h2>
          {items.length === 0 ? (
            <p className="rounded-card border border-dashed border-slate-200 bg-surface p-6 text-center text-sm text-ink-500">
              No {label.toLowerCase()} categories yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-card bg-surface shadow-card">
              <table className="w-full text-left text-sm">
                <thead className="bg-mint-50 text-ink-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Default</th>
                    <th className="px-6 py-3 font-medium">
                      <span className="sr-only sm:not-sr-only">Icon</span>
                    </th>
                    <th className="px-6 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-100">
                  {items.map((cat) => (
                    <tr key={cat.id} className="hover:bg-mint-50/50">
                      <td className="px-6 py-4 font-medium text-ink-900">{cat.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          cat.type === "expense" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {cat.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {cat.is_default ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <Icon name="check" size={14} /> Yes
                          </span>
                        ) : (
                          <span className="text-xs text-ink-500">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <CategoryIcon category={cat} size={18} />
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setModal({ cat })}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink-500 transition hover:bg-mint-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            disabled={deleting === cat.id}
                            aria-busy={deleting === cat.id}
                            className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deleting === cat.id && <SubmitSpinner className="h-3 w-3" />}
                            {deleting === cat.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {modal !== null && (
        <CategoryModal
          cat={modal.cat}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
