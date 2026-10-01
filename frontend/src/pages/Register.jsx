import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthBackground from "../components/AuthBackground";
import Logo from "../components/Logo";
import PulseDivider from "../components/PulseDivider";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { SunIcon, MoonIcon, HeartIcon } from "../components/Icons";
import "../styles/auth.css";

export default function Register() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "patient",
    license_number: "",
    specialization: "",
    hospital: "",
    experience_years: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Prepare register payload
    const payload = {
      full_name: form.full_name,
      email: form.email,
      password: form.password,
      role: form.role,
    };

    if (form.role === "doctor") {
      payload.license_number = form.license_number;
      payload.specialization = form.specialization;
      payload.hospital = form.hospital;
      payload.experience_years = form.experience_years ? parseInt(form.experience_years) : null;
    }

    try {
      await register(payload);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
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
            <HeartIcon width={14} height={14} /> Built for patients, doctors &amp; families
          </span>
          <h1>
            Understand every <span>test result</span> at a glance.
          </h1>
          <p>
            Create your free account to start uploading reports, track trends over time, and
            share results securely with your doctor.
          </p>
          <PulseDivider />
          <div className="auth-stat-row">
            <div className="stat">
              <b>Bank-grade</b>
              <span>Password hashing</span>
            </div>
            <div className="stat">
              <b>Private</b>
              <span>Your data, your control</span>
            </div>
          </div>
        </div>

        <div className="auth-form-panel">
          <h2>Create your account</h2>
          <p className="sub">Takes less than a minute.</p>

          {error && <div className="auth-error">{error}</div>}
          {success && (
            <div className="auth-error" style={{ background: "rgba(52,211,153,.1)", borderColor: "rgba(52,211,153,.3)", color: "var(--success)" }}>
              Account created! Redirecting to sign in…
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Full name</label>
              <input
                type="text"
                name="full_name"
                required
                minLength={3}
                placeholder="Ayesha Khan"
                value={form.full_name}
                onChange={handleChange}
              />
            </div>
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
              <label>Password</label>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Register as</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                style={{
                  width: "100%",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 16px",
                  color: "var(--text-primary)",
                }}
              >
                <option value="patient">Patient (Manage health reports)</option>
                <option value="doctor">Medical Doctor / Practitioner</option>
              </select>
            </div>

            {form.role === "doctor" && (
              <>
                <div className="grid grid-2 animate-slide">
                  <div className="field">
                    <label>License Number</label>
                    <input
                      name="license_number"
                      required
                      placeholder="e.g. PMC-99887"
                      value={form.license_number}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="field">
                    <label>Specialization</label>
                    <input
                      name="specialization"
                      required
                      placeholder="e.g. General Physician"
                      value={form.specialization}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-2 animate-slide">
                  <div className="field">
                    <label>Hospital Affiliation</label>
                    <input
                      name="hospital"
                      placeholder="e.g. Chughtai Clinic"
                      value={form.hospital}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="field">
                    <label>Years of Experience</label>
                    <input
                      type="number"
                      name="experience_years"
                      placeholder="e.g. 5"
                      value={form.experience_years}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </>
            )}

            <button className="btn btn-violet btn-block" disabled={loading} style={{ marginTop: 12 }}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
