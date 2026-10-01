import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { reportApi } from "../api/endpoints";

export default function GlobalSearchModal({ onClose }) {
  const [reports, setReports] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    reportApi.list().then(({ data }) => setReports(data));
  }, []);

  const results = reports.filter((r) => {
    // text query match
    const q = query.toLowerCase();
    const matchesQuery =
      !query ||
      r.title.toLowerCase().includes(q) ||
      r.hospital_name?.toLowerCase().includes(q) ||
      r.doctor_name?.toLowerCase().includes(q) ||
      r.report_type?.toLowerCase().includes(q);

    // category filter
    const matchesCategory = category === "all" || r.category === category;

    return matchesQuery && matchesCategory;
  });

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 80,
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        className="neo-card"
        style={{
          width: "100%",
          maxWidth: 650,
          padding: 24,
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          animation: "scaleIn 0.15s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            autoFocus
            placeholder="Search reports, doctor names, clinics, or test types…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: "var(--bg-primary)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-sm)",
              padding: "14px 18px",
              color: "var(--text-primary)",
              fontSize: "1rem",
            }}
          />
        </div>

        {/* Filters bar */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            borderBottom: "1px solid var(--glass-border)",
            paddingBottom: 14,
            fontSize: "0.85rem",
          }}
        >
          <div>
            <label style={{ marginRight: 6, color: "var(--text-muted)" }}>Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <option value="all">All</option>
              <option value="lab_report">Lab Reports</option>
              <option value="prescription">Prescriptions</option>
            </select>
          </div>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: 350, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {results.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              No matches found. Try searching for "CBC", "Chughtai Lab", or specific doctors.
            </div>
          ) : (
            results.map((r) => (
              <div
                key={r.id}
                onClick={() => {
                  navigate(`/reports/${r.id}`);
                  onClose();
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 18px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--glass-border)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                className="search-result-item"
              >
                <div>
                  <h4 style={{ fontSize: "0.95rem", marginBottom: 4 }}>{r.title}</h4>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {r.report_date || r.created_at?.slice(0, 10)} · {r.hospital_name || "General clinic"}
                  </span>
                </div>
                <span className={`badge ${r.category === "prescription" ? "badge-normal" : "badge-watch"}`}>
                  {r.category === "prescription" ? "Prescription" : "Lab Report"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
