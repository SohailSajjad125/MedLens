import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { reportApi } from "../api/endpoints";
import { UploadIcon, FileIcon } from "../components/Icons";

export default function UploadReport() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [meta, setMeta] = useState({
    title: "",
    category: "lab_report",
    hospital_name: "",
    doctor_name: "",
    report_date: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const pickFile = (f) => {
    setFile(f);
    if (!meta.title) setMeta((m) => ({ ...m, title: f.name.replace(/\.[^/.]+$/, "") }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.[0]) pickFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    Object.entries(meta).forEach(([k, v]) => v && formData.append(k, v));

    try {
      const { data } = await reportApi.upload(formData);
      navigate(`/reports/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout breadcrumb="Reports" title="Upload Medical Record">
      <div className="grid grid-2" style={{ alignItems: "flex-start" }}>
        <form onSubmit={handleSubmit} className="neo-card" style={{ padding: 28 }}>
          <div
            className={`upload-drop ${dragging ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
          >
            <UploadIcon width={36} height={36} />
            <p style={{ marginTop: 12 }}>
              {file ? (
                <strong style={{ color: "var(--text-primary)" }}>{file.name}</strong>
              ) : (
                <>Drag &amp; drop a PDF, JPG or PNG here, or click to browse</>
              )}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              hidden
              onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
            />
          </div>

          <div className="grid grid-2" style={{ marginTop: 24 }}>
            <div className="field">
              <label>Report title</label>
              <input
                value={meta.title}
                onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                placeholder="Complete Blood Count"
                required
              />
            </div>
            <div className="field">
              <label>Upload Type</label>
              <select
                value={meta.category}
                onChange={(e) => setMeta({ ...meta, category: e.target.value })}
                style={{
                  width: "100%",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 16px",
                  color: "var(--text-primary)",
                }}
              >
                <option value="lab_report">Lab Report / Values</option>
                <option value="prescription">Prescription / Medications</option>
              </select>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="field">
              <label>Hospital / Lab (optional)</label>
              <input
                value={meta.hospital_name}
                onChange={(e) => setMeta({ ...meta, hospital_name: e.target.value })}
                placeholder="Chughtai Lab"
              />
            </div>
            <div className="field">
              <label>Doctor (optional)</label>
              <input
                value={meta.doctor_name}
                onChange={(e) => setMeta({ ...meta, doctor_name: e.target.value })}
                placeholder="Dr. Ahmed"
              />
            </div>
          </div>

          <div className="field">
            <label>Report date (optional)</label>
            <input
              type="date"
              value={meta.report_date}
              onChange={(e) => setMeta({ ...meta, report_date: e.target.value })}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Uploading & analyzing…" : "Upload & analyze with AI"}
          </button>
        </form>

        <div className="neo-card" style={{ padding: 28 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <div className="report-icon">
              <FileIcon />
            </div>
            <h3>What happens next?</h3>
          </div>
          <ol style={{ color: "var(--text-secondary)", lineHeight: 2, paddingLeft: 20 }}>
            <li>We extract the text from your report using OCR.</li>
            <li>If it's a lab report, structured test values are identified.</li>
            <li>If it's a prescription, medicines, dosages, and warnings are extracted.</li>
            <li>Gemini AI generates a plain-language summary in English or Urdu.</li>
            <li>You can listen to the analysis aloud or ask follow-up questions in chat.</li>
          </ol>
        </div>
      </div>
    </DashboardLayout>
  );
}
