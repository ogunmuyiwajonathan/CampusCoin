import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import AssistantFab from "../../components/AssistantFab.jsx";
import MobileNav from "../../components/MobileNav.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import SubmitSpinner from "../../components/SubmitSpinner.jsx";
import Toast from "../../components/Toast.jsx";
import { editBookmark, listBookmarks, removeBookmark } from "../../lib/apiClient.js";
import { syncBookmarks } from "../../hooks/useBookmarks.js";

function monthLabel(month) {
  if (!month) return "Saved item";
  const [year, m] = month.split("-");
  return new Date(Date.UTC(Number(year), Number(m) - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function NoteEditor({ bookmark, onSave, onCancel, saving }) {
  const [note, setNote] = useState(bookmark.note ?? "");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(note);
      }}
      className="mt-2 flex flex-col gap-2"
    >
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={280}
        rows={2}
        autoFocus
        placeholder="Why is this worth keeping?"
        aria-label="Bookmark note"
        className="w-full resize-none rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-800 disabled:opacity-60"
        >
          {saving && <SubmitSpinner />}
          Save note
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-500 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <span className="ml-auto text-[11px] tabular-nums text-ink-500">{note.length}/280</span>
      </div>
    </form>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">Loading bookmarks</span>
      {[0, 1].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-card bg-surface shadow-card" />
      ))}
    </div>
  );
}

