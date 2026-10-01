import { NavLink, useLocation } from "react-router-dom";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";
import {
  HomeIcon,
  UploadIcon,
  FileIcon,
  ChatIcon,
  CompareIcon,
  UserIcon,
  FamilyIcon,
  DoctorIcon,
  AdminIcon,
  SettingsIcon,
  LogoutIcon,
  HealthIcon,
  BellIcon,
  AlertIcon,
} from "./Icons";

// ─── Patient links ──────────────────────────────────────────────
const patientLinks = [
  { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { to: "/reports", label: "My Reports", icon: FileIcon },
  { to: "/upload", label: "Upload Report", icon: UploadIcon },
  { to: "/compare", label: "Compare Reports", icon: CompareIcon },
  { to: "/analytics", label: "Trends & Charts", icon: HealthIcon },
  { to: "/timeline", label: "Health Timeline", icon: FileIcon },
  { to: "/chat", label: "AI Chat Assistant", icon: ChatIcon },
  { to: "/family", label: "Family Members", icon: FamilyIcon },
  { to: "/profile", label: "Health Profile", icon: UserIcon },
];

// ─── Doctor links ────────────────────────────────────────────────
const doctorLinks = [
  { to: "/doctor", label: "Patient Reports", icon: DoctorIcon },
  { to: "/doctor/shared", label: "Shared Records", icon: FileIcon },
  { to: "/doctor/patients", label: "My Patients", icon: UserIcon },
  { to: "/doctor/analytics", label: "Clinical Analytics", icon: HealthIcon },
  { to: "/chat", label: "AI Assistant", icon: ChatIcon },
  { to: "/notifications", label: "Notifications", icon: BellIcon },
];

// ─── Admin links ─────────────────────────────────────────────────
const adminLinks = [
  { to: "/admin", label: "System Overview", icon: AdminIcon },
  { to: "/admin/users", label: "User Management", icon: UserIcon },
  { to: "/admin/audit", label: "Audit Trail", icon: AlertIcon },
  { to: "/admin/feedback", label: "User Feedback", icon: ChatIcon },
  { to: "/admin/api-key", label: "API Key Settings", icon: SettingsIcon },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const role = user?.role_name;
  const location = useLocation();

  const links =
    role === "admin" ? adminLinks : role === "doctor" ? doctorLinks : patientLinks;

  // For admin, match active tab based on path suffix
  const isAdminLinkActive = (to) => {
    if (role !== "admin") return false;
    if (to === "/admin") return location.pathname === "/admin" && !location.search;
    return location.pathname === to || location.search.includes(to.split("/admin/")[1]);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Logo size={30} />
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {links.map(({ to, label, icon: Icon }) =>
          role === "admin" ? (
            <NavLink
              key={to}
              to={to}
              end={to === "/admin"}
              className={({ isActive }) =>
                `nav-link ${isActive || (to !== "/admin" && location.pathname.startsWith(to)) ? "active" : ""}`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ) : (
            <NavLink
              key={to}
              to={to}
              end={to === "/doctor"}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <Icon />
              {label}
            </NavLink>
          )
        )}
      </nav>

      <div className="sidebar-footer">
        {role !== "admin" && (
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <SettingsIcon />
            Settings
          </NavLink>
        )}
        <div className="nav-link" onClick={logout} style={{ cursor: "pointer" }}>
          <LogoutIcon />
          Log out
        </div>
      </div>
    </aside>
  );
}
