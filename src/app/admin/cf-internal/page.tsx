"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api";

const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "";

type Stats = {
  dau: number;
  uploads_today: number;
  clips_today: number;
  reels_today: number;
  hit_rate_pct: number;
  total_uploads: number;
  total_clips: number;
  total_reels: number;
  total_users: number;
};

type UserRow = {
  user_id: string;
  email: string;
  name: string;
  upload_count: number;
  last_upload_at: string;
};

export default function AdminPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const adminHeaders = {
    "Content-Type": "application/json",
    "x-admin-secret": ADMIN_SECRET,
    "x-clerk-user-id": user?.id ?? "",
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    async function load() {
      try {
        setLoading(true);
        setError("");

        const [statsRes, usersRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/stats`, { headers: adminHeaders, cache: "no-store" }),
          fetch(`${API_BASE}/api/admin/users`, { headers: adminHeaders, cache: "no-store" }),
        ]);

        if (statsRes.status === 403 || usersRes.status === 403) {
          setError("Access denied. Admin only.");
          return;
        }
        if (!statsRes.ok || !usersRes.ok) {
          setError("Failed to load admin data.");
          return;
        }

        const statsData = await statsRes.json();
        const usersData = await usersRes.json();
        setStats(statsData);
        setUsers(usersData.users ?? []);
      } catch (e: any) {
        setError("Network error: " + String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isLoaded, isSignedIn, user?.id]);

  function exportCSV() {
    if (!users.length) return;
    const header = "Name,Email,Uploads,Last Active";
    const rows = users.map(u =>
      `"${u.name}","${u.email}",${u.upload_count},"${u.last_upload_at ? new Date(u.last_upload_at).toLocaleDateString() : ""}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clipflow_users_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const loadingStyle = {
    background: "#0a0a0a", minHeight: "100vh", padding: 24,
    color: "#fff", fontFamily: "'Outfit', system-ui, sans-serif",
  };

  if (!isLoaded) return <div style={loadingStyle}>Loading…</div>;
  if (!isSignedIn) return <div style={loadingStyle}>Access denied.</div>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a0a;color:#fff;font-family:'Outfit',-apple-system,system-ui,sans-serif}

        .stat-card{
          padding:20px 24px;border-radius:14px;
          background:#141414;border:1px solid #222;
          flex:1;min-width:140px;
        }
        .stat-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:8px}
        .stat-value{font-size:32px;font-weight:700;line-height:1}
        .stat-sub{font-size:12px;color:#555;margin-top:4px}

        .table-wrap{overflow-x:auto;border-radius:14px;border:1px solid #222}
        table{width:100%;border-collapse:collapse;font-size:13px}
        thead tr{background:#141414;border-bottom:1px solid #222}
        th{padding:12px 16px;text-align:left;font-size:11px;font-weight:600;
           text-transform:uppercase;letter-spacing:1.2px;color:#555}
        tbody tr{border-bottom:1px solid #1a1a1a;transition:background 0.15s}
        tbody tr:last-child{border-bottom:none}
        tbody tr:hover{background:#141414}
        td{padding:12px 16px;color:#ccc}
        td.name{color:#fff;font-weight:500}
        td.email{color:#888;font-family:monospace;font-size:12px}

        .btn-export{
          padding:9px 18px;border-radius:10px;border:none;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-weight:600;font-size:13px;
          font-family:'Outfit',sans-serif;cursor:pointer;
          transition:opacity 0.2s;
        }
        .btn-export:hover{opacity:0.9}
        .btn-export:disabled{opacity:0.4;cursor:not-allowed}

        @keyframes spin{to{transform:rotate(360deg)}}
        .spinner{display:inline-block;width:16px;height:16px;border:2px solid #333;
          border-top-color:#e8622c;border-radius:50%;animation:spin 0.7s linear infinite;
          vertical-align:middle}
      `}</style>

      <div style={{
        background: "#0a0a0a", minHeight: "100vh",
        fontFamily: "'Outfit', -apple-system, system-ui, sans-serif",
        padding: "48px 24px", maxWidth: 900, margin: "0 auto",
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 36 }}>
          <img src="/logo.png" alt="ClipFlow" style={{ width: 140, height: "auto" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "#555", marginBottom: 6 }}>
              Internal
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.5px" }}>
              Admin{" "}
              <span style={{ background: "linear-gradient(135deg,#e8622c,#f0a830)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Dashboard
              </span>
            </h1>
          </div>
          <button className="btn-export" onClick={exportCSV} disabled={!users.length}>
            ⬇ Export Users CSV
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 24, padding: "14px 18px", borderRadius: 14, background: "rgba(252,165,165,0.08)", border: "1px solid rgba(252,165,165,0.2)", color: "#fca5a5", fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#555" }}>
            <span className="spinner" />
          </div>
        ) : stats && (
          <>
            {/* Today stats */}
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "#555", marginBottom: 12 }}>
              Today
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
              <div className="stat-card">
                <div className="stat-label">Active Users</div>
                <div className="stat-value" style={{ background: "linear-gradient(135deg,#e8622c,#f0a830)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{stats.dau}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Uploads</div>
                <div className="stat-value">{stats.uploads_today}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Clips</div>
                <div className="stat-value">{stats.clips_today}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Reels</div>
                <div className="stat-value">{stats.reels_today}</div>
              </div>
            </div>

            {/* All-time stats */}
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "#555", marginBottom: 12 }}>
              All Time
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
              <div className="stat-card">
                <div className="stat-label">Total Users</div>
                <div className="stat-value">{stats.total_users}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Uploads</div>
                <div className="stat-value">{stats.total_uploads}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Clips</div>
                <div className="stat-value">{stats.total_clips}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Reels</div>
                <div className="stat-value">{stats.total_reels}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">AI Hit Rate</div>
                <div className="stat-value">{stats.hit_rate_pct}%</div>
                <div className="stat-sub">of classified clips</div>
              </div>
            </div>

            {/* User table */}
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "#555", marginBottom: 12 }}>
              Users ({users.length})
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Uploads</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.user_id}>
                      <td className="name">{u.name || "—"}</td>
                      <td className="email">{u.email || "—"}</td>
                      <td>{u.upload_count}</td>
                      <td>{u.last_upload_at ? new Date(u.last_upload_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Footer */}
        <p style={{ marginTop: 48, fontSize: 14, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase", background: "linear-gradient(135deg,#e8622c,#f0a830)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Find Your Flow
        </p>
      </div>
    </>
  );
}