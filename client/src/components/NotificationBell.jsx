import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import { listNotifications } from "../lib/apiClient.js";

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onNotificationsPage = pathname === "/notifications";

  useEffect(() => {
    if (onNotificationsPage) return undefined;
    let cancelled = false;
    listNotifications()
      .then((data) => {
        if (cancelled) return;
        setUnread((data.notifications ?? []).filter((item) => !item.is_read).length);
      })
      .catch(() => {
        if (cancelled) return;
        setUnread((value) => value);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, onNotificationsPage]);

  return (
    <button
      type="button"
      onClick={() => navigate("/notifications")}
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      aria-current={onNotificationsPage ? "page" : undefined}
      className={`relative rounded-lg p-2 transition hover:bg-surface ${
        onNotificationsPage ? "bg-surface" : ""
      }`}
    >
      <Icon name="bell" size={19} />
      {unread > 0 && (
        <span
          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
