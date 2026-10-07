import { useEffect, useState } from "react";
import CategoryIcon from "./CategoryIcon.jsx";
import CategoryIconPicker from "./CategoryIconPicker.jsx";
import Icon from "./Icon.jsx";
import SubmitSpinner from "./SubmitSpinner.jsx";
import { invalidateCategories } from "../hooks/useCategories.js";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import { categoryColor } from "../data/mockData.js";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../lib/apiClient.js";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-surface py-2.5 pl-4 pr-4 text-sm text-ink-900 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

const TYPE_PILL = {
  expense: "bg-red-50 text-red-600",
  income: "bg-emerald-50 text-emerald-600",
};

function GroupLabel({ children, count }) {
  return (
    <div className="flex items-center gap-2 px-5 pb-2 pt-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">{children}</h3>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-ink-500">
        {count}
      </span>
    </div>
  );
}

function CategoryRow({ row, onEdit, onAskDelete, confirming, onConfirm, onCancel, busy }) {
  const color = categoryColor(row.category_id);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}1A`, color }}
        aria-hidden="true"
      >
        <CategoryIcon category={row} size={18} />
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm font-bold text-ink-900">{row.name}</p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TYPE_PILL[row.type] ?? "bg-slate-100 text-ink-500"}`}
          >
            {row.type}
          </span>
          {row.is_default && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
              System
            </span>
          )}
        </p>
      </div>
      {!row.is_default &&
        (confirming ? (
          <span className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              aria-busy={busy}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy && <SubmitSpinner className="h-3 w-3" />}
              {busy ? "Deleting..." : "Confirm delete"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-ink-500 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(row)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-ink-500 transition hover:bg-slate-50"
            >
              <Icon name="pencil" size={14} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onAskDelete(row)}
              className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
            >
              <Icon name="trash-2" size={14} />
              Delete
            </button>
          </span>
        ))}
    </li>
  );
}

