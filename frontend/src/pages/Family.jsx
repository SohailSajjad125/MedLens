import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { profileApi } from "../api/endpoints";
import { FamilyIcon } from "../components/Icons";

export default function Family() {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ full_name: "", relationship_label: "", date_of_birth: "", gender: "" });
  const [showForm, setShowForm] = useState(false);

  const load = () => profileApi.listFamily().then(({ data }) => setMembers(data));

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    await profileApi.addFamily(form);
    setForm({ full_name: "", relationship_label: "", date_of_birth: "", gender: "" });
    setShowForm(false);
    load();
  };

  return (
    <DashboardLayout breadcrumb="Family" title="Family Members">
      <div className="section-title">
        <h3>Manage family health records</h3>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          + Add family member
        </button>
      </div>

      {showForm && (
        <form className="neo-card" style={{ padding: 24, marginBottom: 24 }} onSubmit={handleAdd}>
          <div className="grid grid-2">
            <div className="field">
              <label>Full name</label>
              <input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Relationship</label>
              <input
                required
                placeholder="Son, Mother, Spouse…"
                value={form.relationship_label}
                onChange={(e) => setForm({ ...form, relationship_label: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label>Date of birth</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Gender</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary">Save member</button>
        </form>
      )}

      <div className="grid grid-3">
        {members.map((m) => (
          <div key={m.id} className="neo-card report-card">
            <div className="report-icon">
              <FamilyIcon />
            </div>
            <div className="report-title">{m.full_name}</div>
            <div className="report-meta">{m.relationship_label}</div>
          </div>
        ))}
        {members.length === 0 && (
          <div className="neo-card empty-state" style={{ gridColumn: "1 / -1" }}>
            <FamilyIcon width={40} height={40} />
            <p>No family members added yet. Add one to manage their reports separately.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
