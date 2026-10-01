import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { reportApi } from "../api/endpoints";
import { FileIcon, StarIcon, TrashIcon, DownloadIcon } from "../components/Icons";
import { API_BASE_URL } from "../api/client";

export default function ReportsList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const onlyFavorites = params.get("filter") === "favorites";

  const load = () => reportApi.list().then(({ data }) => setReports(data));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...reports];
    if (onlyFavorites) list = list.filter((r) => r.is_favorite);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.hospital_name?.toLowerCase().includes(q) ||
          r.doctor_name?.toLowerCase().includes(q) ||
          r.report_type?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) =>
      sort === "newest"
        ? new Date(b.created_at) - new Date(a.created_at)
        : new Date(a.created_at) - new Date(b.created_at)
    );
    return list;
  }, [reports, query, sort, onlyFavorites]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this report? This cannot be undone.")) return;
    await reportApi.remove(id);
    load();
  };

  const handleFavorite = async (e, id) => {
    e.stopPropagation();
    await reportApi.toggleFavorite(id);
    load();
  };

  return (
    <DashboardLayout breadcrumb="Reports" title={onlyFavorites ? "Favorite Reports" : "My Reports"}>
      <div className="neo-card" style={{ padding: 18, marginBottom: 20, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <input
          placeholder="Search by title, hospital, doctor, or test type…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: 220,
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 16px",
            color: "var(--text-primary)",
          }}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 16px",
            color: "var(--text-primary)",
          }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {loading && <div className="skeleton" style={{ height: 300 }} />}

      {!loading && filtered.length === 0 && (
        <div className="neo-card empty-state">
          <FileIcon width={40} height={40} />
          <p>No reports match your search.</p>
        </div>
      )}

      <div className="grid grid-3">
        {filtered.map((r) => (
          <div key={r.id} className="neo-card report-card clickable" onClick={() => navigate(`/reports/${r.id}`)}>
            <div className="report-card-head">
              <div className="report-icon">
                <FileIcon />
              </div>
              <span className={`badge ${r.is_processed ? "badge-normal" : "badge-watch"}`}>
                {r.is_processed ? "Analyzed" : "Processing"}
              </span>
            </div>
            <div>
              <div className="report-title">{r.title}</div>
              <div className="report-meta">
                {r.report_date || "No date"} · {r.hospital_name || "—"}
              </div>
            </div>
            <div className="report-card-actions">
              <button className="btn btn-ghost" onClick={(e) => handleFavorite(e, r.id)}>
                <StarIcon width={14} height={14} color={r.is_favorite ? "var(--warning)" : "currentColor"} />
                {r.is_favorite ? "Favorited" : "Favorite"}
              </button>
              <a
                className="btn btn-ghost"
                href={`${API_BASE_URL}/${r.file_path}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <DownloadIcon width={14} height={14} />
              </a>
              <button className="btn btn-danger-ghost" onClick={(e) => handleDelete(e, r.id)}>
                <TrashIcon width={14} height={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
