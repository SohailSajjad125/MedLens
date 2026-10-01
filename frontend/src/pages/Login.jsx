import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthBackground from "../components/AuthBackground";
import Logo from "../components/Logo";
import PulseDivider from "../components/PulseDivider";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { authApi } from "../api/endpoints";
import { SunIcon, MoonIcon, HeartIcon } from "../components/Icons";
import "../styles/auth.css";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      const { data: profile } = await authApi.me();
      if (profile.role_name === "admin") navigate("/admin");
      else if (profile.role_name === "doctor") navigate("/doctor");
      else navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await authApi.google({
        email: "google-test-patient@medlens.com",
        full_name: "Google Sandbox Patient",
      });
      localStorage.setItem("token", data.access_token);
      const { data: profile } = await authApi.me();
      if (profile.role_name === "admin") navigate("/admin");
      else if (profile.role_name === "doctor") navigate("/doctor");
      else navigate("/dashboard");
    } catch (err) {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <AuthBackground />

      <button className="icon-btn theme-toggle-floating" onClick={toggleTheme}>
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="auth-content glass-card">
        <div className="auth-showcase">
          <Logo />
          <span className="eyebrow">
            <HeartIcon width={14} height={14} /> AI-powered health intelligence
          </span>
          <h1>
            Your reports, <span>explained</span> in plain words.
          </h1>
          <p>
            Upload any lab report or prescription — MedLens reads it, highlights what matters,
            and lets you ask follow-up questions in plain English or Urdu.
          </p>
          <PulseDivider />
          <div className="auth-stat-row">
            <div className="stat">
              <b>OCR</b>
              <span>Text extraction</span>
            </div>
            <div className="stat">
              <b>Gemini</b>
              <span>AI summaries</span>
            </div>
            <div className="stat">
              <b>24/7</b>
              <span>Q&amp;A assistant</span>
            </div>
          </div>
        </div>

        <div className="auth-form-panel">
          <h2>Welcome back</h2>
          <p className="sub">Sign in to view your health dashboard.</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email address</label>
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Password</label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
              />
            </div>
            <div style={{ textAlign: "right", marginBottom: 20 }}>
              <Link to="/forgot-password" style={{ fontSize: "0.82rem", color: "var(--accent-teal)" }}>
                Forgot Password?
              </Link>
            </div>

            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--glass-border)" }} />
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: "var(--glass-border)" }} />
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={handleGoogleLogin}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99c.9-2.7 3.42-4.51 6.76-4.51z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.69 2.87c2.16-1.99 3.42-4.93 3.42-8.6z" />
              <path fill="#FBBC05" d="M5.24 14.73A7.12 7.12 0 0 1 4.8 12c0-.96.16-1.9.44-2.77L1.39 6.24C.5 8.01 0 9.95 0 12c0 2.05.5 3.99 1.39 5.76l3.85-3.03z" />
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.69-2.87c-1.02.68-2.33 1.09-3.95 1.09-3.34 0-6.17-2.13-7.18-5.1l-3.85 3.03C3.37 20.33 7.35 23 12 23z" />
            </svg>
            Sign in with Google
          </button>

          <div className="auth-switch" style={{ marginTop: 24 }}>
            Don&apos;t have an account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
