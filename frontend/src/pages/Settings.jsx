import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { profileApi } from "../api/endpoints";
import { useTheme } from "../context/ThemeContext";
import { SunIcon, MoonIcon } from "../components/Icons";

export default function Settings() {
  const [settings, setSettings] = useState({ theme: "dark", language: "en", email_notifications: true });
  const { setTheme } = useTheme();

  // Feedback form state
  const [feedback, setFeedback] = useState({ subject: "", message: "" });
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    profileApi.getSettings().then(({ data }) => {
      setSettings(data);
      setTheme(data.theme);
    });
  }, []);

  const update = async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (patch.theme) setTheme(patch.theme);
    await profileApi.updateSettings(patch);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    setFeedbackSuccess("");
    try {
      await profileApi.submitFeedback(feedback);
      setFeedbackSuccess("Thank you! Your feedback has been sent to our administrators.");
      setFeedback({ subject: "", message: "" });
      setTimeout(() => setFeedbackSuccess(""), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <DashboardLayout breadcrumb="Preferences" title="Settings">
      <div className="grid grid-2">
        <div className="neo-card" style={{ padding: 26 }}>
          <h3 style={{ marginBottom: 18 }}>Appearance</h3>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className={`btn ${settings.theme === "dark" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => update({ theme: "dark" })}
            >
              <MoonIcon width={16} height={16} /> Dark mode
            </button>
            <button
              className={`btn ${settings.theme === "light" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => update({ theme: "light" })}
            >
              <SunIcon width={16} height={16} /> Light mode
            </button>
          </div>
        </div>

        <div className="neo-card" style={{ padding: 26 }}>
          <h3 style={{ marginBottom: 18 }}>Language</h3>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className={`btn ${settings.language === "en" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => update({ language: "en" })}
            >
              English
            </button>
            <button
              className={`btn ${settings.language === "ur" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => update({ language: "ur" })}
            >
              اردو (Urdu)
            </button>
          </div>
          <p style={{ marginTop: 12, fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Select your preferred system language. AI summaries can also be translated directly inside reports.
          </p>
        </div>

        <div className="neo-card" style={{ padding: 26, gridColumn: "1 / -1" }}>
          <h3 style={{ marginBottom: 12 }}>Notifications</h3>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.email_notifications}
              onChange={(e) => update({ email_notifications: e.target.checked })}
            />
            Email me when a report finishes AI analysis
          </label>
        </div>

        {/* Support & Feedback Card */}
        <form onSubmit={handleFeedbackSubmit} className="neo-card" style={{ padding: 26, gridColumn: "1 / -1" }}>
          <h3 style={{ marginBottom: 12 }}>Support &amp; Feedback</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: 18 }}>
            Have a question, encountered an issue, or want to suggest a new feature? Write to us!
          </p>

          {feedbackSuccess && (
            <div
              className="auth-error"
              style={{
                marginBottom: 14,
                background: "rgba(52,211,153,.1)",
                borderColor: "rgba(52,211,153,.3)",
                color: "var(--success)",
              }}
            >
              {feedbackSuccess}
            </div>
          )}

          <div className="field">
            <label>Subject</label>
            <input
              required
              placeholder="e.g. Bug with PDF upload"
              value={feedback.subject}
              onChange={(e) => setFeedback({ ...feedback, subject: e.target.value })}
            />
          </div>

          <div className="field">
            <label>Message</label>
            <textarea
              required
              rows={4}
              placeholder="Provide details about your query or feedback…"
              value={feedback.message}
              onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
              style={{
                width: "100%",
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <button className="btn btn-primary" disabled={submittingFeedback} style={{ marginTop: 6 }}>
            {submittingFeedback ? "Submitting…" : "Send Message"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
