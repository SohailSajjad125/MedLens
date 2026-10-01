import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { reportApi } from "../api/endpoints";
import { FileIcon, HealthIcon } from "../components/Icons";

export default function Timeline() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    reportApi
      .timeline()
      .then(({ data }) => setEvents(data))
      .finally(() => setLoading(false));
  }, []);

  const filteredEvents = events.filter((e) => {
    if (filterType === "all") return true;
    return e.type === filterType;
  });

  return (
    <DashboardLayout breadcrumb="Timeline" title="Medical History Timeline">
      <div className="section-title" style={{ marginBottom: 20 }}>
        <h3>Chronological health events</h3>
        <div style={{ display: "flex", gap: 10 }}>
          {["all", "lab_report", "prescription"].map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${filterType === t ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setFilterType(t)}
            >
              {t === "all" ? "All Events" : t === "lab_report" ? "Lab Reports" : "Prescriptions"}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="skeleton" style={{ height: 350 }} />}

      {!loading && filteredEvents.length === 0 && (
        <div className="neo-card empty-state">
          <HealthIcon width={40} height={40} />
          <p>No health events recorded in your history yet.</p>
        </div>
      )}

      {!loading && filteredEvents.length > 0 && (
        <div style={{ position: "relative", paddingLeft: 30, marginLeft: 15 }}>
          {/* Vertical Timeline Bar */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 8,
              bottom: 8,
              width: 3,
              background: "linear-gradient(180deg, var(--accent-teal), var(--accent-violet))",
              borderRadius: 2,
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {filteredEvents.map((e) => (
              <div key={e.id} style={{ position: "relative" }}>
                {/* Timeline Dot Indicator */}
                <div
                  style={{
                    position: "absolute",
                    left: -37,
                    top: 4,
                    width: 17,
                    height: 17,
                    borderRadius: "50%",
                    background: e.type === "prescription" ? "var(--accent-violet)" : "var(--accent-teal)",
                    border: "4px solid var(--bg-primary)",
                    boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                  }}
                />

                <div
                  className="neo-card clickable"
                  onClick={() => navigate(`/reports/${e.id}`)}
                  style={{ padding: 22, borderLeft: `4px solid ${e.type === "prescription" ? "var(--accent-violet)" : "var(--accent-teal)"}` }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <span className="mono" style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>
                      {e.date}
                    </span>
                    <span className={`badge ${e.severity === "urgent" ? "badge-urgent" : e.severity === "watch" ? "badge-watch" : "badge-normal"}`}>
                      {e.type === "prescription" ? "Prescription" : e.severity.toUpperCase()}
                    </span>
                  </div>

                  <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem" }}>
                    <FileIcon width={16} height={16} /> {e.title}
                  </h3>

                  <p style={{ margin: "8px 0 12px 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {e.summary}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      borderTop: "1px solid var(--glass-border)",
                      paddingTop: 10,
                    }}
                  >
                    <div>
                      <strong>Doctor:</strong> {e.doctor}
                    </div>
                    <div>
                      <strong>Hospital:</strong> {e.hospital}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
