import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { SunIcon, MoonIcon, BellIcon } from "./Icons";
import { profileApi } from "../api/endpoints";
import GlobalSearchModal from "../pages/GlobalSearchModal";

export default function Topbar({ title, breadcrumb }) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("Chime playback blocked:", e);
    }
  };

  useEffect(() => {
    if (!user) return;

    let prevCount = null;

    const checkNotifications = async () => {
      try {
        const { data } = await profileApi.notifications();
        const unread = data.filter((n) => !n.is_read).length;
        
        if (prevCount !== null && unread > prevCount) {
          playChime();
        }
        
        prevCount = unread;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [user]);

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const showBack = !["/dashboard", "/doctor", "/admin", "/login", "/register", "/"].includes(location.pathname);

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="icon-btn"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
              padding: 0,
              boxShadow: "none",
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              cursor: "pointer",
            }}
            title="Go back"
          >
            ←
          </button>
        )}
        <div>
          {breadcrumb && <div className="breadcrumb">{breadcrumb}</div>}
          <h1 style={{ margin: 0 }}>{title}</h1>
        </div>

        {/* Global Search Bar Trigger */}
        <div
          onClick={() => setShowSearch(true)}
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 14px",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 240,
          }}
        >
          <span>🔍</span> Search reports, clinics, doctors...
        </div>
      </div>

      <div className="topbar-actions">
        <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        <button className="icon-btn" onClick={() => navigate("/notifications")} title="Notifications" style={{ position: "relative" }}>
          <BellIcon />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--danger)",
              }}
            />
          )}
        </button>
        <div className="avatar" title={user?.full_name} onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>
          {initials}
        </div>
      </div>

      {showSearch && <GlobalSearchModal onClose={() => setShowSearch(false)} />}
    </header>
  );
}
