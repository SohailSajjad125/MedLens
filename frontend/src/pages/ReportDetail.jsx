import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { reportApi, chatApi, doctorApi } from "../api/endpoints";
import { API_BASE_URL } from "../api/client";
import { AlertIcon, ChatIcon, DownloadIcon, ShareIcon } from "../components/Icons";
import TTSButton from "../components/TTSButton";
import ShareReportModal from "../components/ShareReportModal";
import { useAuth } from "../context/AuthContext";

export default function ReportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("summary");

  const [translatedSummary, setTranslatedSummary] = useState("");
  const [translating, setTranslating] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  // Doctor notes state
  const [doctorNotes, setDoctorNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesMsg, setNotesMsg] = useState("");

  const isDoctor = user?.role_name === "doctor";

  const loadData = () => {
    reportApi
      .detail(id)
      .then(({ data }) => {
        setReport(data);
        if (data.translated_summary) {
          setTranslatedSummary(data.translated_summary);
        }
        if (data.category === "prescription") {
          setTab("prescription");
        }
      })
      .finally(() => setLoading(false));
  };

  const loadDoctorNotes = async () => {
    try {
      const { data } = await doctorApi.getNotes(id);
      setDoctorNotes(data.notes);
    } catch (err) {
      console.warn("Could not load doctor notes for this report:", err);
    }
  };

  useEffect(() => {
    loadData();
    // Both doctors and patients can access the notes endpoint (authorized check in backend)
    loadDoctorNotes();
  }, [id, user]);

  const handleTranslate = async () => {
    if (translatedSummary) return;
    setTranslating(true);
    try {
      const { data } = await reportApi.translate(id);
      setTranslatedSummary(data.translated_summary);
    } catch (err) {
      console.error(err);
    } finally {
      setTranslating(false);
    }
  };

  const handleSaveDoctorNotes = async () => {
    setSavingNotes(true);
    setNotesMsg("");
    try {
      await doctorApi.saveNotes(id, doctorNotes);
      setNotesMsg("Notes saved successfully.");
      setTimeout(() => setNotesMsg(""), 2000);
    } catch (err) {
      setNotesMsg("Failed to save notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  const suggested = (() => {
    try {
      return report?.ai_summary?.suggested_questions
        ? JSON.parse(report.ai_summary.suggested_questions)
        : [];
    } catch {
      return [];
    }
  })();

  const prescriptionInfo = (() => {
    try {
      return report?.prescription_info ? JSON.parse(report.prescription_info) : null;
    } catch {
      return null;
    }
  })();

  const askQuestion = async (q) => {
    const text = q ?? question;
    if (!text.trim()) return;
    setAsking(true);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setQuestion("");
    try {
      const { data } = await chatApi.ask({ session_id: sessionId, report_id: Number(id), question: text });
      setSessionId(data.session_id);
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, something went wrong answering that." }]);
    } finally {
      setAsking(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout breadcrumb="Reports" title="Loading record…">
        <div className="skeleton" style={{ height: 400 }} />
      </DashboardLayout>
    );
  }

  const isPrescription = report.category === "prescription";

  return (
    <DashboardLayout breadcrumb="Reports" title={report.title}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <span className={`badge badge-${report.ai_summary?.severity_level || "normal"}`}>
          {isPrescription ? "PRESCRIPTION" : (report.ai_summary?.severity_level || "normal").toUpperCase()}
        </span>
        <a className="btn btn-ghost" href={`${API_BASE_URL}/${report.file_path || ""}`} target="_blank" rel="noreferrer">
          <DownloadIcon width={16} height={16} /> View original file
        </a>
        {!isDoctor && (
          <button className="btn btn-ghost" onClick={() => setShowShare(true)}>
            <ShareIcon width={16} height={16} /> Share with Doctor
          </button>
        )}
      </div>

      <div className="grid grid-2-1">
        <div>
          <div className="tag-row" style={{ marginBottom: 18 }}>
            {isPrescription ? (
              <>
                <button
                  className={`btn ${tab === "prescription" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setTab("prescription")}
                  style={{ padding: "9px 18px", fontSize: "0.85rem" }}
                >
                  Medications
                </button>
                <button
                  className={`btn ${tab === "summary" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setTab("summary")}
                  style={{ padding: "9px 18px", fontSize: "0.85rem" }}
                >
                  AI Instructions
                </button>
              </>
            ) : (
              <>
                <button
                  className={`btn ${tab === "summary" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setTab("summary")}
                  style={{ padding: "9px 18px", fontSize: "0.85rem" }}
                >
                  AI Summary
                </button>
                <button
                  className={`btn ${tab === "values" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setTab("values")}
                  style={{ padding: "9px 18px", fontSize: "0.85rem" }}
                >
                  Lab Values
                </button>
              </>
            )}
            <button
              className={`btn ${tab === "extracted" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setTab("extracted")}
              style={{ padding: "9px 18px", fontSize: "0.85rem" }}
            >
              Extracted Text
            </button>
          </div>

          {tab === "summary" && (
            <div className="neo-card" style={{ padding: 26 }}>
              {/* Doctor Notes Display for Patients */}
              {!isDoctor && doctorNotes && (
                <div
                  className="neo-inset"
                  style={{
                    padding: "16px 20px",
                    background: "rgba(52, 211, 153, 0.08)",
                    borderLeft: "4px solid var(--success)",
                    marginBottom: 24,
                  }}
                >
                  <strong style={{ fontSize: "1rem", color: "var(--success)", display: "block", marginBottom: 6 }}>
                    🩺 Doctor Remarks / Advice
                  </strong>
                  <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                    {doctorNotes}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0 }}>AI Summary</h3>
                <div style={{ display: "flex", gap: 10 }}>
                  <TTSButton text={report.ai_summary?.summary_text || ""} lang="en" />
                  <button className="btn btn-ghost" onClick={handleTranslate} disabled={translating}>
                    {translating ? "Translating…" : translatedSummary ? "Urdu Ready" : "Translate to Urdu"}
                  </button>
                </div>
              </div>

              <p style={{ marginBottom: 20, lineHeight: 1.6 }}>
                {report.ai_summary?.summary_text || "AI summary is still processing."}
              </p>

              {translatedSummary && (
                <div
                  className="neo-inset"
                  style={{
                    padding: "16px 20px",
                    background: "rgba(124, 106, 232, 0.08)",
                    borderLeft: "4px solid var(--accent-violet)",
                    marginBottom: 24,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <strong style={{ fontSize: "1rem", color: "var(--accent-violet)" }}>Urdu Translation (اردو ترجمہ)</strong>
                    <TTSButton text={translatedSummary} lang="ur" />
                  </div>
                  <p style={{ fontSize: "1.05rem", direction: "rtl", textAlign: "right", lineHeight: 1.8 }}>
                    {translatedSummary}
                  </p>
                </div>
              )}

              {report.ai_summary?.simplified_explanation && (
                <>
                  <h3 style={{ marginBottom: 10 }}>In simple terms</h3>
                  <p style={{ marginBottom: 20, lineHeight: 1.6 }}>{report.ai_summary.simplified_explanation}</p>
                </>
              )}

              {suggested.length > 0 && !isDoctor && (
                <>
                  <h3 style={{ marginBottom: 10 }}>Questions to ask your doctor</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {suggested.map((q, i) => (
                      <div
                        key={i}
                        className="neo-inset"
                        style={{ padding: "12px 16px", cursor: "pointer" }}
                        onClick={() => askQuestion(q)}
                      >
                        {q}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "prescription" && (
            <div className="neo-card" style={{ padding: 26 }}>
              <h3 style={{ marginBottom: 10 }}>Medications List</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 20 }}>
                Here are the medicines identified on your prescription.
              </p>

              {prescriptionInfo?.medicines?.length === 0 && <p>No medicines were identified on this prescription.</p>}

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {prescriptionInfo?.medicines?.map((med, i) => (
                  <div
                    key={i}
                    className="neo-inset"
                    style={{
                      padding: "16px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "1.1rem", color: "var(--accent-teal)" }}>{med.name}</strong>
                      <span className="badge badge-normal">{med.dosage}</span>
                    </div>
                    <div style={{ fontSize: "0.88rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, color: "var(--text-secondary)" }}>
                      <div>
                        <strong>Frequency:</strong> {med.frequency}
                      </div>
                      <div>
                        <strong>Duration:</strong> {med.duration}
                      </div>
                    </div>
                    {med.side_effects && (
                      <div style={{ fontSize: "0.82rem", background: "rgba(245, 181, 76, 0.08)", padding: "8px 12px", borderRadius: 4, color: "var(--warning)", border: "1px solid rgba(245, 181, 76, 0.2)" }}>
                        ⚠️ {med.side_effects}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {prescriptionInfo?.instructions && (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ marginBottom: 10 }}>General Instructions</h3>
                  <p style={{ background: "var(--bg-elevated)", padding: 16, borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {prescriptionInfo.instructions}
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "extracted" && (
            <div className="neo-card" style={{ padding: 26 }}>
              <h3 style={{ marginBottom: 12 }}>Extracted text (OCR)</h3>
              <pre className="mono" style={{ whiteSpace: "pre-wrap", color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                {report.extracted_text || "No text extracted yet."}
              </pre>
            </div>
          )}

          {tab === "values" && (
            <div className="neo-card" style={{ padding: 26 }}>
              <h3 style={{ marginBottom: 16 }}>Lab values</h3>
              {report.values?.length === 0 && <p>No structured values were detected in this report.</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {report.values?.map((v, i) => (
                  <div
                    key={i}
                    className="neo-inset"
                    style={{
                      padding: "14px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong>{v.test_name}</strong>
                      {v.reference_range && (
                        <div className="report-meta">Normal range: {v.reference_range} {v.unit}</div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="mono" style={{ fontSize: "1.1rem" }}>
                        {v.value} {v.unit}
                      </span>
                      {v.is_abnormal && (
                        <span className="badge badge-urgent">
                          <AlertIcon width={12} height={12} /> Abnormal
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right side: Chat panel for patients, Clinical Notes panel for doctors */}
        {isDoctor ? (
          <div className="neo-card animate-slide" style={{ padding: 24, height: "fit-content" }}>
            <h3 style={{ marginBottom: 6 }}>Clinical Notes</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginBottom: 14 }}>
              Write observations, remarks, or medical advice. The patient will see your comments instantly on their dashboard.
            </p>

            <textarea
              rows={8}
              placeholder="Type doctor remarks/notes here…"
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-primary)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-sm)",
                padding: 12,
                color: "var(--text-primary)",
                fontSize: "0.88rem",
                marginBottom: 14,
                resize: "vertical"
              }}
            />

            <button className="btn btn-primary btn-block" onClick={handleSaveDoctorNotes} disabled={savingNotes}>
              {savingNotes ? "Saving notes…" : "Save Notes"}
            </button>
            {notesMsg && (
              <p style={{ marginTop: 8, fontSize: "0.8rem", color: "var(--success)", textAlign: "center" }}>
                {notesMsg}
              </p>
            )}
          </div>
        ) : (
          <div className="neo-card chat-panel">
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10 }}>
              <ChatIcon />
              <strong>Ask about this report</strong>
            </div>
            <div className="chat-messages">
              {messages.length === 0 && (
                <p style={{ fontSize: "0.85rem" }}>
                  Ask anything about this report — e.g. "What does my creatinine level mean?"
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.role}`}>
                  {m.content}
                </div>
              ))}
              {asking && <div className="chat-bubble assistant">Thinking…</div>}
            </div>
            <div className="chat-input-row">
              <input
                placeholder="Type your question…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askQuestion()}
              />
              <button className="btn btn-primary" onClick={() => askQuestion()} disabled={asking}>
                Ask
              </button>
            </div>
          </div>
        )}
      </div>

      {showShare && (
        <ShareReportModal reportId={report.id} onClose={() => setShowShare(false)} />
      )}
    </DashboardLayout>
  );
}
