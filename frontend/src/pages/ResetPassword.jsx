import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthBackground from "../components/AuthBackground";
import Logo from "../components/Logo";
import { authApi } from "../api/endpoints";
import "../styles/auth.css";

export default function ResetPassword() {
  const [form, setForm] = useState({ email: "", new_password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { data } = await authApi.resetPassword(form);
      setMessage(data.message);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not reset password. Please verify your email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <AuthBackground />
      <div className="auth-content glass-card" style={{ maxWidth: 460 }}>
        <div className="auth-form-panel" style={{ width: "100%", padding: 32 }}>
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <Logo />
          </div>
          <h2>Set new password</h2>
          <p className="sub" style={{ marginBottom: 20 }}>
            Enter your email and choose a secure new password.
          </p>

          {message && (
            <div className="auth-error" style={{ background: "rgba(52,211,153,.1)", borderColor: "rgba(52,211,153,.3)", color: "var(--success)" }}>
              {message}
            </div>
          )}
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
            <div className="field">
              <label>New Password</label>
              <input
                type="password"
                name="new_password"
                required
                placeholder="Minimum 8 characters"
                value={form.new_password}
                onChange={handleChange}
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 12 }}>
              {loading ? "Updating password…" : "Update Password"}
            </button>
          </form>

          <div className="auth-switch" style={{ marginTop: 20, textAlign: "center" }}>
            Back to <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
