import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { useCategories } from "../hooks/useCategories.js";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed.js";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import SubmitSpinner from "./SubmitSpinner.jsx";
import { listTransactions } from "../lib/apiClient.js";
import { findDuplicateOf } from "../lib/duplicates.js";
import { formatCurrency } from "../lib/formatCurrency.js";
import { formatDate, monthKey, todayISO } from "../lib/formatMonth.js";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-surface py-2.5 pl-4 pr-4 text-sm text-ink-900 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

const TYPE_OPTIONS = [
  { id: "expense", label: "Expense", icon: "wallet" },
  { id: "income", label: "Income", icon: "piggy-bank" },
];

const newRequestId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function TransactionForm({ initial, onClose, onSave }) {
  const { categories, status } = useCategories();
  const [type, setType] = useState(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [recurring, setRecurring] = useState(initial?.is_recurring ?? false);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const [duplicate, setDuplicate] = useState(null);
  const duplicatePayloadRef = useRef(null);
  const { record } = useRecentlyViewed();
  const { locked, done, run, minWidth, measure } = useSubmitLock();
  const requestIdRef = useRef(null);
  if (requestIdRef.current === null) requestIdRef.current = newRequestId();

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Opening an entry to look at it is what puts it on the dashboard's
  // recently-viewed list. The record runs again when the categories arrive so
  // an entry without its own description can show its category name instead.
  useEffect(() => {
    if (!initial?.transaction_id) return;
    const categoryName = categories.find(
      (category) => category.category_id === initial.category_id,
    )?.name;
    record({
      transaction_id: initial.transaction_id,
      label: initial.description?.trim() || categoryName || "Transaction entry",
      type: initial.type,
      amount: initial.amount,
      date: initial.date,
    });
  }, [initial, categories, record]);

  const typeCategories =
    status === "ready" ? categories.filter((category) => category.type === type) : [];

  const switchType = (nextType) => {
    if (nextType === type) return;
    setType(nextType);
    const selected = categories.find((category) => category.category_id === categoryId);
    if (selected && selected.type !== nextType) {
      setCategoryId("");
      setErrors((prev) => {
        const next = { ...prev };
        delete next.category;
        return next;
      });
    }
  };

  // Detection is advisory: the twin is looked up in the month being saved,
  // and a lookup that fails simply lets the save continue - a broken check
  // must never stop the student from logging money.
  const findExistingTwin = async (payload) => {
    try {
      const { transactions } = await listTransactions(monthKey(payload.date));
      return findDuplicateOf(
        { transaction_id: initial?.transaction_id ?? null, ...payload },
        transactions,
      );
    } catch {
      return null;
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (locked) return;
    const next = {};
    const value = Number(amount);
    if (amount.trim() === "") {
      next.amount = "Enter an amount.";
    } else if (!Number.isFinite(value) || value <= 0) {
      next.amount = "Amount must be greater than ₦0.";
    }
    if (status !== "ready") {
      next.category =
        status === "error"
          ? "Categories could not be loaded. Try again."
          : "Categories are still loading. Try again in a moment.";
    } else if (!categoryId) {
      next.category = "Choose a category.";
    }
    if (!date) next.date = "Pick a date for this transaction.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaveError("");
    const payload = {
      type,
      amount: Math.round(value),
      category_id: categoryId,
      description: description.trim(),
      date,
      is_recurring: recurring,
    };
    if (!initial) payload.request_id = requestIdRef.current;
    const twin = await findExistingTwin(payload);
    if (twin) {
      duplicatePayloadRef.current = payload;
      setDuplicate(twin);
      return;
    }
    try {
      await run(() => onSave(payload), { oneShot: true });
    } catch (err) {
      setSaveError(err?.message ?? "Couldn't save that transaction.");
    }
  };

  const saveAnyway = async () => {
    const payload = duplicatePayloadRef.current;
    duplicatePayloadRef.current = null;
    setDuplicate(null);
    if (!payload) return;
    try {
      await run(() => onSave(payload), { oneShot: true });
    } catch (err) {
      setSaveError(err?.message ?? "Couldn't save that transaction.");
    }
  };

  const dismissDuplicate = () => {
    duplicatePayloadRef.current = null;
    setDuplicate(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-form-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <form
        onSubmit={submit}
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-y-auto rounded-card bg-surface p-6 shadow-card"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="tx-form-title"
              className="font-display text-lg font-extrabold tracking-tight text-ink-900"
            >
              {initial ? "Edit Transaction" : "Add Transaction"}
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Log your income or expense and keep track of your money.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close form"
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-50 hover:text-ink-900"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {duplicate && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3.5" role="alert">
            <div className="flex items-start gap-2.5">
              <Icon name="triangle-alert" size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-700">This may already be saved</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-900">
                  A {formatCurrency(duplicate.amount)}{" "}
                  {categories.find((c) => c.category_id === duplicate.category_id)?.name ??
                    "matching"}{" "}
                  entry on {formatDate(duplicate.date)} matches on amount, category and date.
                  Save anyway if you really did spend twice.
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveAnyway}
                className="rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-brand-800"
              >
                {initial ? "Save changes anyway" : "Save anyway"}
              </button>
              <button
                type="button"
                onClick={dismissDuplicate}
                className="rounded-lg border border-amber-200 bg-surface px-3.5 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
              >
                Keep editing
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-ink-900">Transaction Type</p>
            <p className="mb-2 text-xs text-ink-500">Are you adding income or an expense?</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={type === option.id}
                  onClick={() => switchType(option.id)}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                    type === option.id
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-slate-200 bg-surface text-ink-500 hover:bg-slate-50"
                  }`}
                >
                  <Icon name={option.icon} size={16} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="tx-amount" className="block text-sm font-semibold text-ink-900">
              Amount
            </label>
            <p className="mb-1.5 text-xs text-ink-500">Enter the amount in Naira (&#8358;).</p>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">
                &#8358;
              </span>
              <input
                id="tx-amount"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="e.g. 5000"
                aria-invalid={Boolean(errors.amount)}
                className={`${inputClass} pl-9`}
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-xs font-semibold text-red-500" role="alert">
                {errors.amount}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="tx-category" className="block text-sm font-semibold text-ink-900">
              Category
            </label>
            <p className="mb-1.5 text-xs text-ink-500">Select a category for this transaction.</p>
            <div className="relative">
              <select
                id="tx-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                aria-invalid={Boolean(errors.category)}
                className={`w-full appearance-none rounded-lg border border-slate-200 bg-surface py-2.5 pl-4 pr-9 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                  categoryId ? "text-ink-900" : "text-slate-400"
                }`}
              >
                <option value="">Choose category</option>
                {typeCategories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Icon
                name="chevron-down"
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-500"
              />
            </div>
            {errors.category && (
              <p className="mt-1 text-xs font-semibold text-red-500" role="alert">
                {errors.category}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="tx-description" className="block text-sm font-semibold text-ink-900">
              Description <span className="font-normal text-ink-500">(optional)</span>
            </label>
            <p className="mb-1.5 text-xs text-ink-500">Add a short note about this transaction.</p>
            <input
              id="tx-description"
              type="text"
              maxLength={80}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. Lunch at the cafeteria"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="tx-date" className="block text-sm font-semibold text-ink-900">
              Date
            </label>
            <p className="mb-1.5 text-xs text-ink-500">When did this transaction happen?</p>
            <div className="relative">
              <Icon
                name="calendar"
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
              />
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                aria-invalid={Boolean(errors.date)}
                className={`${inputClass} pl-10`}
              />
            </div>
            {errors.date && (
              <p className="mt-1 text-xs font-semibold text-red-500" role="alert">
                {errors.date}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
            <button
              type="button"
              role="switch"
              aria-checked={recurring}
              aria-label="Recurring transaction"
              onClick={() => setRecurring((value) => !value)}
              className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
                recurring ? "bg-brand-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-surface shadow transition-transform dark:bg-white ${
                  recurring ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">
                Recurring Transaction <span className="font-normal text-ink-500">(optional)</span>
              </p>
              <p className="text-xs text-ink-500">Set this as a recurring transaction.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            ref={measure}
            disabled={locked}
            aria-busy={locked}
            style={minWidth ? { minWidth } : undefined}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {locked ? <SubmitSpinner /> : <Icon name="save" size={16} />}
            {locked
              ? "Saving..."
              : done
                ? "Saved"
                : initial
                  ? "Save Changes"
                  : "Save Transaction"}
          </button>
        </div>
        {saveError && (
          <p className="mt-3 text-sm font-semibold text-red-500" role="alert">
            {saveError}
          </p>
        )}
      </form>
    </div>
  );
}
