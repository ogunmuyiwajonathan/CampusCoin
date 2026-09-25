import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import { notifications as SEED_NOTIFICATIONS } from "../data/mockData.js";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(SEED_NOTIFICATIONS);
  const rootRef = useRef(null);
  const navigate = useNavigate();

  const unread = items.filter((item) => !item.is_read).length;

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

  const markRead = (notificationId) => {
    setItems((prev) =>
      prev.map((item) =>
        item.notification_id === notificationId ? { ...item, is_read: true } : item,
      ),
    );
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
        onClick={() => setOpen((visible) => !visible)}
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
            <button
              type="button"
              onClick={() => setItems((prev) => prev.map((item) => ({ ...item, is_read: true })))}
              className="text-xs font-semibold text-brand-600 transition hover:text-brand-700"
            >
              Mark all read
            </button>
          </div>
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
                    <span className="mt-0.5 block truncate text-xs text-ink-500">
                      {item.body}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {item.created_at}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
