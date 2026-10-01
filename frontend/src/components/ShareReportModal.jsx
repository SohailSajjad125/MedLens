import { useEffect, useState } from "react";
import { doctorApi } from "../api/endpoints";

export default function ShareReportModal({ reportId, onClose }) {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadShares = async () => {
    try {
      const { data } = await doctorApi.shares();
      // filter for this report
      setShares(data.filter((s) => s.report_id === reportId));
    } catch (err) {
      console.error(err);
    }
  };

  const loadDoctors = async () => {
    try {
      const { data } = await doctorApi.listDoctors();
      setDoctors(data);
      if (data.length > 0) {
        setSelectedDoctorId(data[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadShares();
    loadDoctors();
  }, [reportId]);

  const handleShare = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const { data } = await doctorApi.shareAll(selectedDoctorId);
      setSuccess(data.message);
      loadShares();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not share reports.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareId) => {
    if (!confirm("Revoke this doctor's access to this report?")) return;
    try {
      await doctorApi.revokeShare(shareId);
      setSuccess("Access revoked successfully.");
      loadShares();
    } catch (err) {
      setError("Failed to revoke access.");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        className="neo-card"
        style={{
          width: "100%",
          maxWidth: 500,
          padding: 28,
          position: "relative",
          animation: "scaleIn 0.2s ease-out",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "1.5rem",
            cursor: "pointer",
          }}
        >
          &times;
        </button>

        <h3 style={{ marginBottom: 8 }}>Share Report with Doctor</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 20 }}>
          Give a registered doctor secure access to view your reports and health profile.
        </p>

        {error && <div className="auth-error" style={{ marginBottom: 14 }}>{error}</div>}
        {success && (
          <div
            className="auth-error"
            style={{
              marginBottom: 14,
              background: "rgba(52,211,153,.1)",
              borderColor: "rgba(52,211,153,.3)",
              color: "var(--success)",
            }}
          >
            {success}
          </div>
        )}

        <form onSubmit={handleShare} style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label style={{ marginBottom: 6, display: "block" }}>Select Doctor</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-sm)",
                padding: "12px 14px",
                color: "var(--text-primary)",
              }}
            >
              {doctors.length === 0 ? (
                <option value="">No doctors available</option>
              ) : (
                doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.email})
                  </option>
                ))
              )}
            </select>
          </div>
          <button className="btn btn-primary btn-block" disabled={loading || !selectedDoctorId}>
            {loading ? "Sharing all records…" : "Send all reports & details to doctor"}
          </button>
        </form>

        <h4>Active Doctor Access</h4>
        <div
          style={{
            marginTop: 10,
            maxHeight: 180,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {shares.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontStyle: "italic" }}>
              This report has not been shared with any doctor yet.
            </p>
          ) : (
            shares.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div>
                  <strong style={{ fontSize: "0.88rem", display: "block" }}>{s.doctor_name}</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{s.doctor_email}</span>
                </div>
                <button className="btn btn-danger-ghost btn-sm" onClick={() => handleRevoke(s.id)}>
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
