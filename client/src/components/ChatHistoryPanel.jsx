import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";

const GROUPS = ["Today", "Yesterday", "Earlier"];

function groupFor(value) {
  const when = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (when >= startOfToday) return "Today";
  if (when >= startOfYesterday) return "Yesterday";
  return "Earlier";
}

function shortTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatHistoryPanel({
  conversations,
  activeId,
  loading,
  onSelect,
  onRename,
  onDelete,
  onClose,
}) {
  const panelRef = useRef(null);
  const [renaming, setRenaming] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [confirming, setConfirming] = useState(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const node = panelRef.current;
    const focusables = () =>
      Array.from(
        node?.querySelectorAll(
          'button, input, a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.disabled && el.offsetParent !== null);

    focusables()[0]?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose]);

  const startRename = (row) => {
    setConfirming(null);
    setRenaming(row.id);
    setDraftTitle(row.title);
  };

  const commitRename = () => {
    const title = draftTitle.trim();
    if (title) onRename(renaming, title);
    setRenaming(null);
  };

  const grouped = GROUPS.map((label) => ({
    label,
    rows: conversations.filter((row) => groupFor(row.lastMessageAt) === label),
  })).filter((bucket) => bucket.rows.length > 0);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Chat history"
      className="absolute inset-0 z-20 flex flex-col rounded-card bg-surface shadow-card"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Icon name="history" size={18} className="text-ink-500" />
        <h3 className="font-display text-sm font-bold text-ink-900">History</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close history"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:h-9 md:w-9"
        >
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {loading && (
          <p className="px-3 text-sm text-ink-500">Loading your chats…</p>
        )}

        {!loading && conversations.length === 0 && (
          <div className="px-3 py-8 text-center">
            <Icon name="history" size={24} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-medium text-ink-900">No chats yet</p>
            <p className="mt-1 text-sm text-ink-500">
              Ask Rix something and it will show up here.
            </p>
          </div>
        )}

        {grouped.map((bucket) => (
          <div key={bucket.label} className="mb-4 last:mb-0">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              {bucket.label}
            </p>
            <ul className="space-y-1">
              {bucket.rows.map((row) => {
                const isActive = row.id === activeId;
                if (renaming === row.id) {
                  return (
                    <li key={row.id} className="rounded-xl bg-slate-50 px-3 py-2">
                      <input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitRename();
                          }
                          if (event.key === "Escape") setRenaming(null);
                        }}
                        aria-label="Chat title"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-ink-900 outline-none focus:border-brand-500"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={commitRename}
                          className="rounded-lg bg-brand-700 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-800"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenaming(null)}
                          className="rounded-lg px-3 py-1 text-xs font-semibold text-ink-500 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </li>
                  );
                }

                if (confirming === row.id) {
                  return (
                    <li key={row.id} className="rounded-xl bg-red-50 px-3 py-2">
                      <p className="text-sm text-ink-900">
                        Delete “{row.title}”?
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(row.id);
                            setConfirming(null);
                          }}
                          className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="rounded-lg px-3 py-1 text-xs font-semibold text-ink-500 hover:bg-slate-100"
                        >
                          Keep
                        </button>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={row.id}>
                    <div
                      className={`group flex items-center gap-1 rounded-xl px-3 py-2 transition ${
                        isActive ? "bg-brand-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(row.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-sm font-medium text-ink-900">
                          {row.title}
                        </span>
                        <span className="block text-xs text-ink-500">
                          {shortTime(row.lastMessageAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => startRename(row)}
                        aria-label={`Rename ${row.title}`}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 opacity-100 transition hover:bg-slate-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:h-9 md:w-9 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Icon name="pencil" size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRenaming(null);
                          setConfirming(row.id);
                        }}
                        aria-label={`Delete ${row.title}`}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 opacity-100 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:h-9 md:w-9 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Icon name="trash-2" size={15} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
