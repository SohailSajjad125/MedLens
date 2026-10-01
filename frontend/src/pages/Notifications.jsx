import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { profileApi } from "../api/endpoints";
import { BellIcon } from "../components/Icons";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const { data } = await profileApi.notifications();
      setItems(data);
      // Mark all unread notifications as read automatically
      const unread = data.filter((n) => !n.is_read);
      for (const n of unread) {
        await profileApi.markNotifRead(n.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await profileApi.deleteNotif(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  return (
    <DashboardLayout breadcrumb="Updates" title="Notifications">
      {loading && <div className="skeleton" style={{ height: 200 }} />}

      {!loading && items.length === 0 && (
        <div className="neo-card empty-state">
          <BellIcon width={40} height={40} />
          <p>You're all caught up — no notifications yet.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((n) => (
            <div
              key={n.id}
              className="neo-card"
              style={{
                padding: "18px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderLeft: n.is_read ? "1px solid var(--glass-border)" : "4px solid var(--accent-teal)"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <strong style={{ fontSize: "1.05rem" }}>{n.title}</strong>
                  {!n.is_read && <span className="badge badge-normal">New</span>}
                </div>
                <p style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: "0.9rem" }}>{n.message}</p>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginTop: 6 }}>
                  {n.created_at
                    ? new Date(n.created_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : ""}
                </span>
              </div>
              <button
                className="btn btn-danger-ghost btn-sm"
                onClick={(e) => handleDelete(e, n.id)}
                style={{ padding: "6px 12px" }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
