import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import DashboardLayout from "../components/DashboardLayout";
import { doctorApi } from "../api/endpoints";
import { FileIcon, DoctorIcon, UserIcon, ChatIcon, HealthIcon } from "../components/Icons";

const COLORS = ["var(--accent-teal)", "var(--accent-violet)", "var(--warning)", "var(--danger)", "#63b3ed", "#34d399"];

export default function DoctorDashboard() {
  const { tab = "workspace" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [patients, setPatients] = useState([]);
  const [sharedReports, setSharedReports] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [activeReportId, setActiveReportId] = useState(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesMsg, setNotesMsg] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  const loadInitialData = async () => {
    try {
      const patientsRes = await doctorApi.patients();
      setPatients(patientsRes.data);

      const reportsRes = await doctorApi.sharedReports();
      setSharedReports(reportsRes.data);

      // Handle query params for auto-selection (e.g. from shared list)
      const qPatientId = searchParams.get("patient_id");
      const qReportId = searchParams.get("report_id");

      if (qPatientId) {
        setSelectedPatientId(Number(qPatientId));
        if (qReportId) {
          setActiveReportId(Number(qReportId));
        }
      } else if (patientsRes.data.length > 0) {
        setSelectedPatientId(patientsRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(loadInitialData, 8000); // Live update every 8s
    return () => clearInterval(interval);
  }, [searchParams]);

  useEffect(() => {
    if (selectedPatientId) {
      setLoadingProfile(true);
      doctorApi
        .patientProfile(selectedPatientId)
        .then(({ data }) => {
          setPatientProfile(data);
          // If active report was requested in query param, load its notes, else reset notes
          const qReportId = searchParams.get("report_id");
          if (qReportId && data.shared_reports.some(r => r.id === Number(qReportId))) {
            loadNotes(Number(qReportId));
          } else {
            setActiveReportId(null);
            setNotes("");
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingProfile(false));
    }
  }, [selectedPatientId]);

  const loadNotes = async (reportId) => {
    setActiveReportId(reportId);
    setNotesMsg("");
    try {
      const { data } = await doctorApi.getNotes(reportId);
      setNotes(data.notes);
    } catch (err) {
      setNotes("");
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setNotesMsg("");
    try {
      await doctorApi.saveNotes(activeReportId, notes);
      setNotesMsg("Notes saved successfully.");
      setTimeout(() => setNotesMsg(""), 2000);
    } catch (err) {
      setNotesMsg("Failed to save notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  // Recharts Stats Calculations
  const severityData = (() => {
    const counts = { normal: 0, watch: 0, urgent: 0 };
    sharedReports.forEach((r) => {
      const sev = r.ai_summary?.severity_level || "normal";
      counts[sev] = (counts[sev] || 0) + 1;
    });
    return [
      { name: "Normal", value: counts.normal, color: "var(--success)" },
      { name: "Watch", value: counts.watch, color: "var(--warning)" },
      { name: "Urgent", value: counts.urgent, color: "var(--danger)" },
    ].filter((d) => d.value > 0);
  })();

  const categoryData = (() => {
    const counts = {};
    sharedReports.forEach((r) => {
      const cat = r.category || "general";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
    }));
  })();

  const filteredPatients = patients.filter(p => 
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const titleText = 
    tab === "workspace" ? "Patient Workspace" :
    tab === "shared" ? "All Shared Records" :
    tab === "patients" ? "Patient Directory" :
    tab === "analytics" ? "Clinical Insights & Analytics" : "Doctor Dashboard";

  return (
    <DashboardLayout breadcrumb="Doctor" title={titleText}>
      {/* Clickable Stats cards at top */}
      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        <div className="neo-card stat-card clickable" onClick={() => navigate("/doctor/patients")}>
          <div className="stat-icon" style={{ background: "rgba(124,106,232,.14)", color: "var(--accent-violet)" }}>
            <UserIcon />
          </div>
          <div className="stat-value">{loadingPatients ? "—" : patients.length}</div>
          <div className="stat-label">My Patients</div>
        </div>

        <div className="neo-card stat-card clickable" onClick={() => navigate("/doctor/shared")}>
          <div className="stat-icon" style={{ background: "rgba(45,212,191,.14)", color: "var(--accent-teal)" }}>
            <FileIcon />
          </div>
          <div className="stat-value">{loadingPatients ? "—" : sharedReports.length}</div>
          <div className="stat-label">Total Shared Records</div>
        </div>

        <div className="neo-card stat-card clickable" onClick={() => navigate("/doctor/analytics")}>
          <div className="stat-icon" style={{ background: "rgba(52,211,153,.14)", color: "var(--success)" }}>
            <HealthIcon />
          </div>
          <div className="stat-value">View</div>
          <div className="stat-label">Clinical Analytics</div>
        </div>

        <div className="neo-card stat-card clickable" onClick={() => navigate("/doctor")}>
          <div className="stat-icon" style={{ background: "rgba(242,96,122,.14)", color: "var(--danger)" }}>
            <ChatIcon />
          </div>
          <div className="stat-value">Workspace</div>
          <div className="stat-label">Consult & Add Remarks</div>
        </div>
      </div>

      {/* ── workspace tab ──────────────────────────────────── */}
      {tab === "workspace" && (
        <div className="grid grid-2-1" style={{ gap: 20 }}>
          <div>
            {loadingPatients && <div className="skeleton" style={{ height: 260 }} />}

            {!loadingPatients && patients.length === 0 && (
              <div className="neo-card empty-state">
                <DoctorIcon width={40} height={40} />
                <p>No patients have shared reports with you yet. Give patients your registration email to get shared records.</p>
              </div>
            )}

            {patientProfile && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Patient Info Card */}
                <div className="neo-card" style={{ padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div className="avatar" style={{ width: 44, height: 44, fontSize: "1.2rem" }}>
                      {patientProfile.patient.full_name[0]}
                    </div>
                    <div>
                      <h3 style={{ margin: 0 }}>{patientProfile.patient.full_name}</h3>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{patientProfile.patient.email}</span>
                    </div>
                  </div>

                  <div className="grid grid-3" style={{ gap: 12 }}>
                    <div className="neo-inset" style={{ padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Blood Group</div>
                      <strong style={{ fontSize: "1.1rem" }}>{patientProfile.health_profile.blood_group || "—"}</strong>
                    </div>
                    <div className="neo-inset" style={{ padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>BMI</div>
                      <strong style={{ fontSize: "1.1rem" }}>{patientProfile.health_profile.bmi || "—"}</strong>
                    </div>
                    <div className="neo-inset" style={{ padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Allergies</div>
                      <strong style={{ fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                        {patientProfile.health_profile.allergies || "None"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Shared Reports List */}
                <div>
                  <div className="section-title">
                    <h3>Shared Records ({patientProfile.shared_reports.length})</h3>
                  </div>

                  {patientProfile.shared_reports.length === 0 ? (
                    <div className="neo-card empty-state" style={{ padding: 30 }}>
                      No reports found for this patient.
                    </div>
                  ) : (
                    <div className="grid grid-2" style={{ gap: 14 }}>
                      {patientProfile.shared_reports.map((r) => (
                        <div
                          key={r.id}
                          className={`neo-card report-card clickable ${activeReportId === r.id ? "active-share-card" : ""}`}
                          onClick={() => loadNotes(r.id)}
                          style={{
                            padding: 18,
                            borderLeft: activeReportId === r.id ? "4px solid var(--accent-teal)" : "1px solid var(--glass-border)",
                          }}
                        >
                          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                            <div className="report-icon">
                              <FileIcon />
                            </div>
                            <div>
                              <strong style={{ fontSize: "0.95rem", display: "block" }}>{r.title}</strong>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{r.report_date || "—"}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/reports/${r.id}`);
                              }}
                            >
                              Open Report
                            </button>
                            <button className="btn btn-ghost btn-sm">Notes</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Patient Directory Sidebar inside workspace */}
            <div className="neo-card" style={{ padding: 20 }}>
              <h3 style={{ marginBottom: 12 }}>Patient Directory</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 220, overflowY: "auto" }}>
                {patients.map((p) => (
                  <div
                    key={p.id}
                    className={`neo-card clickable ${selectedPatientId === p.id ? "directory-active" : ""}`}
                    style={{
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: selectedPatientId === p.id ? "var(--bg-elevated)" : "var(--bg-primary)",
                      border: selectedPatientId === p.id ? "1px solid var(--accent-teal)" : "1px solid var(--glass-border)",
                    }}
                    onClick={() => setSelectedPatientId(p.id)}
                  >
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: "0.85rem" }}>
                      {p.full_name[0]}
                    </div>
                    <div>
                      <strong style={{ fontSize: "0.88rem", display: "block" }}>{p.full_name}</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes Panel */}
            {activeReportId && (
              <div className="neo-card animate-slide" style={{ padding: 22 }}>
                <h3 style={{ marginBottom: 6 }}>Clinical Notes</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginBottom: 14 }}>
                  Write observations or advice. Patient will see these comments instantly.
                </p>

                <textarea
                  rows={5}
                  placeholder="Type doctor remarks/notes here…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-sm)",
                    padding: 12,
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    marginBottom: 14,
                  }}
                />

                <button className="btn btn-primary btn-block" onClick={handleSaveNotes} disabled={savingNotes}>
                  {savingNotes ? "Saving notes…" : "Save Notes"}
                </button>
                {notesMsg && (
                  <p style={{ marginTop: 8, fontSize: "0.8rem", color: "var(--success)", textAlign: "center" }}>
                    {notesMsg}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── shared tab ─────────────────────────────────────── */}
      {tab === "shared" && (
        <div className="neo-card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>All Shared Records</h3>
          {sharedReports.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No shared records found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--glass-border)" }}>
                    {["Report Title", "Category", "Date", "Status", "Actions"].map((h) => (
                      <th key={h} style={{ padding: "14px 20px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sharedReports.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                      <td style={{ padding: "14px 20px" }}>
                        <strong style={{ fontSize: "0.92rem", display: "block" }}>{r.title}</strong>
                      </td>
                      <td style={{ padding: "14px 20px", textTransform: "capitalize", color: "var(--text-secondary)" }}>
                        {r.category || "General"}
                      </td>
                      <td style={{ padding: "14px 20px", color: "var(--text-muted)" }}>
                        {r.report_date || r.created_at?.slice(0, 10)}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span className={`badge ${r.is_processed ? "badge-normal" : "badge-watch"}`}>
                          {r.is_processed ? "Analyzed" : "Processing"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", display: "flex", gap: 10 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/reports/${r.id}`)}
                        >
                          View Report
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/doctor?patient_id=${r.user_id}&report_id=${r.id}`)}
                        >
                          Write Notes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── patients tab ───────────────────────────────────── */}
      {tab === "patients" && (
        <div className="neo-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3>My Patients Directory</h3>
            <input
              placeholder="Search patients by name or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: 260,
                background: "var(--bg-primary)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 14px",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {filteredPatients.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No patients found.</p>
          ) : (
            <div className="grid grid-3" style={{ gap: 16 }}>
              {filteredPatients.map((p) => (
                <div key={p.id} className="neo-inset" style={{ padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="avatar" style={{ width: 36, height: 36 }}>
                      {p.full_name[0]}
                    </div>
                    <div>
                      <strong style={{ fontSize: "0.95rem", display: "block" }}>{p.full_name}</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.email}</span>
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 10 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Joined: {p.joined_at?.slice(0, 10) || "—"}</span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm btn-block"
                    onClick={() => navigate(`/doctor?patient_id=${p.id}`)}
                  >
                    Open Workspace
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── analytics tab ──────────────────────────────────── */}
      {tab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="grid grid-2">
            {/* Severity Breakdown */}
            <div className="neo-card" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 14 }}>Severity Breakdown</h3>
              {severityData.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No data points available.</p>
              ) : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Category distribution */}
            <div className="neo-card" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 14 }}>Records Categories</h3>
              {categoryData.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No data points available.</p>
              ) : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={categoryData}>
                      <XAxis dataKey="name" stroke="var(--text-muted)" style={{ fontSize: "0.75rem" }} />
                      <YAxis stroke="var(--text-muted)" style={{ fontSize: "0.75rem" }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="var(--accent-teal)" radius={[4, 4, 0, 0]}>
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Recent Shared Activity */}
          <div className="neo-card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 14 }}>Recent Shared Activity</h3>
            {sharedReports.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No activity logs recorded yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sharedReports.slice(0, 5).map((r) => (
                  <div key={r.id} className="neo-inset" style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{r.title}</strong>
                      <div className="report-meta">Category: {r.category} · Shared by user_id {r.user_id}</div>
                    </div>
                    <span className="badge badge-normal">{r.report_date || "N/A"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
