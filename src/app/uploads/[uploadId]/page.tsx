"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api";

type ClipRow = {
  id: string;
  upload_id: string;
  bucket: string;
  s3_key: string;
  label?: string | null;
  player_name?: string | null;
  jersey_number?: string | null;
  is_hit?: boolean | null;
  ai_confidence?: number | null;
  ai_reason?: string | null;
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

function fmtDuration(sec: number | null | undefined): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function UploadDetailPage() {
  const { isLoaded, isSignedIn } = useUser();
  const params = useParams();
  const uploadId = String(params.uploadId);

  const [clips, setClips] = useState<ClipRow[]>([]);
  const [reels, setReels] = useState<ReelRow[]>([]);
  const [error, setError] = useState<string>("");
  const [savingId, setSavingId] = useState<string>("");
  const [openingId, setOpeningId] = useState<string>("");
  const [downloadingId, setDownloadingId] = useState<string>("");
  const [compilingId, setCompilingId] = useState<string>("");   // reelId being polled
  const [compileError, setCompileError] = useState<string>("");

  const [draft, setDraft] = useState<
    Record<string, { player_name: string; jersey_number: string }>
  >({});

  // ── clip polling ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastCount = -1;
    let unchangedPolls = 0;

    async function poll() {
      try {
        if (cancelled) return;
        const res = await fetch(`${API_BASE}/api/uploads/${uploadId}/clips`, { cache: "no-store" });
        if (!res.ok) { if (!cancelled) setError(await res.text()); return; }
        const data = await res.json();
        const newClips: ClipRow[] = data.clips ?? [];
        if (cancelled) return;
        setClips(newClips);
        setDraft((prev) => {
          const next = { ...prev };
          for (const c of newClips) {
            if (!next[c.id])
              next[c.id] = { player_name: c.player_name ?? "", jersey_number: c.jersey_number ?? "" };
          }
          return next;
        });
        if (newClips.length !== lastCount) { lastCount = newClips.length; unchangedPolls = 0; }
        else unchangedPolls += 1;
        if (!cancelled && unchangedPolls < 3) timer = setTimeout(poll, 2000);
      } catch (e: any) { if (!cancelled) setError(String(e)); }
    }

    if (uploadId) { setError(""); poll(); }
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [uploadId]);

  // ── reel polling (only while a reel is pending/processing) ──────────────────
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function pollReels() {
      if (cancelled) return;
      try {
        const res = await fetch(`${API_BASE}/api/uploads/${uploadId}/reels`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const rows: ReelRow[] = data.reels ?? [];
        if (!cancelled) setReels(rows);

        const stillWorking = rows.some(r => r.status === "pending" || r.status === "processing");
        if (stillWorking && !cancelled) timer = setTimeout(pollReels, 3000);
        else setCompilingId("");
      } catch { /* silent */ }
    }

    pollReels();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [uploadId, compilingId]); // re-run when a new compile is kicked off

  // ── compile a reel for this upload ─────────────────────────────────────────
  async function compileReel() {
    try {
      setCompileError("");
      const hitClipIds = clips.filter(c => c.is_hit === true).map(c => c.id);
      if (hitClipIds.length === 0) {
        setCompileError("No hits found on this upload to compile.");
        return;
      }

      const res = await fetch(`${API_BASE}/api/reels/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_id: uploadId, clip_ids: hitClipIds }),
      });
      if (!res.ok) { setCompileError(await res.text()); return; }
      const data = await res.json();
      setCompilingId(data.reel_id);   // triggers reel polling
    } catch (e: any) { setCompileError(String(e)); }
  }

  // ── clip helpers ────────────────────────────────────────────────────────────
  async function saveLabels(clipId: string) {
    try {
      setError(""); setSavingId(clipId);
      const payload = draft[clipId] ?? { player_name: "", jersey_number: "" };
      const res = await fetch(`${API_BASE}/api/clips/${clipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { setError(await res.text()); return; }
      setClips(prev => prev.map(c => c.id === clipId ? { ...c, ...payload } : c));
    } catch (e: any) { setError(String(e)); }
    finally { setSavingId(""); }
  }

  async function getClipUrl(clipId: string): Promise<string | null> {
    const res = await fetch(`${API_BASE}/api/clips/${clipId}/download`, { cache: "no-store" });
    if (!res.ok) { setError(await res.text()); return null; }
    const data = await res.json();
    const url = data?.download_url;
    if (!url) { setError("Missing download_url: " + JSON.stringify(data)); return null; }
    return url;
  }

  async function openClip(clipId: string) {
    try {
      setError(""); setOpeningId(clipId);
      const newWindow = window.open("", "_blank");
      const url = await getClipUrl(clipId);
      if (!url) { newWindow?.close(); return; }
      if (newWindow) newWindow.location.href = url;
      else {
        const a = document.createElement("a");
        a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    } catch (e: any) { setError(String(e)); }
    finally { setOpeningId(""); }
  }

  async function downloadClip(clipId: string, label: string) {
    try {
      setError(""); setDownloadingId(clipId);
      const newWindow = window.open("", "_blank");
      const url = await getClipUrl(clipId);
      if (!url) { newWindow?.close(); return; }
      if (newWindow) newWindow.location.href = url;
      else {
        const a = document.createElement("a");
        a.href = url; a.download = `${label || clipId}.mp4`;
        a.target = "_blank"; a.rel = "noopener noreferrer";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    } catch (e: any) { setError(String(e)); }
    finally { setDownloadingId(""); }
  }

  // ── reel helpers ────────────────────────────────────────────────────────────
  async function getReelUrl(reelId: string): Promise<string | null> {
    const res = await fetch(`${API_BASE}/api/reels/${reelId}/download`, { cache: "no-store" });
    if (!res.ok) { setCompileError(await res.text()); return null; }
    const data = await res.json();
    return data?.download_url ?? null;
  }

  async function openReel(reelId: string) {
    try {
      setCompileError(""); setOpeningId(`reel_${reelId}`);
      const newWindow = window.open("", "_blank");
      const url = await getReelUrl(reelId);
      if (!url) { newWindow?.close(); return; }
      if (newWindow) newWindow.location.href = url;
    } catch (e: any) { setCompileError(String(e)); }
    finally { setOpeningId(""); }
  }

  async function downloadReel(reelId: string, playerName: string, gameDate: string) {
    try {
      setCompileError(""); setDownloadingId(`reel_${reelId}`);
      const newWindow = window.open("", "_blank");
      const url = await getReelUrl(reelId);
      if (!url) { newWindow?.close(); return; }
      if (newWindow) newWindow.location.href = url;
      else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `highlight_${playerName}_${gameDate}.mp4`;
        a.target = "_blank"; a.rel = "noopener noreferrer";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    } catch (e: any) { setCompileError(String(e)); }
    finally { setDownloadingId(""); }
  }

  // ── derived ─────────────────────────────────────────────────────────────────
  const hitCount = clips.filter(c => c.is_hit === true).length;
  const hasActiveReel = reels.some(r => r.status === "pending" || r.status === "processing");

  const loadingStyle = {
    background: "#0a0a0a", minHeight: "100vh", padding: 24,
    color: "#fff", fontFamily: "'Outfit', system-ui, sans-serif",
  };

  if (!isLoaded) return <div style={loadingStyle}>Loading…</div>;
  if (!isSignedIn) return <div style={loadingStyle}>Please sign in.</div>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a0a;color:#fff;font-family:'Outfit',-apple-system,system-ui,sans-serif}

        .clip-card{
          padding:20px;border-radius:16px;
          background:#141414;border:1px solid #222;
          margin-bottom:12px;transition:border-color 0.2s;
        }
        .clip-card:hover{border-color:rgba(232,98,44,0.3)}

        .reel-card{
          padding:20px;border-radius:16px;
          background:#141414;border:1px solid #2a2a2a;
          margin-bottom:12px;transition:border-color 0.2s;
        }
        .reel-card:hover{border-color:rgba(232,98,44,0.4)}
        .reel-card.complete{border-color:rgba(232,98,44,0.25)}

        .clip-input{
          padding:10px 14px;border-radius:10px;
          background:#1a1a1a;border:1px solid #2a2a2a;
          color:#fff;font-size:14px;font-family:'Outfit',sans-serif;
          outline:none;transition:border-color 0.2s;
        }
        .clip-input:focus{border-color:#e8622c}
        .clip-input::placeholder{color:#555}

        .btn-primary{
          padding:9px 16px;border-radius:10px;border:none;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-weight:600;font-size:13px;
          font-family:'Outfit',sans-serif;cursor:pointer;
          transition:opacity 0.2s;white-space:nowrap;
        }
        .btn-primary:hover{opacity:0.9}
        .btn-primary:disabled{opacity:0.5;cursor:not-allowed}

        .btn-secondary{
          padding:9px 16px;border-radius:10px;
          background:#1a1a1a;border:1px solid #2a2a2a;
          color:#ccc;font-weight:500;font-size:13px;
          font-family:'Outfit',sans-serif;cursor:pointer;
          transition:border-color 0.2s;white-space:nowrap;
        }
        .btn-secondary:hover{border-color:rgba(232,98,44,0.3);color:#fff}
        .btn-secondary:disabled{opacity:0.5;cursor:not-allowed}

        .pill{
          display:inline-flex;align-items:center;gap:6px;
          padding:4px 10px;border-radius:20px;
          background:#1a1a1a;border:1px solid #2a2a2a;
          font-size:12px;color:#888;
        }
        .pill-value{color:#ccc;font-weight:500}

        @keyframes spin{to{transform:rotate(360deg)}}
        .spinner{
          display:inline-block;width:14px;height:14px;
          border:2px solid #333;border-top-color:#e8622c;
          border-radius:50%;animation:spin 0.7s linear infinite;
          vertical-align:middle;margin-right:6px;
        }
      `}</style>

      <div style={{
        background: "#0a0a0a", minHeight: "100vh",
        fontFamily: "'Outfit', -apple-system, system-ui, sans-serif",
        padding: "48px 24px", maxWidth: 800, margin: "0 auto",
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 36 }}>
          <img src="/logo.png" alt="ClipFlow — Find Your Flow" style={{ width: 140, height: "auto" }} />
        </div>

        {/* Back link */}
        <Link href="/uploads" style={{
          fontSize: 13, color: "#666", textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24,
        }}
          onMouseOver={e => (e.currentTarget.style.color = "#e8622c")}
          onMouseOut={e => (e.currentTarget.style.color = "#666")}
        >
          ← Back to uploads
        </Link>

        {/* Header */}
        <h1 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.5px", marginBottom: 8 }}>
          <span style={{
            background: "linear-gradient(135deg,#e8622c,#f0a830)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Clips
          </span>
        </h1>
        <div style={{ fontFamily: "monospace", fontSize: 12, color: "#555", marginBottom: 32 }}>
          Upload ID: {uploadId}
        </div>

        {/* Clip error */}
        {error && (
          <div style={{
            marginBottom: 20, padding: "14px 18px", borderRadius: 14,
            background: "rgba(252,165,165,0.08)", border: "1px solid rgba(252,165,165,0.2)",
            color: "#fca5a5", fontSize: 13, whiteSpace: "pre-wrap",
          }}>{error}</div>
        )}

        {/* ── REELS SECTION ─────────────────────────────────────────────────── */}
        <div style={{
          marginBottom: 40, padding: "24px", borderRadius: 18,
          background: "#111", border: "1px solid #1e1e1e",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Highlight Reels</h2>
              <p style={{ fontSize: 13, color: "#555" }}>
                {hitCount > 0 ? `${hitCount} hit clip${hitCount !== 1 ? "s" : ""} ready to compile` : "No hit clips on this upload yet"}
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={compileReel}
              disabled={hitCount === 0 || hasActiveReel}
            >
              {hasActiveReel ? <><span className="spinner" />Compiling…</> : "🎬 Compile Reel"}
            </button>
          </div>

          {/* Compile error */}
          {compileError && (
            <div style={{
              marginBottom: 16, padding: "12px 16px", borderRadius: 12,
              background: "rgba(252,165,165,0.08)", border: "1px solid rgba(252,165,165,0.2)",
              color: "#fca5a5", fontSize: 13,
            }}>{compileError}</div>
          )}

          {/* Reel cards */}
          {reels.length === 0 ? (
            <div style={{
              padding: "20px", borderRadius: 12, border: "1px dashed #222",
              color: "#444", fontSize: 14, textAlign: "center",
            }}>
              No reels compiled yet — hit "Compile Reel" to get started.
            </div>
          ) : (
            reels.map(reel => (
              <div key={reel.id} className={`reel-card ${reel.status === "complete" ? "complete" : ""}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>

                  {/* Left: metadata */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Player name + jersey */}
                    <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>
                      {reel.player_name || "Unknown Player"}
                      {reel.jersey_number && (
                        <span style={{
                          marginLeft: 10, fontSize: 13, fontWeight: 500,
                          padding: "2px 10px", borderRadius: 20,
                          background: "linear-gradient(135deg,rgba(232,98,44,0.15),rgba(240,168,48,0.15))",
                          border: "1px solid rgba(232,98,44,0.25)", color: "#e8622c",
                        }}>
                          #{reel.jersey_number}
                        </span>
                      )}
                    </div>

                    {/* Pills: date / clips / duration */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      <span className="pill">
                        📅 <span className="pill-value">{new Date(reel.game_date).toLocaleDateString()}</span>
                      </span>
                      <span className="pill">
                        🎞 <span className="pill-value">{reel.clip_count} clip{reel.clip_count !== 1 ? "s" : ""}</span>
                      </span>
                      <span className="pill">
                        ⏱ <span className="pill-value">{fmtDuration(reel.duration_sec)}</span>
                      </span>
                    </div>

                    {/* Status badge */}
                    {reel.status !== "complete" && (
                      <div style={{ fontSize: 13 }}>
                        {reel.status === "pending" || reel.status === "processing" ? (
                          <span style={{ color: "#f0a830" }}>
                            <span className="spinner" />
                            {reel.status === "pending" ? "Queued…" : "Compiling…"}
                          </span>
                        ) : (
                          <span style={{ color: "#fca5a5" }}>
                            ⚠ Error{reel.error_message ? `: ${reel.error_message}` : ""}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: play / download buttons (only when complete) */}
                  {reel.status === "complete" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                      <button
                        className="btn-primary"
                        onClick={() => openReel(reel.id)}
                        disabled={openingId === `reel_${reel.id}` || downloadingId === `reel_${reel.id}`}
                      >
                        {openingId === `reel_${reel.id}` ? "Opening…" : "▶ Play"}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => downloadReel(reel.id, reel.player_name, reel.game_date)}
                        disabled={downloadingId === `reel_${reel.id}` || openingId === `reel_${reel.id}`}
                      >
                        {downloadingId === `reel_${reel.id}` ? "…" : "⬇ Download"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── CLIPS SECTION ─────────────────────────────────────────────────── */}
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>All Clips</h2>

        {clips.length === 0 ? (
          <div style={{
            padding: "32px 24px", borderRadius: 16,
            background: "#141414", border: "1px solid #222",
            color: "#666", fontSize: 15, textAlign: "center",
          }}>
            ⏳ Processing clips… this page will refresh automatically.
          </div>
        ) : (
          clips.map(c => (
            <div key={c.id} className="clip-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10 }}>{c.label || "Clip"}</div>
                  <div style={{ fontSize: 13, color: "#999", marginBottom: 6 }}>
                    <span style={{ marginRight: 6 }}>
                      {c.is_hit === true ? "✅ Hit" : c.is_hit === false ? "❌ Not a hit" : "🤷 Not scored"}
                    </span>
                    {typeof c.ai_confidence === "number" && (
                      <span style={{
                        padding: "2px 8px", borderRadius: 20,
                        background: "#1a1a1a", border: "1px solid #2a2a2a",
                        fontSize: 12, fontFamily: "monospace",
                      }}>
                        {Math.round(c.ai_confidence * 100)}%
                      </span>
                    )}
                  </div>
                  {c.ai_reason && (
                    <div style={{ fontSize: 13, color: "#666", marginBottom: 8, lineHeight: 1.5 }}>{c.ai_reason}</div>
                  )}
                  <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#444" }}>{c.s3_key}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  <button className="btn-primary" onClick={() => openClip(c.id)}
                    disabled={openingId === c.id || downloadingId === c.id}>
                    {openingId === c.id ? "Opening…" : "▶ Play"}
                  </button>
                  <button className="btn-secondary" onClick={() => downloadClip(c.id, c.label || c.id)}
                    disabled={downloadingId === c.id || openingId === c.id}>
                    {downloadingId === c.id ? "…" : "⬇ Download"}
                  </button>
                </div>
              </div>

              <div style={{ height: 1, background: "#222", margin: "14px 0" }} />

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input className="clip-input" placeholder="Player name"
                  value={draft[c.id]?.player_name || ""}
                  onChange={e => setDraft(prev => ({
                    ...prev,
                    [c.id]: { ...(prev[c.id] ?? { player_name: "", jersey_number: "" }), player_name: e.target.value },
                  }))}
                  style={{ minWidth: 200 }}
                />
                <input className="clip-input" placeholder="Jersey #"
                  value={draft[c.id]?.jersey_number || ""}
                  onChange={e => setDraft(prev => ({
                    ...prev,
                    [c.id]: { ...(prev[c.id] ?? { player_name: "", jersey_number: "" }), jersey_number: e.target.value },
                  }))}
                  style={{ width: 110 }}
                />
                <button className="btn-secondary" onClick={() => saveLabels(c.id)} disabled={savingId === c.id}>
                  {savingId === c.id ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ))
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