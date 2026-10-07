import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import SubmitSpinner from "./SubmitSpinner.jsx";
import { useBookmarks } from "../hooks/useBookmarks.js";

export default function BookmarkButton({ month, suggestedNote = "", onError, className = "" }) {
  const { findForMonth, toggle } = useBookmarks();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(suggestedNote);
  const [busy, setBusy] = useState(false);

  const saved = findForMonth(month);

  // The dialog says aria-modal, so the keyboard must behave as if the page
  // behind it does not exist: focus moves in, Tab stays inside, and closing
  // puts focus back on the button that opened it.
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  useEffect(() => {
    if (open) return undefined;
    // Only restore if focus is still inside the dialog that just closed,
    // otherwise a click somewhere else would steal it back.
    const active = document.activeElement;
    if (active && dialogRef.current?.contains(active)) triggerRef.current?.focus();
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await toggle(month);
    } catch (err) {
      onError?.(err.message || "Couldn't remove that bookmark.");
    } finally {
      setBusy(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await toggle(month, note.trim());
      setOpen(false);
    } catch (err) {
      onError?.(err.message || "Couldn't save that bookmark.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => (saved ? remove() : setOpen(true))}
        disabled={busy}
        aria-pressed={Boolean(saved)}
        aria-label={saved ? "Remove bookmark" : "Save this month"}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
          saved
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-slate-200 text-ink-900 hover:bg-slate-50"
        } ${className}`}
      >
        {busy ? (
          <SubmitSpinner />
        ) : (
          <Icon name="bookmark" size={14} className={saved ? "fill-current" : ""} />
        )}
        {saved ? "Saved" : "Bookmark"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Save a bookmark"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <form
            ref={dialogRef}
            onSubmit={save}
            className="relative w-full max-w-md rounded-card bg-surface p-6 shadow-card"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">
                Save {month}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 transition hover:bg-slate-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:h-9 md:w-9"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <label htmlFor="bookmark-note" className="mb-1.5 mt-4 block text-sm font-semibold text-ink-900">
              Your note
            </label>
            <textarea
              id="bookmark-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={280}
              autoFocus
              placeholder="What do you want to remember about this month?"
              className="w-full resize-none rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <p className="mt-1.5 text-right text-xs tabular-nums text-ink-500">{note.length}/280</p>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-500 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:min-h-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:opacity-60"
              >
                {busy && <SubmitSpinner />}
                Save bookmark
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
