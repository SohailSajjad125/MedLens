import { useState } from "react";
import { Link } from "react-router-dom";
import AuthBackground from "../components/AuthBackground";
import Logo from "../components/Logo";
import { authApi } from "../api/endpoints";
import "../styles/auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { data } = await authApi.forgotPassword({ email });
      setMessage(data.message + (data.reset_token ? ` (Simulated reset token: ${data.reset_token})` : ""));
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
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
          <h2>Reset password</h2>
          <p className="sub" style={{ marginBottom: 20 }}>
            Enter your email address and we'll send you recovery details.
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
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 12 }}>
              {loading ? "Sending reset details…" : "Send recovery email"}
            </button>
          </form>

          <div className="auth-switch" style={{ marginTop: 20, textAlign: "center" }}>
            Remembered your password? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
