import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import { categories } from "../data/mockData.js";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-surface py-2.5 pl-4 pr-4 text-sm text-ink-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

const EXPENSE_CATEGORIES = categories.filter((category) => category.type === "expense");

export default function BudgetForm({ initial, month, budgets, onClose, onSave, onDelete }) {
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [limit, setLimit] = useState(initial ? String(initial.limit_amount) : "");
  const [monthValue, setMonthValue] = useState(initial?.month ?? month);
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (event) => {
    event.preventDefault();
    const next = {};
    const value = Number(limit);
    if (limit.trim() === "") {
      next.limit = "Enter a monthly limit.";
    } else if (!Number.isFinite(value) || value <= 0) {
      next.limit = "Limit must be greater than ₦0.";
    }
    if (!categoryId) next.category = "Choose a category.";
    if (!monthValue) next.month = "Pick a month for this budget.";
    if (!next.category && !next.month) {
      const duplicate = budgets.some(
        (item) =>
          item.category_id === categoryId &&
          item.month === monthValue &&
          item.budget_id !== initial?.budget_id,
      );
      if (duplicate) {
        next.category = "A budget for this category already exists that month.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave({
      category_id: categoryId,
      month: monthValue,
      limit_amount: Math.round(value),
    });
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(initial.budget_id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-form-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <form
        onSubmit={submit}
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-y-auto rounded-card bg-surface p-6 shadow-card"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="budget-form-title"
              className="font-display text-lg font-extrabold tracking-tight text-ink-900"
            >
              {initial ? "Edit Budget" : "Add Budget"}
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Set a monthly spending limit for one category.
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

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label htmlFor="budget-category" className="block text-sm font-semibold text-ink-900">
              Category
            </label>
            <p className="mb-1.5 text-xs text-ink-500">Which spending category gets this limit?</p>
            <div className="relative">
              <select
                id="budget-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                aria-invalid={Boolean(errors.category)}
                className={`w-full appearance-none rounded-lg border border-slate-200 bg-surface py-2.5 pl-4 pr-9 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                  categoryId ? "text-ink-900" : "text-slate-400"
                }`}
              >
                <option value="">Choose category</option>
                {EXPENSE_CATEGORIES.map((category) => (
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
            <label htmlFor="budget-limit" className="block text-sm font-semibold text-ink-900">
              Monthly Limit
            </label>
            <p className="mb-1.5 text-xs text-ink-500">
              The most you plan to spend in this category that month.
            </p>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">
                &#8358;
              </span>
              <input
                id="budget-limit"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                placeholder="e.g. 12000"
                aria-invalid={Boolean(errors.limit)}
                className={`${inputClass} pl-9`}
              />
            </div>
            {errors.limit && (
              <p className="mt-1 text-xs font-semibold text-red-500" role="alert">
                {errors.limit}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="budget-month" className="block text-sm font-semibold text-ink-900">
              Month
            </label>
            <p className="mb-1.5 text-xs text-ink-500">Budgets are tracked per calendar month.</p>
            <div className="relative">
              <Icon
                name="calendar"
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
              />
              <input
                id="budget-month"
                type="month"
                value={monthValue}
                onChange={(event) => setMonthValue(event.target.value)}
                aria-invalid={Boolean(errors.month)}
                className={`${inputClass} pl-10`}
              />
            </div>
            {errors.month && (
              <p className="mt-1 text-xs font-semibold text-red-500" role="alert">
                {errors.month}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {initial && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-sm font-semibold text-red-500 transition hover:text-red-600"
            >
              {confirmDelete ? "Confirm delete?" : "Delete budget"}
            </button>
          )}
          <div className="flex flex-1 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-500 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
            >
              <Icon name="save" size={16} />
              {initial ? "Save Changes" : "Save Budget"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
