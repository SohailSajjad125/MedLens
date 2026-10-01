import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { profileApi } from "../api/endpoints";

export default function HealthProfile() {
  const [profile, setProfile] = useState({
    date_of_birth: "",
    gender: "",
    blood_group: "",
    height_cm: "",
    weight_kg: "",
    allergies: "",
    medical_conditions: "",
  });
  const [savedProfile, setSavedProfile] = useState(null);
  const [saved, setSaved] = useState(false);

  const loadProfile = () => {
    profileApi.getHealth().then(({ data }) => {
      if (data && (data.date_of_birth || data.gender || data.blood_group || data.height_cm || data.weight_kg || data.allergies || data.medical_conditions)) {
        setSavedProfile(data);
      }
    });
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    // Prepare payload (convert empty strings to null or numbers accordingly)
    const payload = {
      date_of_birth: profile.date_of_birth || null,
      gender: profile.gender || null,
      blood_group: profile.blood_group || null,
      height_cm: profile.height_cm ? parseFloat(profile.height_cm) : null,
      weight_kg: profile.weight_kg ? parseFloat(profile.weight_kg) : null,
      allergies: profile.allergies || null,
      medical_conditions: profile.medical_conditions || null,
    };
    
    await profileApi.updateHealth(payload);
    
    // Refresh saved profile
    const { data } = await profileApi.getHealth();
    if (data) {
      setSavedProfile(data);
    }
    
    // Clear form inputs
    setProfile({
      date_of_birth: "",
      gender: "",
      blood_group: "",
      height_cm: "",
      weight_kg: "",
      allergies: "",
      medical_conditions: "",
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout breadcrumb="Profile" title="Health Profile">
      {savedProfile && (
        <div className="neo-card" style={{ padding: 26, marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, color: "var(--accent-teal)" }}>Your Saved Health Profile</h3>
          <div className="grid grid-4" style={{ gap: 16, textAlign: "left" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Date of Birth</div>
              <strong style={{ fontSize: "1rem" }}>{savedProfile.date_of_birth || "—"}</strong>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Gender</div>
              <strong style={{ fontSize: "1rem" }}>{savedProfile.gender || "—"}</strong>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Blood Group</div>
              <strong style={{ fontSize: "1rem" }}>{savedProfile.blood_group || "—"}</strong>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>BMI</div>
              <strong style={{ fontSize: "1.1rem", color: "var(--accent-violet)" }}>{savedProfile.bmi || "—"}</strong>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Height (cm)</div>
              <strong style={{ fontSize: "1rem" }}>{savedProfile.height_cm || "—"}</strong>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Weight (kg)</div>
              <strong style={{ fontSize: "1rem" }}>{savedProfile.weight_kg || "—"}</strong>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Allergies</div>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-primary)" }}>{savedProfile.allergies || "None"}</p>
            </div>
          </div>
          {savedProfile.medical_conditions && (
            <div style={{ marginTop: 14, textAlign: "left" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Medical Conditions</div>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-primary)" }}>{savedProfile.medical_conditions}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-2-1">
        <form className="neo-card" style={{ padding: 28 }} onSubmit={handleSave}>
          <h3 style={{ marginBottom: 20 }}>{savedProfile ? "Update Health Profile" : "Enter Health Profile"}</h3>
          <div className="grid grid-2">
            <div className="field">
              <label>Date of birth</label>
              <input type="date" name="date_of_birth" value={profile.date_of_birth} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Gender</label>
              <select name="gender" value={profile.gender} onChange={handleChange}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="field">
              <label>Blood group</label>
              <select name="blood_group" value={profile.blood_group} onChange={handleChange}>
                <option value="">Select</option>
                {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div />
          </div>

          <div className="grid grid-2">
            <div className="field">
              <label>Height (cm)</label>
              <input type="number" name="height_cm" value={profile.height_cm} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Weight (kg)</label>
              <input type="number" name="weight_kg" value={profile.weight_kg} onChange={handleChange} />
            </div>
          </div>

          <div className="field">
            <label>Allergies</label>
            <textarea name="allergies" rows={2} value={profile.allergies} onChange={handleChange} />
          </div>
          <div className="field">
            <label>Medical conditions</label>
            <textarea name="medical_conditions" rows={2} value={profile.medical_conditions} onChange={handleChange} />
          </div>

          <button className="btn btn-primary">Save profile</button>
          {saved && <span style={{ marginLeft: 14, color: "var(--success)", fontSize: "0.85rem" }}>Saved ✓</span>}
        </form>

        <div className="neo-card" style={{ padding: 28, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ marginBottom: 8 }}>Current BMI</p>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "3rem" }}>{savedProfile?.bmi || "—"}</div>
          <p style={{ marginTop: 8, fontSize: "0.8rem" }}>
            {savedProfile?.bmi ? "Calculated from your saved height & weight" : "Add height and weight to calculate BMI"}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
