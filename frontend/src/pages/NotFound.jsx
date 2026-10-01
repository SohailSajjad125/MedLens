import { Link } from "react-router-dom";
import Logo from "../components/Logo";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
      <Logo />
      <h1 style={{ fontSize: "2.2rem" }}>404</h1>
      <p>This page doesn&apos;t exist.</p>
      <Link className="btn btn-primary" to="/dashboard">
        Back to dashboard
      </Link>
    </div>
  );
}
