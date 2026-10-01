import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { reportApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import {
  FileIcon,
  AlertIcon,
  ChatIcon,
  UploadIcon,
  CompareIcon,
  StarIcon,
  HeartIcon,
} from "../components/Icons";

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadReports = () => {
    reportApi.list().then(({ data }) => {
      setReports(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 8000); // Live update every 8s
    return () => clearInterval(interval);
  }, []);

  const total = reports.length;
  const processed = reports.filter((r) => r.is_processed).length;
  const favorites = reports.filter((r) => r.is_favorite).length;
  const recent = reports.slice(0, 5);

  const quickActions = [
    { label: "Upload Report", icon: UploadIcon, to: "/upload", cls: "btn-primary" },
    { label: "Compare Reports", icon: CompareIcon, to: "/compare", cls: "btn-violet" },
    { label: "Ask AI Assistant", icon: ChatIcon, to: "/chat", cls: "btn-ghost" },
  ];

  return (
    <DashboardLayout breadcrumb="Overview" title={`Welcome back, ${user?.full_name?.split(" ")[0] || ""}`}>
      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        <div className="neo-card stat-card clickable" onClick={() => navigate("/reports")}>
          <div className="stat-icon" style={{ background: "rgba(45,212,191,.14)", color: "var(--accent-teal)" }}>
            <FileIcon />
          </div>
          <div className="stat-value">{loading ? "—" : total}</div>
          <div className="stat-label">Total Reports</div>
        </div>

        <div className="neo-card stat-card clickable" onClick={() => navigate("/reports")}>
          <div className="stat-icon" style={{ background: "rgba(124,106,232,.14)", color: "var(--accent-violet)" }}>
            <HeartIcon />
          </div>
          <div className="stat-value">{loading ? "—" : processed}</div>
          <div className="stat-label">AI-Analyzed Reports</div>
        </div>

        <div className="neo-card stat-card clickable" onClick={() => navigate("/reports?filter=favorites")}>
          <div className="stat-icon" style={{ background: "rgba(245,181,76,.14)", color: "var(--warning)" }}>
            <StarIcon />
          </div>
          <div className="stat-value">{loading ? "—" : favorites}</div>
          <div className="stat-label">Favorite Reports</div>
        </div>

        <div className="neo-card stat-card clickable" onClick={() => navigate("/chat")}>
          <div className="stat-icon" style={{ background: "rgba(242,96,122,.14)", color: "var(--danger)" }}>
            <AlertIcon />
          </div>
          <div className="stat-value">Ask AI</div>
          <div className="stat-label">Get instant answers</div>
        </div>
      </div>

      <div className="grid grid-2-1">
        <div>
          <div className="section-title">
            <h3>Recent Reports</h3>
            <span onClick={() => navigate("/reports")} style={{ cursor: "pointer", color: "var(--accent-teal)", fontSize: "0.85rem", fontWeight: 600 }}>
              View all →
            </span>
          </div>

          {loading && <div className="skeleton" style={{ height: 200 }} />}

          {!loading && recent.length === 0 && (
            <div className="neo-card empty-state">
              <FileIcon width={40} height={40} />
              <p>No reports yet. Upload your first medical report to get an AI summary.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate("/upload")}>
                Upload a report
              </button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {recent.map((r) => (
              <div
                key={r.id}
                className="neo-card report-card clickable"
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                onClick={() => navigate(`/reports/${r.id}`)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div className="report-icon">
                    <FileIcon />
                  </div>
                  <div>
                    <div className="report-title">{r.title}</div>
                    <div className="report-meta">
                      {r.report_type || "General"} · {r.hospital_name || "—"}
                    </div>
                  </div>
                </div>
                <span className={`badge ${r.is_processed ? "badge-normal" : "badge-watch"}`}>
                  {r.is_processed ? "Analyzed" : "Processing"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="section-title">
            <h3>Quick Actions</h3>
          </div>
          <div className="neo-card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            {quickActions.map(({ label, icon: Icon, to, cls }) => (
              <button key={to} className={`btn ${cls} btn-block`} onClick={() => navigate(to)}>
                <Icon width={18} height={18} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