export default function CategoryManagerDialog({ onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [iconKey, setIconKey] = useState(null);
  const [iconSvg, setIconSvg] = useState(null);
  const [formError, setFormError] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const {
    locked: saving,
    done: saved,
    run: runSave,
    unlock: unlockSave,
    minWidth: saveMinWidth,
    measure: measureSave,
  } = useSubmitLock();
  const { locked: deleting, run: runDelete, unlock: unlockDelete } = useSubmitLock();

  const refresh = async () => {
    const data = await listCategories();
    setRows(data.categories ?? []);
  };

  useEffect(() => {
    let active = true;
    listCategories()
      .then((data) => {
        if (!active) return;
        setRows(data.categories ?? []);
        setLoading(false);
        setListError("");
      })
      .catch((error) => {
        if (!active) return;
        setLoading(false);
        setListError(error?.message ?? "Couldn't load your categories.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setName("");
    setType("expense");
    setIconKey(null);
    setIconSvg(null);
    setFormError("");
  };

  const openEdit = (row) => {
    setCreating(false);
    setEditing(row);
    setName(row.name);
    setType(row.type);
    setIconKey(row.icon_key ?? null);
    setIconSvg(row.icon_svg ?? null);
    setFormError("");
    setDeleteError("");
    setConfirmId(null);
  };

  const closeForm = () => {
    setEditing(null);
    setCreating(false);
    setFormError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setFormError("Name must be at least 2 characters.");
      return;
    }
    setFormError("");
    try {
      await runSave(
        async () => {
          const payload = { name: trimmed, type, icon_key: iconKey, icon_svg: iconSvg };
          if (editing) await updateCategory(editing.category_id, payload);
          else await createCategory(payload);
          await refresh();
          invalidateCategories();
          closeForm();
        },
        { oneShot: true },
      );
      unlockSave();
    } catch (error) {
      setFormError(error?.message ?? "Couldn't save that category.");
    }
  };

  const confirmDelete = async (row) => {
    if (deleting) return;
    setDeleteError("");
    try {
      await runDelete(
        async () => {
          await deleteCategory(row.category_id);
          await refresh();
          invalidateCategories();
          setConfirmId(null);
        },
        { oneShot: true },
      );
      unlockDelete();
    } catch (error) {
      setDeleteError(error?.message ?? "Couldn't delete that category.");
    }
  };

  const retry = async () => {
    setLoading(true);
    setListError("");
    try {
      await refresh();
    } catch (error) {
      setListError(error?.message ?? "Couldn't load your categories.");
    } finally {
      setLoading(false);
    }
  };

  const systemRows = rows.filter((row) => row.is_default);
  const ownRows = rows.filter((row) => !row.is_default);
  const inForm = creating || editing !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="category-dialog-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-y-auto rounded-card bg-surface p-6 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="category-dialog-title"
              className="font-display text-lg font-extrabold tracking-tight text-ink-900"
            >
              {inForm ? (editing ? "Edit Category" : "New Category") : "Manage Categories"}
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              {inForm
                ? "Give it a name, a type and an icon."
                : "System categories are shared with everyone. Categories you add are just for you."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close categories"
            className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-500 transition hover:bg-slate-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:h-9 md:w-9"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {inForm ? (
          <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
            <div>
              <label htmlFor="category-name" className="mb-1.5 block text-sm font-semibold text-ink-900">
                Name
              </label>
              <input
                id="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Coffee runs"
                maxLength={60}
                autoFocus
                className={inputClass}
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="category-type" className="mb-1.5 block text-sm font-semibold text-ink-900">
                Type
              </label>
              <select
                id="category-type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                className={inputClass}
                disabled={saving}
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

            {formError && (
              <p role="alert" className="text-sm font-semibold text-red-500">
                {formError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-bold text-ink-500 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                ref={measureSave}
                disabled={saving || name.trim().length < 2}
                aria-busy={saving}
                style={saveMinWidth ? { minWidth: saveMinWidth } : undefined}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-700 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <SubmitSpinner className="h-4 w-4" />}
                {saving ? "Saving..." : saved ? "Saved" : "Save Category"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex flex-col gap-1">
            {deleteError && (
              <p role="alert" className="mb-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-500">
                {deleteError}
              </p>
            )}

            {listError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                <Icon name="triangle-alert" size={22} className="mx-auto mb-2 text-red-500" />
                <p className="text-sm font-semibold text-red-800">{listError}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-800 transition hover:bg-red-200"
                >
                  Try again
                </button>
              </div>
            ) : loading ? (
              <ul className="divide-y divide-slate-100" role="status" aria-live="polite" aria-busy="true">
                <span className="sr-only">Loading categories…</span>
                {Array.from({ length: 4 }, (_, index) => (
                  <li key={index} className="flex animate-pulse items-center gap-3 px-5 py-3.5">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100" />
                    <div className="min-w-0 flex-1">
                      <div className="h-3.5 w-32 rounded bg-slate-100" />
                      <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
                    </div>
                    <div className="h-7 w-24 rounded-lg bg-slate-100" />
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <GroupLabel count={systemRows.length}>System</GroupLabel>
                {systemRows.length === 0 ? (
                  <p className="mx-5 rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-ink-500">
                    No system categories right now.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 border-y border-slate-100">
                    {systemRows.map((row) => (
                      <CategoryRow key={row.category_id} row={row} />
                    ))}
                  </ul>
                )}

                <GroupLabel count={ownRows.length}>Mine</GroupLabel>
                {ownRows.length === 0 ? (
                  <p className="mx-5 rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-ink-500">
                    You haven&apos;t added a category yet. Add one to keep your budgets specific.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 border-y border-slate-100">
                    {ownRows.map((row) => (
                      <CategoryRow
                        key={row.category_id}
                        row={row}
                        onEdit={openEdit}
                        onAskDelete={(target) => setConfirmId(target.category_id)}
                        confirming={confirmId === row.category_id}
                        onConfirm={() => confirmDelete(row)}
                        onCancel={() => setConfirmId(null)}
                        busy={deleting}
                      />
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800"
                >
                  <Icon name="plus" size={16} />
                  New Category
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
