import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { reportApi } from "../api/endpoints";
import { CompareIcon } from "../components/Icons";

const trendColor = {
  improved: "var(--success)",
  worsened: "var(--danger)",
  unchanged: "var(--text-muted)",
  new: "var(--accent-violet)",
};

export default function Compare() {
  const [reports, setReports] = useState([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    reportApi.list().then(({ data }) => setReports(data));
  }, []);

  const handleCompare = async () => {
    if (!a || !b) return;
    setLoading(true);
    try {
      const { data } = await reportApi.compare(a, b);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout breadcrumb="Reports" title="Compare Reports">
      <div className="neo-card" style={{ padding: 24, marginBottom: 24 }}>
        <div className="grid grid-2" style={{ marginBottom: 16 }}>
          <div className="field">
            <label>Earlier report</label>
            <select value={a} onChange={(e) => setA(e.target.value)}>
              <option value="">Select a report…</option>
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} — {r.report_date || r.created_at?.slice(0, 10)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Later report</label>
            <select value={b} onChange={(e) => setB(e.target.value)}>
              <option value="">Select a report…</option>
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} — {r.report_date || r.created_at?.slice(0, 10)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleCompare} disabled={loading}>
          <CompareIcon width={16} height={16} /> {loading ? "Comparing…" : "Compare"}
        </button>
      </div>

      {result && (
        <div className="neo-card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 18 }}>Trend analysis</h3>
          {result.comparisons.length === 0 && <p>No shared lab values were found between these reports.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.comparisons.map((c, i) => (
              <div
                key={i}
                className="neo-inset"
                style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <strong>{c.test_name}</strong>
                <div className="mono" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--text-muted)" }}>{c.old_value ?? "—"}</span>
                  <span>→</span>
                  <span>{c.new_value ?? "—"}</span>
                  <span style={{ color: trendColor[c.trend], fontWeight: 700, textTransform: "capitalize" }}>
                    {c.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