export default function Bookmarks() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState({ key: null, rows: [], error: null });
  const [editing, setEditing] = useState(null);
  const [savingId, setSavingId] = useState("");
  const [toast, setToast] = useState(null);

  // A bookmark result from the typeahead opens on the month it came from.
  const [searchParams] = useSearchParams();
  const focusMonth = searchParams.get("month");

  const requestKey = `bookmarks:${nonce}`;

  useEffect(() => {
    let cancelled = false;
    listBookmarks()
      .then((data) => {
        if (cancelled) return;
        setResult({ key: requestKey, rows: data.bookmarks ?? [], error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          rows: [],
          error: err.message || "Couldn't load your bookmarks.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  const settled = result.key === requestKey;
  const status = settled ? (result.error ? "error" : "ready") : "loading";
  const error = result.error;
  const bookmarks = result.rows;

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const groups = useMemo(() => {
    const byMonth = new Map();
    for (const bookmark of bookmarks) {
      const key = bookmark.month ?? "other";
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key).push(bookmark);
    }
    return [...byMonth.entries()].sort(([a], [b]) => (a === "other" ? 1 : b === "other" ? -1 : b.localeCompare(a)));
  }, [bookmarks]);

  // With a month in the URL only that month is shown, which is what makes a
  // single bookmark from the typeahead feel like it landed somewhere.
  const visibleGroups = focusMonth
    ? groups.filter(([key]) => key === focusMonth || (key === "other" && !focusMonth))
    : groups;

  const replace = (bookmark) =>
    setResult((current) => {
      const rows = current.rows.map((b) => (b.bookmark_id === bookmark.bookmark_id ? bookmark : b));
      syncBookmarks(rows);
      return { ...current, rows };
    });

  const remove = async (bookmark) => {
    setSavingId(bookmark.bookmark_id);
    try {
      await removeBookmark(bookmark.bookmark_id);
      setResult((current) => {
        const rows = current.rows.filter((b) => b.bookmark_id !== bookmark.bookmark_id);
        syncBookmarks(rows);
        return { ...current, rows };
      });
      setToast({ kind: "success", message: "Bookmark removed." });
    } catch (err) {
      setToast({ kind: "error", message: err.message || "Couldn't remove that." });
    } finally {
      setSavingId("");
    }
  };

  const saveNote = async (bookmark, note) => {
    setSavingId(bookmark.bookmark_id);
    try {
      const data = await editBookmark(bookmark.bookmark_id, { note });
      replace(data.bookmark);
      setEditing(null);
      setToast({ kind: "success", message: "Note saved." });
    } catch (err) {
      setToast({ kind: "error", message: err.message || "Couldn't save that note." });
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="min-h-svh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileNav />
      <AssistantFab />

      <div className="lg:pl-60">
        <main className="mx-auto max-w-4xl space-y-5 px-4 pb-24 pt-5 md:pb-5">
          <PageHeader onMenu={() => setSidebarOpen(true)} />

          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Icon name="bookmark" size={22} />
            </span>
            <div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900">
                Bookmarks
              </h1>
              <p className="mt-0.5 text-sm text-ink-500">
                Months and notes you saved, kept on your account.
              </p>
            </div>
          </div>

          {status === "loading" && <Skeleton />}

          {status === "error" && (
            <div className="rounded-card bg-surface p-8 text-center shadow-card">
              <Icon name="triangle-alert" size={28} className="mx-auto text-red-500" />
              <p className="mt-2 text-sm font-semibold text-ink-900">{error}</p>
              <button
                type="button"
                onClick={() => setNonce((value) => value + 1)}
                className="mt-3 rounded-lg bg-brand-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-800"
              >
                Try again
              </button>
            </div>
          )}

          {status === "ready" && bookmarks.length > 0 && visibleGroups.length === 0 && (
            <div className="rounded-card bg-surface p-8 text-center shadow-card">
              <p className="text-sm font-semibold text-ink-900">Nothing saved for that month</p>
              <Link
                to="/bookmarks"
                className="mt-3 inline-block text-xs font-bold text-brand-600 hover:underline"
              >
                Show every saved month
              </Link>
            </div>
          )}

          {status === "ready" && bookmarks.length === 0 && (
            <div className="rounded-card bg-surface p-10 text-center shadow-card">
              <Icon name="bookmark" size={28} className="mx-auto text-ink-500" />
              <p className="mt-2 text-sm font-semibold text-ink-900">Nothing saved yet</p>
              <p className="mt-1 text-sm text-ink-500">
                Use the bookmark button on an insight to keep a month here.
              </p>
            </div>
          )}

          {status === "ready" &&
            groups.map(([key, items]) => (
              <section key={key} className="overflow-hidden rounded-card bg-surface shadow-card">
                <div className="flex items-center gap-2.5 border-b border-emerald-100 bg-linear-to-r from-emerald-100/80 via-emerald-50 to-surface px-5 py-3.5">
                  <Icon name="calendar" size={16} className="text-emerald-600" />
                  <h2 className="font-display text-base font-bold text-ink-900">
                    {monthLabel(key === "other" ? null : key)}
                  </h2>
                  <span className="ml-auto text-xs font-semibold text-ink-500">
                    {items.length} saved
                  </span>
                </div>

                <ul className="divide-y divide-slate-100">
                  {items.map((bookmark) => (
                    <li key={bookmark.bookmark_id} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-ink-900">
                            {bookmark.insight_text ?? bookmark.tip_text ?? "Saved month"}
                          </p>
                          {bookmark.note && editing !== bookmark.bookmark_id && (
                            <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-500">
                              <Icon name="notebook-pen" size={14} className="mt-0.5 shrink-0" />
                              {bookmark.note}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setEditing((current) =>
                                current === bookmark.bookmark_id ? null : bookmark.bookmark_id,
                              )
                            }
                            aria-label="Edit note"
                            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-50 hover:text-ink-900"
                          >
                            <Icon name="pencil" size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(bookmark)}
                            disabled={savingId === bookmark.bookmark_id}
                            aria-label="Delete bookmark"
                            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            {savingId === bookmark.bookmark_id ? (
                              <SubmitSpinner />
                            ) : (
                              <Icon name="trash" size={16} />
                            )}
                          </button>
                        </div>
                      </div>

                      {editing === bookmark.bookmark_id && (
                        <NoteEditor
                          bookmark={bookmark}
                          saving={savingId === bookmark.bookmark_id}
                          onSave={(note) => saveNote(bookmark, note)}
                          onCancel={() => setEditing(null)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
