import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AssistantFab from "../../components/AssistantFab.jsx";
import Icon from "../../components/Icon.jsx";
import MobileNav from "../../components/MobileNav.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import SubmitSpinner from "../../components/SubmitSpinner.jsx";
import { useSubmitLock } from "../../hooks/useSubmitLock.js";
import {
  listAnnouncements,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../lib/apiClient.js";

function formatStamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "";
  const now = new Date();
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (date.toDateString() === now.toDateString()) return `Today, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${day}, ${time}`;
}

function routeLabel(to) {
  const path = (to ?? "/").split("?")[0].replace(/^\/+|\/+$/g, "");
  if (!path) return "Dashboard";
  const [segment] = path.split("/");
  return segment.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function FilterButton({ active, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
        active ? "bg-forest-900 text-white" : "text-ink-500 hover:text-ink-900"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-px text-[10px] tabular-nums ${
          active ? "bg-white/20 text-white" : "bg-slate-100 text-ink-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">Loading notifications</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-card bg-surface shadow-card" />
      ))}
    </div>
  );
}

export default function Notifications() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState({
    key: null,
    items: [],
    announcements: [],
    error: null,
  });
  const [filter, setFilter] = useState("all");
  const [markingId, setMarkingId] = useState("");
  const { locked, done, run, minWidth, measure } = useSubmitLock();
  const navigate = useNavigate();

  const requestKey = `notifications:${nonce}`;

  useEffect(() => {
    let cancelled = false;
    Promise.all([listNotifications(), listAnnouncements()])
      .then(([data, news]) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          items: data.notifications ?? [],
          announcements: Array.isArray(news) ? news : [],
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          items: [],
          announcements: [],
          error: err.message || "Couldn't load your notifications.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  const refresh = () => setNonce((value) => value + 1);

  const settled = result.key === requestKey;
  const status = settled ? (result.error ? "error" : "ready") : "loading";
  const items = settled ? result.items : [];
  const announcements = settled ? result.announcements : [];
  const unread = items.filter((item) => !item.is_read).length;
  const visible = filter === "unread" ? items.filter((item) => !item.is_read) : items;

  const markRead = (item) => {
    if (markingId) return;
    setMarkingId(item.notification_id);
    setResult((prev) => ({
      ...prev,
      items: prev.items.map((row) =>
        row.notification_id === item.notification_id ? { ...row, is_read: true } : row,
      ),
    }));
    markNotificationRead(item.notification_id)
      .catch(refresh)
      .finally(() => setMarkingId(""));
  };

  const markAll = async () => {
    if (locked) return;
    setResult((prev) => ({
      ...prev,
      items: prev.items.map((row) => ({ ...row, is_read: true })),
    }));
    try {
      await run(() => markAllNotificationsRead());
    } catch {
      refresh();
    }
  };

  const openItem = (item) => {
    if (!item.is_read) markRead(item);
    navigate(item.to || "/");
  };

  const noAlerts = status === "ready" && items.length === 0;
  const nothingUnread = status === "ready" && items.length > 0 && unread === 0;

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
              <Icon name="bell" size={22} />
            </span>
            <div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900">
                Notifications
                {unread > 0 && (
                  <span className="ml-2 inline-flex translate-y-[-3px] items-center rounded-full bg-red-500 px-2 py-0.5 align-middle text-xs font-bold tabular-nums text-white">
                    {unread} new
                  </span>
                )}
              </h1>
              <p className="mt-0.5 text-sm text-ink-500">
                Budget alerts and campus announcements, all in one place.
              </p>
            </div>
          </div>

          {status === "ready" && items.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-full bg-surface p-1 shadow-card ring-1 ring-slate-200/70">
                <FilterButton
                  active={filter === "all"}
                  label="All"
                  count={items.length}
                  onClick={() => setFilter("all")}
                />
                <FilterButton
                  active={filter === "unread"}
                  label="Unread"
                  count={unread}
                  onClick={() => setFilter("unread")}
                />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={refresh}
                  aria-label="Refresh notifications"
                  className="rounded-lg p-2 text-ink-500 transition hover:bg-surface hover:text-ink-900"
                >
                  <Icon name="history" size={17} />
                </button>
                <button
                  type="button"
                  ref={measure}
                  onClick={markAll}
                  disabled={unread === 0 || locked}
                  aria-busy={locked}
                  style={minWidth ? { minWidth } : undefined}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {locked ? <SubmitSpinner /> : <Icon name="check" size={15} />}
                  {done ? "All caught up" : "Mark all read"}
                </button>
              </div>
            </div>
          )}

          {status === "loading" && <Skeleton />}

          {status === "error" && (
            <div className="rounded-card bg-surface p-8 text-center shadow-card">
              <Icon name="triangle-alert" size={28} className="mx-auto text-red-500" />
              <p className="mt-2 text-sm font-semibold text-ink-900">{result.error}</p>
              <button
                type="button"
                onClick={refresh}
                className="mt-3 rounded-lg bg-brand-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-800"
              >
                Try again
              </button>
            </div>
          )}

          {noAlerts && (
            <div className="rounded-card bg-surface p-10 text-center shadow-card">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Icon name="bell" size={22} />
              </span>
              <p className="mt-3 text-sm font-semibold text-ink-900">
                You&apos;re all caught up
              </p>
              <p className="mt-1 text-sm text-ink-500">
                {announcements.length > 0
                  ? "No budget alerts right now. Campus posts are just below."
                  : "Budget alerts, goal nudges and campus announcements will land here."}
              </p>
            </div>
          )}

          {nothingUnread && filter === "unread" && (
            <div className="rounded-card bg-surface p-8 text-center shadow-card">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Icon name="check" size={20} />
              </span>
              <p className="mt-3 text-sm font-semibold text-ink-900">No unread notifications</p>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="mt-3 text-xs font-bold text-brand-600 hover:underline"
              >
                Show everything
              </button>
            </div>
          )}

          {status === "ready" && visible.length > 0 && (
            <section className="overflow-hidden rounded-card bg-surface shadow-card">
              <div className="flex items-center gap-2.5 border-b border-emerald-100 bg-linear-to-r from-emerald-100/80 via-emerald-50 to-surface px-5 py-3.5">
                <Icon name="bell" size={16} className="text-emerald-600" />
                <h2 className="font-display text-base font-bold text-ink-900">Your alerts</h2>
                <span className="ml-auto text-xs font-semibold text-ink-500">
                  {visible.length} {visible.length === 1 ? "item" : "items"}
                </span>
              </div>

              <ul className="divide-y divide-slate-100">
                {visible.map((item) => (
                  <li
                    key={item.notification_id}
                    className={`flex items-start gap-2 px-4 py-4 md:px-5 ${
                      item.is_read ? "" : "bg-mint-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className="flex min-w-0 flex-1 items-start gap-3.5 text-left"
                    >
                      <span
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          item.is_read
                            ? "bg-slate-100 text-ink-500"
                            : "bg-emerald-100 text-emerald-600"
                        }`}
                      >
                        <Icon name={item.icon ?? "bell"} size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span
                            className={`truncate text-sm text-ink-900 ${
                              item.is_read ? "font-semibold" : "font-bold"
                            }`}
                          >
                            {item.title}
                          </span>
                          {!item.is_read && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-forest-700"
                              aria-label="Unread"
                              title="Unread"
                            />
                          )}
                          <span className="ml-auto shrink-0 pl-2 text-[11px] text-slate-400">
                            {formatStamp(item.createdAt ?? item.created_at)}
                          </span>
                        </span>
                        <span className="mt-1 block text-sm text-ink-500">{item.body}</span>
                        <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-brand-600">
                          Open {routeLabel(item.to)}
                          <Icon name="arrow-right" size={12} />
                        </span>
                      </span>
                    </button>

                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={() => markRead(item)}
                        disabled={markingId === item.notification_id}
                        aria-label={`Mark "${item.title}" as read`}
                        title="Mark as read"
                        className="mt-2 rounded-lg p-1.5 text-ink-500 transition hover:bg-white hover:text-emerald-600 disabled:opacity-50"
                      >
                        {markingId === item.notification_id ? (
                          <SubmitSpinner />
                        ) : (
                          <Icon name="check" size={16} />
                        )}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {status === "ready" && announcements.length > 0 && (
            <section className="overflow-hidden rounded-card bg-surface shadow-card">
              <div className="flex items-center gap-2.5 border-b border-emerald-100 bg-linear-to-r from-emerald-100/80 via-emerald-50 to-surface px-5 py-3.5">
                <Icon name="megaphone" size={16} className="text-emerald-600" />
                <h2 className="font-display text-base font-bold text-ink-900">
                  From Campus Coin
                </h2>
                <span className="ml-auto text-xs font-semibold text-ink-500">
                  {announcements.length} {announcements.length === 1 ? "post" : "posts"}
                </span>
              </div>

              <ul className="divide-y divide-slate-100">
                {announcements.map((item) => (
                  <li key={item.announcement_id ?? item.id} className="flex items-start gap-3.5 px-4 py-4 md:px-5">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Icon name="megaphone" size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-ink-900">{item.title}</h3>
                        <span className="ml-auto shrink-0 pl-2 text-[11px] text-slate-400">
                          {formatStamp(item.createdAt ?? item.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-ink-500">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
