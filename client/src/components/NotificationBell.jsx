import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import {
  listAnnouncements,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/apiClient.js";
import { formatDate } from "../lib/formatMonth.js";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [nonce, setNonce] = useState(0);
  // The answer is tagged with the request it belongs to, so anything else is
  // still loading. This avoids calling setState synchronously inside an effect.
  const [result, setResult] = useState({ key: null, items: [], error: null });
  const [announcements, setAnnouncements] = useState([]);
  const rootRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    Promise.all([listNotifications(), listAnnouncements()])
      .then(([data, news]) => {
        if (cancelled) return;
        setResult({ key: nonce, items: data.notifications, error: null });
        setAnnouncements(Array.isArray(news) ? news : []);
      })
      .catch((error) => {
        if (cancelled) return;
        setResult({ key: nonce, items: [], error: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const settled = result.key === nonce;
  const status = settled ? (result.error ? "error" : "ready") : "loading";
  const items = settled ? result.items : [];
  const unread = items.filter((item) => !item.is_read).length;

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Opening the bell refetches, so an alert raised while the student was on the
  // budgets page is already there by the time they go looking for it.
  const toggle = () => {
    setOpen((visible) => {
      if (!visible) refresh();
      return !visible;
    });
  };

  // Marked read on the server first, then locally. A local-only flip would make
  // the badge look handled and reappear on the next refresh.
  const markRead = (notificationId) => {
    setResult((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.notification_id === notificationId ? { ...item, is_read: true } : item,
      ),
    }));
    markNotificationRead(notificationId).catch(refresh);
  };

  const markAll = () => {
    setResult((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({ ...item, is_read: true })),
    }));
    markAllNotificationsRead().catch(refresh);
  };

  const openItem = (item) => {
    markRead(item.notification_id);
    setOpen(false);
    navigate(item.to);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative rounded-lg p-2 transition hover:bg-surface"
      >
        <Icon name="bell" size={19} />
        {unread > 0 && (
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-card bg-surface p-2 shadow-card ring-1 ring-slate-200/70">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="font-display text-sm font-bold text-ink-900">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-xs font-semibold text-brand-600 transition hover:text-brand-700"
              >
                Mark all read
              </button>
            )}
          </div>

          {status === "loading" && (
            <p className="px-2 py-6 text-center text-sm text-ink-500" role="status">
              Loading notifications...
            </p>
          )}

          {status === "error" && (
            <div className="px-2 py-6 text-center" role="alert">
              <p className="text-sm text-red-500">{result.error}</p>
              <button
                type="button"
                onClick={refresh}
                className="mt-2 text-xs font-semibold text-brand-600 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {announcements.length > 0 && (
            <ul className="mb-1 flex flex-col gap-1 border-b border-slate-100 pb-1">
              {announcements.map((item) => (
                <li key={item.announcement_id ?? item.id}>
                  <a
                    href="/"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-start gap-3 rounded-lg bg-mint-50 px-2 py-2 text-left transition hover:bg-sage-50"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Icon name="megaphone" size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-900">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">{item.body}</span>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {formatDate(item.createdAt)}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {status === "ready" && items.length === 0 && announcements.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-ink-500">
              Nothing here yet. Budget alerts will show up on this bell.
            </p>
          )}

          {status === "ready" && items.length > 0 && (
            <ul className="flex flex-col gap-1">
              {items.map((item) => (
                <li key={item.notification_id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={`flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50 ${
                      item.is_read ? "" : "bg-mint-50"
                    }`}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Icon name={item.icon} size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-ink-900">
                          {item.title}
                        </span>
                        {!item.is_read && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-forest-700"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-500">{item.body}</span>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {formatDate(item.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
