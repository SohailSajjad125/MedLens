import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "../styles/dashboard.css";

export default function DashboardLayout({ title, breadcrumb, children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar title={title} breadcrumb={breadcrumb} />
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
}
