import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { adminApi } from "../api/endpoints";
import { AdminIcon, UserIcon, FileIcon, DoctorIcon } from "../components/Icons";

// Action badge color mapping
const ACTION_COLORS = {
  UPLOAD_REPORT:  { bg: "rgba(45,212,191,.12)",  color: "var(--accent-teal)" },
  DELETE_REPORT:  { bg: "rgba(239,68,68,.12)",   color: "var(--danger)" },
  SHARE_REPORT:   { bg: "rgba(124,106,232,.12)", color: "var(--accent-violet)" },
  REVOKE_SHARE:   { bg: "rgba(245,181,76,.12)",  color: "var(--warning)" },
  ADD_DOCTOR_NOTES: { bg: "rgba(52,211,153,.12)", color: "var(--success)" },
  TRANSLATE_REPORT: { bg: "rgba(99,179,237,.12)", color: "#63b3ed" },
};

function ActionBadge({ action }) {
  const style = ACTION_COLORS[action] ?? { bg: "rgba(160,160,180,.12)", color: "var(--text-muted)" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        background: style.bg,
        color: style.color,
        whiteSpace: "nowrap",
      }}
    >
      {action}
    </span>
  );
}

export default function AdminDashboard() {
  const { tab = "overview" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  // API Key management state
  const [apiKeyInfo, setApiKeyInfo] = useState({ configured: false, masked_key: null, model: "" });
  const [newApiKey, setNewApiKey] = useState("");
  const [keyUpdateSuccess, setKeyUpdateSuccess] = useState("");
  const [keyUpdateError, setKeyUpdateError] = useState("");
  const [updatingKey, setUpdatingKey] = useState(false);

  const [authError, setAuthError] = useState(false);

  const loadData = () => {
    setAuthError(false);
    Promise.all([
      adminApi.stats(),
      adminApi.users(),
      adminApi.feedback(),
      adminApi.auditLogs(),
      adminApi.getApiKey(),
    ])
      .then(([statsRes, usersRes, feedbackRes, auditRes, keyRes]) => {
        setStats(statsRes.data);
        setUsers(usersRes.data);
        setFeedbackList(feedbackRes.data);
        setAuditLogs(auditRes.data);
        setApiKeyInfo(keyRes.data);
      })
      .catch((err) => {
        if (err?.response?.status === 403) {
          setAuthError(true);
        }
      });
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam) {
      setSelectedRole(roleParam);
    } else {
      setSelectedRole("all");
    }
  }, [searchParams]);

  const handleRoleChange = async (userId, roleName) => {
    try {
      await adminApi.updateRole(userId, roleName);
      setActionMsg("User role updated successfully.");
      loadData();
      setTimeout(() => setActionMsg(""), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusToggle = async (userId, isActive) => {
    try {
      if (isActive) {
        await adminApi.deactivate(userId);
        setActionMsg("User deactivated.");
      } else {
        await adminApi.reactivate(userId);
        setActionMsg("User reactivated.");
      }
      loadData();
      setTimeout(() => setActionMsg(""), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFeedbackResolve = async (feedbackId) => {
    try {
      await adminApi.updateFeedback(feedbackId, "resolved");
      setActionMsg("Feedback resolved.");
      loadData();
      setTimeout(() => setActionMsg(""), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApiKeySubmit = async (e) => {
    e.preventDefault();
    setKeyUpdateSuccess("");
    setKeyUpdateError("");
    setUpdatingKey(true);
    try {
      const { data } = await adminApi.updateApiKey(newApiKey);
      setKeyUpdateSuccess(data.message);
      setNewApiKey("");
      loadData();
    } catch (err) {
      setKeyUpdateError(err.response?.data?.detail || "Failed to update API key.");
    } finally {
      setUpdatingKey(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === "all" || u.role_name === selectedRole;
    return matchesQuery && matchesRole;
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    const q = auditSearch.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.user_email?.toLowerCase().includes(q) ||
      log.user_name?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q)
    );
  });

  const breadcrumbText = tab === "overview" ? "Overview" : tab.toUpperCase();
  const titleText =
    tab === "overview"
      ? "System Overview"
      : tab === "users"
      ? "User Management"
      : tab === "audit"
      ? "Audit Trail"
      : tab === "feedback"
      ? "User Feedback"
      : tab === "api-key"
      ? "API Key Settings"
      : "Admin Dashboard";

  return (
    <DashboardLayout breadcrumb={breadcrumbText} title={titleText}>
      {/* 403 Access Denied — wrong account logged in */}
      {authError && (
        <div
          style={{
            background: "rgba(239,68,68,.08)",
            border: "1px solid rgba(239,68,68,.3)",
            borderRadius: "var(--radius-sm)",
            padding: "20px 24px",
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div>
            <strong style={{ color: "var(--danger)", display: "block", marginBottom: 4 }}>
              ⚠️ Access Denied (403)
            </strong>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
              Your current session is not an admin account. Please log out and sign in with your admin credentials.
            </span>
          </div>
          <button
            className="btn btn-danger-ghost"
            onClick={() => {
              localStorage.removeItem("medlens_token");
              window.location.href = "/login";
            }}
          >
            Log out &amp; Re-login
          </button>
        </div>
      )}

      {actionMsg && (
        <div
          className="auth-error"
          style={{
            marginBottom: 20,
            background: "rgba(52,211,153,.1)",
            borderColor: "rgba(52,211,153,.3)",
            color: "var(--success)",
            textAlign: "center",
          }}
        >
          {actionMsg}
        </div>
      )}

      {/* Clickable Stats cards redirect to sub-routes */}
      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        <div className="neo-card stat-card clickable" onClick={() => navigate("/admin/users")}>
          <div className="stat-icon" style={{ background: "rgba(45,212,191,.14)", color: "var(--accent-teal)" }}>
            <UserIcon />
          </div>
          <div className="stat-value">{stats?.total_users ?? "—"}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="neo-card stat-card clickable" onClick={() => navigate("/admin/audit")}>
          <div className="stat-icon" style={{ background: "rgba(124,106,232,.14)", color: "var(--accent-violet)" }}>
            <FileIcon />
          </div>
          <div className="stat-value">{stats?.total_reports ?? "—"}</div>
          <div className="stat-label">Total Reports</div>
        </div>
        <div className="neo-card stat-card clickable" onClick={() => navigate("/admin/audit")}>
          <div className="stat-icon" style={{ background: "rgba(52,211,153,.14)", color: "var(--success)" }}>
            <AdminIcon />
          </div>
          <div className="stat-value">{stats?.total_ai_summaries ?? "—"}</div>
          <div className="stat-label">AI Analyses</div>
        </div>
        <div className="neo-card stat-card clickable" onClick={() => navigate("/admin/users?role=doctor")}>
          <div className="stat-icon" style={{ background: "rgba(245,181,76,.14)", color: "var(--warning)" }}>
            <DoctorIcon />
          </div>
          <div className="stat-value">{stats?.total_doctors ?? "—"}</div>
          <div className="stat-label">Registered Doctors</div>
        </div>
      </div>

      {/* ── System Health (Overview) ───────────────────────── */}
      {tab === "overview" && (
        <div className="neo-card" style={{ padding: 26 }}>
          <h3 style={{ marginBottom: 10 }}>Platform Status</h3>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
            All core services (FastAPI REST API, MySQL Database, OCR Parser engine, Groq LLM API) are fully functional and reporting green status.
          </p>

          <div className="grid grid-3" style={{ gap: 14 }}>
            <div className="neo-inset" style={{ padding: 16 }}>
              <strong>REST API</strong>
              <div style={{ color: "var(--success)", fontWeight: 600, fontSize: "0.85rem", marginTop: 4 }}>ONLINE (200 OK)</div>
            </div>
            <div className="neo-inset" style={{ padding: 16 }}>
              <strong>OCR Pipeline</strong>
              <div style={{ color: "var(--success)", fontWeight: 600, fontSize: "0.85rem", marginTop: 4 }}>ONLINE (PyMuPDF)</div>
            </div>
            <div className="neo-inset" style={{ padding: 16 }}>
              <strong>Groq AI Engine</strong>
              <div style={{ color: "var(--success)", fontWeight: 600, fontSize: "0.85rem", marginTop: 4 }}>
                {apiKeyInfo.configured ? "ONLINE" : "OFFLINE (No key)"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── User Management ───────────────────────────────── */}
      {tab === "users" && (
        <div className="neo-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
            <input
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: 200,
                background: "var(--bg-primary)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 14px",
                color: "var(--text-primary)",
              }}
            />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
                padding: "8px 14px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <option value="all">All Roles</option>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--glass-border)" }}>
                  {["Name", "Email", "Role", "Status", "Joined", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "14px 20px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "14px 20px" }}>{u.full_name}</td>
                    <td style={{ padding: "14px 20px", color: "var(--text-secondary)" }}>{u.email}</td>
                    <td style={{ padding: "12px 20px" }}>
                      <select
                        value={u.role_name}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--text-primary)",
                          padding: "4px 8px",
                          borderRadius: 4,
                        }}
                      >
                        <option value="patient">Patient</option>
                        <option value="doctor">Doctor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span className={`badge ${u.is_active ? "badge-normal" : "badge-urgent"}`}>
                        {u.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", color: "var(--text-muted)" }}>
                      {u.created_at?.slice(0, 10)}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <button
                        className={`btn btn-sm ${u.is_active ? "btn-danger-ghost" : "btn-primary"}`}
                        onClick={() => handleStatusToggle(u.id, u.is_active)}
                      >
                        {u.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── User Feedback ─────────────────────────────────── */}
      {tab === "feedback" && (
        <div className="neo-card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>User feedback &amp; Support logs</h3>
          {feedbackList.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No support feedback messages found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {feedbackList.map((f) => (
                <div
                  key={f.id}
                  className="neo-inset"
                  style={{
                    padding: "18px 22px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <strong>{f.subject}</strong>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{f.created_at?.slice(0, 10)}</span>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: 8 }}>{f.message}</p>
                    <span style={{ fontSize: "0.76rem", color: "var(--accent-teal)" }}>Sent by: {f.user_email}</span>
                  </div>
                  <div style={{ marginLeft: 20 }}>
                    {f.status === "open" ? (
                      <button className="btn btn-primary btn-sm" onClick={() => handleFeedbackResolve(f.id)}>
                        Mark Resolved
                      </button>
                    ) : (
                      <span className="badge badge-normal" style={{ textTransform: "capitalize" }}>{f.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Audit Trail ───────────────────────────────────── */}
      {tab === "audit" && (
        <div className="neo-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ margin: 0 }}>Platform Audit Trail</h3>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.83rem" }}>
                Most recent {auditLogs.length} system actions — updated on page load
              </p>
            </div>
            <input
              id="audit-search-input"
              placeholder="Filter by action, user, or details…"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              style={{
                minWidth: 260,
                background: "var(--bg-primary)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 14px",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {filteredAuditLogs.length === 0 ? (
            <div
              className="neo-inset"
              style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-muted)" }}
            >
              {auditSearch
                ? "No audit logs match your filter."
                : "No audit events recorded yet. Start using the platform to generate activity logs."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--glass-border)" }}>
                    {["#", "Action", "User", "Details", "IP Address", "Timestamp"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 16px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.map((log, idx) => (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: "1px solid var(--glass-border)",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <ActionBadge action={log.action} />
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{log.user_name}</div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{log.user_email}</div>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--text-secondary)",
                          fontSize: "0.83rem",
                          maxWidth: 300,
                        }}
                      >
                        {log.details || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {log.ip_address || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── API Key Settings ──────────────────────────────── */}
      {tab === "api-key" && (
        <div className="neo-card" style={{ padding: 26 }}>
          <h3 style={{ marginBottom: 10 }}>Groq API Key Settings</h3>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
            Configure and maintain the Groq AI API Key. If the key expires (e.g., after 30 days), paste a new key below to immediately restore service.
          </p>

          <div className="neo-inset" style={{ padding: 18, marginBottom: 24 }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Status:</strong>{" "}
              <span style={{ color: apiKeyInfo.configured ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
                {apiKeyInfo.configured ? "CONFIGURED & ACTIVE" : "MISSING"}
              </span>
            </div>
            {apiKeyInfo.configured && apiKeyInfo.masked_key && (
              <div style={{ marginBottom: 8 }}>
                <strong>Current Key:</strong> <code className="mono">{apiKeyInfo.masked_key}</code>
              </div>
            )}
            <div>
              <strong>In-Use Model:</strong> <code className="mono">{apiKeyInfo.model || "llama-3.3-70b-versatile"}</code>
            </div>
          </div>

          {keyUpdateError && <div className="auth-error" style={{ marginBottom: 14 }}>{keyUpdateError}</div>}
          {keyUpdateSuccess && (
            <div
              className="auth-error"
              style={{
                marginBottom: 14,
                background: "rgba(52,211,153,.1)",
                borderColor: "rgba(52,211,153,.3)",
                color: "var(--success)",
              }}
            >
              {keyUpdateSuccess}
            </div>
          )}

          <form onSubmit={handleApiKeySubmit}>
            <div className="field">
              <label>Enter New Groq API Key</label>
              <input
                type="password"
                required
                placeholder="Paste Groq API Key (gsk_...)"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 14px",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <button className="btn btn-primary" disabled={updatingKey}>
              {updatingKey ? "Updating API Key…" : "Save New API Key"}
            </button>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
