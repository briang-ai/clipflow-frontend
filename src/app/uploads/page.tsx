"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api";

type UploadRow = {
  id: string;
  user_id: string;
  original_filename: string;
  content_type: string;
  s3_key: string;
  bucket: string;
  status: string;
  created_at: string;
};

type ReelRow = {
  id: string;
  player_name: string;
  jersey_number?: string | null;
  game_date: string;
  clip_count: number;
  duration_sec?: number | null;
  status: "pending" | "processing" | "complete" | "error";
  error_message?: string | null;
  created_at: string;
};

// Group uploads that are within 3 hours of each other into a "game"
function groupIntoGames(uploads: UploadRow[]): UploadRow[][] {
  if (!uploads.length) return [];
  const sorted = [...uploads].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const groups: UploadRow[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].created_at).getTime();
    const curr = new Date(sorted[i].created_at).getTime();
    if (curr - prev <= 3 * 60 * 60 * 1000) {
      groups[groups.length - 1].push(sorted[i]);
    } else {
      groups.push([sorted[i]]);
    }
  }
  // Newest game first
  return groups.reverse();
}

function fmtGameLabel(group: UploadRow[]): string {
  const d = new Date(group[0].created_at);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function fmtDuration(sec: number | null | undefined): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function UploadsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [error, setError] = useState<string>("");
  const [downloadingId, setDownloadingId] = useState<string>("");

  // reels state keyed by upload_id (we fetch per-upload)
  const [reelsByUpload, setReelsByUpload] = useState<Record<string, ReelRow[]>>({});
  const [compilingGroup, setCompilingGroup] = useState<string>(""); // groupKey being compiled
  const [compileError, setCompileError] = useState<string>("");

  const myUploads = useMemo(() => {
    const uid = user?.id;
    if (!uid) return [];
    return uploads.filter(u => u.user_id === uid);
  }, [uploads, user?.id]);

  const gameGroups = useMemo(() => groupIntoGames(myUploads), [myUploads]);

  // ── load uploads ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        setError("");
        const res = await fetch(`${API_BASE}/api/uploads/recent?limit=50`, { cache: "no-store" });
        if (!res.ok) { setError(`Backend error ${res.status}: ${await res.text()}`); return; }
        const data = await res.json();
        setUploads(data.uploads ?? []);
      } catch (e: any) { setError(`Network/JS error: ${String(e)}`); }
    }
    if (isLoaded && isSignedIn) load();
  }, [isLoaded, isSignedIn]);

  // ── load reels for every upload ─────────────────────────────────────────────
  useEffect(() => {
    if (!myUploads.length) return;
    async function loadAllReels() {
      const results: Record<string, ReelRow[]> = {};
      await Promise.all(
        myUploads.map(async u => {
          try {
            const res = await fetch(`${API_BASE}/api/uploads/${u.id}/reels`, { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            results[u.id] = data.reels ?? [];
          } catch { /* silent */ }
        })
      );
      setReelsByUpload(results);
    }
    loadAllReels();
  }, [myUploads]);

  // ── poll reels while any are compiling ──────────────────────────────────────
  useEffect(() => {
    const allReels = Object.values(reelsByUpload).flat();
    const stillWorking = allReels.some(r => r.status === "pending" || r.status === "processing");
    if (!stillWorking) { setCompilingGroup(""); return; }

    const timer = setTimeout(async () => {
      const results: Record<string, ReelRow[]> = { ...reelsByUpload };
      await Promise.all(
        myUploads.map(async u => {
          try {
            const res = await fetch(`${API_BASE}/api/uploads/${u.id}/reels`, { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            results[u.id] = data.reels ?? [];
          } catch { /* silent */ }
        })
      );
      setReelsByUpload({ ...results });
    }, 3000);

    return () => clearTimeout(timer);
  }, [reelsByUpload]);

  // ── compile reel for a game group ───────────────────────────────────────────
  async function compileGroup(group: UploadRow[], groupKey: string) {
    setCompileError("");
    setCompilingGroup(groupKey);

    // Gather hit clip IDs across all uploads in the group
    // We need to fetch clips for each upload in the group
    try {
      const allHitClipIds: string[] = [];
      const firstUploadId = group[0].id;

      await Promise.all(
        group.map(async u => {
          const res = await fetch(`${API_BASE}/api/uploads/${u.id}/clips`, { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          const hits = (data.clips ?? []).filter((c: any) => c.is_hit === true).map((c: any) => c.id);
          allHitClipIds.push(...hits);
        })
      );

      if (!allHitClipIds.length) {
        setCompileError("No hit clips found across this game's uploads.");
        setCompilingGroup("");
        return;
      }

      const res = await fetch(`${API_BASE}/api/reels/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_id: firstUploadId, clip_ids: allHitClipIds }),
      });
      if (!res.ok) { setCompileError(await res.text()); setCompilingGroup(""); return; }

      // Refresh reels so polling picks up the new pending reel
      const updatedReels: Record<string, ReelRow[]> = { ...reelsByUpload };
      const reelRes = await fetch(`${API_BASE}/api/uploads/${firstUploadId}/reels`, { cache: "no-store" });
      if (reelRes.ok) {
        const data = await reelRes.json();
        updatedReels[firstUploadId] = data.reels ?? [];
      }
      setReelsByUpload(updatedReels);
    } catch (e: any) {
      setCompileError(String(e));
      setCompilingGroup("");
    }
  }

  // ── reel play / download ────────────────────────────────────────────────────
  async function getReelUrl(reelId: string): Promise<string | null> {
    const res = await fetch(`${API_BASE}/api/reels/${reelId}/download`, { cache: "no-store" });
    if (!res.ok) { setCompileError(await res.text()); return null; }
    const data = await res.json();
    return data?.download_url ?? null;
  }

  async function openReel(reelId: string) {
    const newWindow = window.open("", "_blank");
    const url = await getReelUrl(reelId);
    if (!url) { newWindow?.close(); return; }
    if (newWindow) newWindow.location.href = url;
  }

  async function downloadReel(reelId: string, playerName: string, gameDate: string) {
    const newWindow = window.open("", "_blank");
    const url = await getReelUrl(reelId);
    if (!url) { newWindow?.close(); return; }
    if (newWindow) newWindow.location.href = url;
    else {
      const a = document.createElement("a");
      a.href = url; a.download = `highlight_${playerName}_${gameDate}.mp4`;
      a.target = "_blank"; a.rel = "noopener noreferrer";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
  }

  // ── original upload download ────────────────────────────────────────────────
  async function downloadUpload(uploadId: string, filename: string) {
    try {
      setError(""); setDownloadingId(uploadId);
      const newWindow = window.open("", "_blank");
      const res = await fetch(`${API_BASE}/api/uploads/${uploadId}/download`, { cache: "no-store" });
      if (!res.ok) { newWindow?.close(); setError(await res.text()); return; }
      const data = await res.json();
      const url = data?.download_url;
      if (!url) { newWindow?.close(); setError("Missing download_url: " + JSON.stringify(data)); return; }
      if (newWindow) newWindow.location.href = url;
      else {
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.target = "_blank"; a.rel = "noopener noreferrer";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    } catch (e: any) { setError(`Download error: ${String(e)}`); }
    finally { setDownloadingId(""); }
  }

  const loadingStyle = {
    background: "#0a0a0a", minHeight: "100vh", padding: 24,
    color: "#fff", fontFamily: "'Outfit', system-ui, sans-serif",
  };
  if (!isLoaded)   return <div style={loadingStyle}>Loading…</div>;
  if (!isSignedIn) return <div style={loadingStyle}>Please sign in.</div>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a0a;color:#fff;font-family:'Outfit',-apple-system,system-ui,sans-serif}

        .upload-card{
          padding:16px 20px;border-radius:14px;
          background:#141414;border:1px solid #222;
          transition:border-color 0.2s;
        }
        .upload-card:hover{border-color:rgba(232,98,44,0.3)}

        .reel-card{
          padding:16px 20px;border-radius:14px;
          background:#0f0f0f;border:1px solid #1e1e1e;
          transition:border-color 0.2s;margin-top:8px;
        }
        .reel-card.complete{border-color:rgba(232,98,44,0.2)}

        .status-pill{
          display:inline-block;padding:3px 10px;border-radius:20px;
          font-size:12px;font-weight:500;font-family:monospace;
          background:#1a1a1a;border:1px solid #2a2a2a;color:#999;
        }

        .pill{
          display:inline-flex;align-items:center;gap:5px;
          padding:3px 9px;border-radius:20px;
          background:#1a1a1a;border:1px solid #2a2a2a;
          font-size:12px;color:#888;
        }
        .pill-value{color:#ccc;font-weight:500}

        .btn-primary{
          padding:7px 14px;border-radius:10px;border:none;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-weight:600;font-size:12px;
          font-family:'Outfit',sans-serif;cursor:pointer;
          white-space:nowrap;transition:opacity 0.2s;
        }
        .btn-primary:hover{opacity:0.9}
        .btn-primary:disabled{opacity:0.5;cursor:not-allowed}

        .btn-secondary{
          padding:7px 14px;border-radius:10px;
          background:#1a1a1a;border:1px solid #2a2a2a;
          color:#ccc;font-weight:500;font-size:12px;
          font-family:'Outfit',sans-serif;cursor:pointer;
          white-space:nowrap;transition:border-color 0.2s;
        }
        .btn-secondary:hover{border-color:rgba(232,98,44,0.4);color:#fff}
        .btn-secondary:disabled{opacity:0.5;cursor:not-allowed}

        .btn-compile{
          padding:9px 18px;border-radius:10px;border:none;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-weight:600;font-size:13px;
          font-family:'Outfit',sans-serif;cursor:pointer;
          white-space:nowrap;transition:opacity 0.2s;
        }
        .btn-compile:hover{opacity:0.9}
        .btn-compile:disabled{opacity:0.5;cursor:not-allowed}

        .game-header{
          display:flex;align-items:center;justify-content:space-between;
          flex-wrap:wrap;gap:10px;
          padding:16px 20px;border-radius:14px 14px 0 0;
          background:#111;border:1px solid #1e1e1e;border-bottom:none;
        }

        .game-body{
          padding:12px;border-radius:0 0 14px 14px;
          background:#0d0d0d;border:1px solid #1e1e1e;border-top:none;
          display:flex;flex-direction:column;gap:8px;
          margin-bottom:24px;
        }

        @keyframes spin{to{transform:rotate(360deg)}}
        .spinner{
          display:inline-block;width:13px;height:13px;
          border:2px solid #333;border-top-color:#e8622c;
          border-radius:50%;animation:spin 0.7s linear infinite;
          vertical-align:middle;margin-right:5px;
        }
      `}</style>

      <div style={{
        background: "#0a0a0a", minHeight: "100vh",
        fontFamily: "'Outfit', -apple-system, system-ui, sans-serif",
        padding: "48px 24px", maxWidth: 700, margin: "0 auto",
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 36 }}>
          <img src="/logo.png" alt="ClipFlow — Find Your Flow" style={{ width: 140, height: "auto" }} />
        </div>

        {/* Beta badge */}
        <div style={{
          display: "inline-block", padding: "6px 16px", borderRadius: 24,
          fontSize: 11, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "1.5px", marginBottom: 24,
          background: "linear-gradient(135deg,#e8622c,#f0a830)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          border: "1px solid rgba(232,98,44,0.3)",
        }}>
          Beta Testing
        </div>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.5px" }}>
            My{" "}
            <span style={{
              background: "linear-gradient(135deg,#e8622c,#f0a830)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              uploads
            </span>
          </h1>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href="mailto:info@clipflow.pro?subject=ClipFlow%20Beta%20Feedback"
              style={{
                padding: "10px 20px", borderRadius: 12,
                background: "#141414", border: "1px solid rgba(232,98,44,0.35)",
                color: "#f0a830", fontWeight: 600, fontSize: 14,
                fontFamily: "'Outfit', sans-serif", textDecoration: "none", whiteSpace: "nowrap",
              }}
              onMouseOver={e => (e.currentTarget.style.borderColor = "#e8622c")}
              onMouseOut={e => (e.currentTarget.style.borderColor = "rgba(232,98,44,0.35)")}
            >
              💬 Send Feedback
            </a>
            <Link href="/upload" style={{
              padding: "10px 20px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#e8622c,#f0a830)",
              color: "#fff", fontWeight: 600, fontSize: 14,
              fontFamily: "'Outfit', sans-serif", textDecoration: "none", whiteSpace: "nowrap",
            }}>
              + Record / Upload
            </Link>
          </div>
        </div>

        {/* Errors */}
        {error && (
          <div style={{
            marginBottom: 24, padding: "14px 18px", borderRadius: 14,
            background: "rgba(252,165,165,0.08)", border: "1px solid rgba(252,165,165,0.2)",
            color: "#fca5a5", fontSize: 13, whiteSpace: "pre-wrap",
          }}>{error}</div>
        )}
        {compileError && (
          <div style={{
            marginBottom: 24, padding: "14px 18px", borderRadius: 14,
            background: "rgba(252,165,165,0.08)", border: "1px solid rgba(252,165,165,0.2)",
            color: "#fca5a5", fontSize: 13,
          }}>{compileError}</div>
        )}

        {/* Empty state */}
        {gameGroups.length === 0 ? (
          <div style={{
            padding: "32px 24px", borderRadius: 16,
            background: "#141414", border: "1px solid #222",
            color: "#666", fontSize: 15, textAlign: "center",
          }}>
            No uploads yet. Record or upload your first game video to get started.
          </div>
        ) : (
          gameGroups.map((group, gi) => {
            const groupKey = group[0].id; // stable key = oldest upload in group
            const groupReels = group.flatMap(u => reelsByUpload[u.id] ?? []);
            const isCompiling = compilingGroup === groupKey ||
              groupReels.some(r => r.status === "pending" || r.status === "processing");

            return (
              <div key={groupKey}>
                {/* Game header */}
                <div className="game-header">
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "#555", marginBottom: 4 }}>
                      Game {gameGroups.length - gi}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtGameLabel(group)}</div>
                    <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                      {group.length} upload{group.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <button
                    className="btn-compile"
                    onClick={() => compileGroup(group, groupKey)}
                    disabled={isCompiling}
                  >
                    {isCompiling ? <><span className="spinner" />Compiling…</> : "🎬 Compile Reel"}
                  </button>
                </div>

                {/* Game body */}
                <div className="game-body">

                  {/* Reel cards */}
                  {groupReels.length > 0 && groupReels.map(reel => (
                    <div key={reel.id} className={`reel-card ${reel.status === "complete" ? "complete" : ""}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                            🎬 {reel.player_name || "Unknown Player"}
                            {reel.jersey_number && (
                              <span style={{
                                marginLeft: 8, fontSize: 12, fontWeight: 500,
                                padding: "2px 8px", borderRadius: 20,
                                background: "rgba(232,98,44,0.12)",
                                border: "1px solid rgba(232,98,44,0.25)", color: "#e8622c",
                              }}>
                                #{reel.jersey_number}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                            <span className="pill">📅 <span className="pill-value">{new Date(reel.game_date).toLocaleDateString()}</span></span>
                            <span className="pill">🎞 <span className="pill-value">{reel.clip_count} clip{reel.clip_count !== 1 ? "s" : ""}</span></span>
                            <span className="pill">⏱ <span className="pill-value">{fmtDuration(reel.duration_sec)}</span></span>
                          </div>
                          {reel.status !== "complete" && (
                            <div style={{ fontSize: 12 }}>
                              {reel.status === "pending" || reel.status === "processing" ? (
                                <span style={{ color: "#f0a830" }}><span className="spinner" />{reel.status === "pending" ? "Queued…" : "Compiling…"}</span>
                              ) : (
                                <span style={{ color: "#fca5a5" }}>⚠ Error{reel.error_message ? `: ${reel.error_message}` : ""}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {reel.status === "complete" && (
                          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                            <button className="btn-primary" onClick={() => openReel(reel.id)}>▶ Play</button>
                            <button className="btn-secondary" onClick={() => downloadReel(reel.id, reel.player_name, reel.game_date)}>⬇ Download</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Upload rows */}
                  {group.map(u => (
                    <div key={u.id} className="upload-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 600, fontSize: 15, color: "#fff",
                            marginBottom: 3, overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {u.original_filename}
                          </div>
                          <div style={{ fontSize: 12, color: "#555" }}>
                            {new Date(u.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span className="status-pill">{u.status}</span>
                          <Link href={`/uploads/${u.id}`} className="btn-primary">▶ View Clips</Link>
                          <button
                            className="btn-secondary"
                            onClick={() => downloadUpload(u.id, u.original_filename)}
                            disabled={downloadingId === u.id}
                          >
                            {downloadingId === u.id ? "…" : "⬇"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {/* Footer */}
        <p style={{
          marginTop: 48, fontSize: 14, fontWeight: 500,
          letterSpacing: "2px", textTransform: "uppercase",
          background: "linear-gradient(135deg,#e8622c,#f0a830)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Find Your Flow
        </p>
      </div>
    </>
  );
}