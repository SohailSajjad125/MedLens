import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ReportsList from "./pages/ReportsList";
import UploadReport from "./pages/UploadReport";
import ReportDetail from "./pages/ReportDetail";
import Compare from "./pages/Compare";
import Analytics from "./pages/Analytics";
import Timeline from "./pages/Timeline";
import ChatAssistant from "./pages/ChatAssistant";
import Family from "./pages/Family";
import HealthProfile from "./pages/HealthProfile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

// Smart root redirect: sends authenticated users to the right dashboard
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null; // Wait for auth to resolve
  if (!user) return <Navigate to="/login" replace />;
  if (user.role_name === "admin") return <Navigate to="/admin" replace />;
  if (user.role_name === "doctor") return <Navigate to="/doctor" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Root - smart redirect based on role */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Patient routes */}
      <Route path="/dashboard" element={<ProtectedRoute roles={["patient"]}><Dashboard /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsList /></ProtectedRoute>} />
      {/* /reports/:id accessible to patients AND doctors (doctor sees shared report) */}
      <Route path="/reports/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute roles={["patient"]}><UploadReport /></ProtectedRoute>} />
      <Route path="/compare" element={<ProtectedRoute roles={["patient"]}><Compare /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute roles={["patient"]}><Analytics /></ProtectedRoute>} />
      <Route path="/timeline" element={<ProtectedRoute roles={["patient"]}><Timeline /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><ChatAssistant /></ProtectedRoute>} />
      <Route path="/family" element={<ProtectedRoute roles={["patient"]}><Family /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><HealthProfile /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

      {/* Doctor routes */}
      <Route path="/doctor" element={<ProtectedRoute roles={["doctor"]}><DoctorDashboard /></ProtectedRoute>} />
      <Route path="/doctor/:tab" element={<ProtectedRoute roles={["doctor"]}><DoctorDashboard /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/:tab" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
