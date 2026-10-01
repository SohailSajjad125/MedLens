import api from "./client";

export const authApi = {
  register: (data) => api.post("/api/auth/register", data),
  login: (data) => api.post("/api/auth/login", data),
  me: () => api.get("/api/auth/me"),
  google: (data) => api.post("/api/auth/google", data),
  forgotPassword: (data) => api.post("/api/auth/forgot-password", data),
  resetPassword: (data) => api.post("/api/auth/reset-password", data),
};

export const reportApi = {
  list: () => api.get("/api/reports"),
  detail: (id) => api.get(`/api/reports/${id}`),
  upload: (formData) =>
    api.post("/api/reports/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  remove: (id) => api.delete(`/api/reports/${id}`),
  toggleFavorite: (id) => api.patch(`/api/reports/${id}/favorite`),
  compare: (a, b) => api.get(`/api/reports/compare`, { params: { report_a_id: a, report_b_id: b } }),
  trends: () => api.get("/api/reports/analytics/trends"),
  timeline: () => api.get("/api/reports/timeline"),
  translate: (id) => api.post(`/api/reports/${id}/translate`),
};

export const chatApi = {
  sessions: () => api.get("/api/chat/sessions"),
  ask: (data) => api.post("/api/chat/ask", data),
};

export const profileApi = {
  getHealth: () => api.get("/api/profile/health"),
  updateHealth: (data) => api.put("/api/profile/health", data),
  listFamily: () => api.get("/api/profile/family"),
  addFamily: (data) => api.post("/api/profile/family", data),
  getSettings: () => api.get("/api/profile/settings"),
  updateSettings: (data) => api.put("/api/profile/settings", data),
  notifications: () => api.get("/api/profile/notifications"),
  markNotifRead: (id) => api.patch(`/api/profile/notifications/${id}/read`),
  deleteNotif: (id) => api.delete(`/api/profile/notifications/${id}`),
  submitFeedback: (data) => api.post("/api/profile/feedback", data),
};

export const adminApi = {
  stats: () => api.get("/api/admin/stats"),
  users: () => api.get("/api/admin/users"),
  reports: () => api.get("/api/admin/reports"),
  updateRole: (userId, roleName) => api.patch(`/api/admin/users/${userId}/role`, { role_name: roleName }),
  reactivate: (userId) => api.patch(`/api/admin/users/${userId}/reactivate`),
  deactivate: (userId) => api.patch(`/api/admin/users/${userId}/deactivate`),
  feedback: () => api.get("/api/admin/feedback"),
  updateFeedback: (id, status) => api.patch(`/api/admin/feedback/${id}`, { status }),
  auditLogs: () => api.get("/api/admin/audit-logs"),
  getApiKey: () => api.get("/api/admin/api-key"),
  updateApiKey: (api_key) => api.post("/api/admin/api-key", { api_key }),
};

export const doctorApi = {
  sharedReports: () => api.get("/api/doctor/shared-reports"),
  patients: () => api.get("/api/doctor/patients"),
  patientProfile: (id) => api.get(`/api/doctor/patient/${id}`),
  shares: () => api.get("/api/doctor/shares"),
  share: (reportId, doctorEmail) => api.post(`/api/doctor/share/${reportId}`, null, { params: { doctor_email: doctorEmail } }),
  revokeShare: (shareId) => api.delete(`/api/doctor/share/${shareId}`),
  getNotes: (reportId) => api.get(`/api/doctor/report/${reportId}/notes`),
  saveNotes: (reportId, notes) => api.post(`/api/doctor/report/${reportId}/notes`, { notes }),
  listDoctors: () => api.get("/api/doctor/list-doctors"),
  shareAll: (doctorId) => api.post(`/api/doctor/share-all/${doctorId}`),
};
