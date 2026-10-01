import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import DashboardLayout from "../components/DashboardLayout";
import { reportApi } from "../api/endpoints";

const catThemes = {
  blood: {
    title: "Blood Test Trends",
    desc: "Hemoglobin, WBC, RBC, and Platelets tracker",
    metrics: [
      { key: "hemoglobin", color: "var(--danger)", label: "Hemoglobin (Hgb)" },
      { key: "wbc", color: "var(--accent-teal)", label: "WBC" },
      { key: "rbc", color: "var(--accent-violet)", label: "RBC" },
      { key: "platelets", color: "var(--warning)", label: "Platelets" },
    ],
  },
  liver: {
    title: "Liver Function Trends",
    desc: "ALT, AST, Bilirubin, and ALP levels",
    metrics: [
      { key: "alt", color: "#34D399", label: "ALT (SGPT)" },
      { key: "ast", color: "#3B82F6", label: "AST (SGOT)" },
      { key: "bilirubin", color: "#F59E0B", label: "Bilirubin" },
      { key: "alp", color: "#EC4899", label: "ALP" },
    ],
  },
  kidney: {
    title: "Kidney Function Trends",
    desc: "Creatinine, Urea, and Uric Acid levels",
    metrics: [
      { key: "creatinine", color: "var(--accent-violet)", label: "Creatinine" },
      { key: "urea", color: "var(--accent-teal)", label: "Urea" },
      { key: "uric acid", color: "var(--warning)", label: "Uric Acid" },
    ],
  },
  cholesterol: {
    title: "Cholesterol & Lipids",
    desc: "Total Cholesterol, HDL, LDL, and Triglycerides",
    metrics: [
      { key: "cholesterol", color: "#FFFFFF", label: "Total Cholesterol" },
      { key: "hdl", color: "var(--success)", label: "HDL (Good)" },
      { key: "ldl", color: "var(--danger)", label: "LDL (Bad)" },
      { key: "triglycerides", color: "var(--warning)", label: "Triglycerides" },
    ],
  },
  sugar: {
    title: "Blood Sugar Trends",
    desc: "Glucose & HbA1c tracking over time",
    metrics: [
      { key: "glucose", color: "var(--accent-teal)", label: "Fasting Glucose" },
      { key: "hba1c", color: "var(--accent-violet)", label: "HbA1c (%)" },
    ],
  },
  vitamins: {
    title: "Vitamins Profile",
    desc: "Vitamin D and Vitamin B12 levels",
    metrics: [
      { key: "vitamin d", color: "#F59E0B", label: "Vitamin D" },
      { key: "vitamin b12", color: "#3B82F6", label: "Vitamin B12" },
    ],
  },
};

export default function Analytics() {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("blood");

  useEffect(() => {
    reportApi
      .trends()
      .then(({ data }) => setTrends(data))
      .finally(() => setLoading(false));
  }, []);

  const currentCatData = trends?.[activeCat] || [];
  const currentTheme = catThemes[activeCat];

  return (
    <DashboardLayout breadcrumb="Analytics" title="Health Trends">
      <div className="tag-row" style={{ marginBottom: 24, overflowX: "auto", paddingBottom: 6 }}>
        {Object.entries(catThemes).map(([key, value]) => (
          <button
            key={key}
            className={`btn ${activeCat === key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveCat(key)}
            style={{ whiteSpace: "nowrap" }}
          >
            {value.title}
          </button>
        ))}
      </div>

      {loading && <div className="skeleton" style={{ height: 400 }} />}

      {!loading && (
        <div className="grid grid-2-1">
          <div className="neo-card" style={{ padding: 26, minHeight: 420 }}>
            <h3 style={{ marginBottom: 4 }}>{currentTheme.title}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 28 }}>
              {currentTheme.desc}
            </p>

            {currentCatData.length === 0 ? (
              <div
                style={{
                  height: 300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                }}
              >
                No sufficient lab values recorded for this category yet.
              </div>
            ) : (
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={currentCatData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="date"
                      stroke="var(--text-muted)"
                      style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}
                    />
                    <YAxis
                      stroke="var(--text-muted)"
                      style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-primary)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "0.82rem", paddingTop: 10 }} />
                    {currentTheme.metrics.map((m) => (
                      <Line
                        key={m.key}
                        type="monotone"
                        dataKey={m.key}
                        name={m.label}
                        stroke={m.color}
                        strokeWidth={2.5}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="neo-card" style={{ padding: 26 }}>
            <h3 style={{ marginBottom: 18 }}>Recorded Metrics</h3>
            {currentCatData.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Add more lab reports to generate trends.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {currentTheme.metrics.map((m) => {
                  const nonNulls = currentCatData.filter((d) => d[m.key] !== undefined);
                  const latestVal = nonNulls[nonNulls.length - 1]?.[m.key];
                  return (
                    <div
                      key={m.key}
                      className="neo-inset"
                      style={{
                        padding: "14px 18px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ display: "block" }}>{m.label}</strong>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          {nonNulls.length} records found
                        </span>
                      </div>
                      <div className="mono" style={{ fontSize: "1.25rem", color: m.color, fontWeight: 700 }}>
                        {latestVal ?? "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
