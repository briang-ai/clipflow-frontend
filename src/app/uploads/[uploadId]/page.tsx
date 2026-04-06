"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api";
import { downloadVideo } from "@/lib/downloadVideo";
import Nav from "@/components/Nav";
import RecordFAB from "@/components/RecordFAB";

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

type UploadStatus = "created" | "uploaded" | "processing" | "complete" | "error" | string;

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_SECS    = 600;

export default function UploadDetailPage() {
  const { isLoaded, isSignedIn } = useUser();
  const params = useParams();
  const uploadId = String(params.uploadId);

  const [clips, setClips]               = useState<ClipRow[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("processing");
  const [error, setError]               = useState<string>("");
  const [savingId, setSavingId]         = useState<string>("");
  const [openingId, setOpeningId]       = useState<string>("");
  const [downloadingId, setDownloadingId] = useState<string>("");
  const [downloadPct, setDownloadPct]   = useState<number>(0);

  const [draft, setDraft] = useState<
    Record<string, { player_name: string; jersey_number: string }>
  >({});

  useEffect(() => {
    if (!uploadId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();
    setError("");

    async function poll() {
      if (cancelled) return;
      if (Date.now() - startedAt > MAX_POLL_SECS * 1000) {
        if (!cancelled) setError("Processing is taking longer than expected. Refresh to check again.");
        return;
      }
      try {
        const [statusRes, clipsRes] = await Promise.all([
          fetch(`${API_BASE}/api/debug/uploads/${uploadId}/counts`, { cache: "no-store" }),
          fetch(`${API_BASE}/api/uploads/${uploadId}/clips`, { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (!clipsRes.ok) { setError(await clipsRes.text()); return; }

        if (statusRes.ok) {
          const sd = await statusRes.json();
          setUploadStatus(sd?.upload?.status ?? "processing");
        }

        const data = await clipsRes.json();
        const newClips: ClipRow[] = data.clips ?? [];
        setClips(newClips);
        setDraft(prev => {
          const next = { ...prev };
          for (const c of newClips)
            if (!next[c.id]) next[c.id] = { player_name: c.player_name ?? "", jersey_number: c.jersey_number ?? "" };
          return next;
        });

        const done = uploadStatus === "complete" || uploadStatus === "error";
        if (!cancelled && !done) timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (e: any) {
        if (!cancelled) setError("Network error: " + String(e));
      }
    }

    poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [uploadId]);

  const isProcessing = uploadStatus !== "complete" && uploadStatus !== "error";

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
    if (!data?.download_url) { setError("Missing download_url"); return null; }
    return data.download_url;
  }

  async function openClip(clipId: string) {
    try {
      setError(""); setOpeningId(clipId);
      const url = await getClipUrl(clipId);
      if (!url) return;
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e: any) { setError(String(e)); }
    finally { setOpeningId(""); }
  }

  async function handleDownloadClip(clipId: string, label: string) {
    try {
      setError(""); setDownloadingId(clipId); setDownloadPct(0);
      const url = await getClipUrl(clipId);
      if (!url) return;
      await downloadVideo(url, label || clipId, pct => setDownloadPct(pct));
    } catch (e: any) { setError(String(e)); }
    finally { setDownloadingId(""); setDownloadPct(0); }
  }

  const loadingStyle = { background: "#0a0a0a", minHeight: "100vh", padding: 24, color: "#fff", fontFamily: "'Outfit', system-ui, sans-serif" };
  if (!isLoaded)   return <div style={loadingStyle}>Loading…</div>;
  if (!isSignedIn) return <div style={loadingStyle}>Please sign in.</div>;

  const hitClips   = clips.filter(c => c.is_hit === true);
  const otherClips = clips.filter(c => c.is_hit !== true);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a0a;color:#fff;font-family:'Outfit',-apple-system,system-ui,sans-serif}

        .clip-card{padding:20px;border-radius:16px;background:#141414;border:1px solid #222;margin-bottom:12px;transition:border-color 0.2s}
        .clip-card:hover{border-color:rgba(232,98,44,0.3)}
        .clip-card.hit{border-color:rgba(232,98,44,0.25);background:#161010}

        .clip-input{padding:10px 14px;border-radius:10px;background:#1a1a1a;border:1px solid #2a2a2a;color:#fff;font-size:14px;font-family:'Outfit',sans-serif;outline:none;transition:border-color 0.2s}
        .clip-input:focus{border-color:#e8622c}
        .clip-input::placeholder{color:#555}

        .btn-primary{padding:9px 16px;border-radius:10px;border:none;background:linear-gradient(135deg,#e8622c,#f0a830);color:#fff;font-weight:600;font-size:13px;font-family:'Outfit',sans-serif;cursor:pointer;transition:opacity 0.2s;white-space:nowrap}
        .btn-primary:hover{opacity:0.9}
        .btn-primary:disabled{opacity:0.5;cursor:not-allowed}

        .btn-secondary{padding:9px 16px;border-radius:10px;background:#1a1a1a;border:1px solid #2a2a2a;color:#ccc;font-weight:500;font-size:13px;font-family:'Outfit',sans-serif;cursor:pointer;transition:border-color 0.2s;white-space:nowrap}
        .btn-secondary:hover{border-color:rgba(232,98,44,0.3);color:#fff}
        .btn-secondary:disabled{opacity:0.5;cursor:not-allowed}

        .btn-custom{padding:9px 16px;border-radius:10px;background:#1a1a1a;border:1px solid rgba(232,98,44,0.35);color:#e8622c;font-weight:600;font-size:13px;font-family:'Outfit',sans-serif;cursor:pointer;white-space:nowrap;transition:border-color 0.2s,color 0.2s;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
        .btn-custom:hover{border-color:#e8622c;color:#f0a830}

        .section-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:12px;margin-top:28px}

        .dl-bar-wrap{width:100%;height:3px;background:#222;border-radius:3px;overflow:hidden;margin-top:6px}
        .dl-bar{height:100%;background:linear-gradient(135deg,#e8622c,#f0a830);transition:width 0.2s}

        @keyframes spin{to{transform:rotate(360deg)}}
        .spinner{display:inline-block;width:13px;height:13px;border:2px solid #333;border-top-color:#e8622c;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:6px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .pulse-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#e8622c;margin-right:8px;animation:pulse 1.2s ease-in-out infinite;vertical-align:middle}
      `}</style>

      <Nav />
      <RecordFAB />

      <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'Outfit',-apple-system,system-ui,sans-serif", padding: "32px 24px", maxWidth: 800, margin: "0 auto" }}>

        <Link href="/uploads" style={{ fontSize: 13, color: "#555", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}
          onMouseOver={e => (e.currentTarget.style.color = "#e8622c")}
          onMouseOut={e => (e.currentTarget.style.color = "#555")}>
          ← Back to uploads
        </Link>

        {/* Header row — title + Custom Reel button */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.5px" }}>
            View <span style={{ background: "linear-gradient(135deg,#e8622c,#f0a830)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>clips</span>
          </h1>
          {uploadStatus === "complete" && (
            <Link href={`/reels/new?game=${uploadId}`} className="btn-custom">
              ✂️ Custom Reel
            </Link>
          )}
        </div>

        {isProcessing && (
          <div style={{ marginBottom: 24, padding: "14px 18px", borderRadius: 14, background: "rgba(232,98,44,0.06)", border: "1px solid rgba(232,98,44,0.2)", color: "#f0a830", fontSize: 14, display: "flex", alignItems: "center" }}>
            <span className="pulse-dot" />
            {clips.length === 0 ? "Processing your video — clips will appear here as they're ready…" : `Processing… ${clips.length} clip${clips.length !== 1 ? "s" : ""} found so far`}
          </div>
        )}

        {uploadStatus === "complete" && clips.length > 0 && (
          <div style={{ marginBottom: 24, padding: "14px 18px", borderRadius: 14, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399", fontSize: 14 }}>
            ✅ Processing complete — {clips.length} clip{clips.length !== 1 ? "s" : ""} found, <strong>{hitClips.length} hit{hitClips.length !== 1 ? "s" : ""}</strong> detected
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 14, background: "rgba(252,165,165,0.08)", border: "1px solid rgba(252,165,165,0.2)", color: "#fca5a5", fontSize: 13, whiteSpace: "pre-wrap" }}>{error}</div>
        )}

        {clips.length === 0 && isProcessing && (
          <div style={{ padding: "48px 24px", borderRadius: 16, background: "#141414", border: "1px solid #222", color: "#555", fontSize: 15, textAlign: "center" }}>
            <span className="spinner" />Waiting for clips…
          </div>
        )}

        {hitClips.length > 0 && (
          <>
            <div className="section-label">🎯 Hits detected ({hitClips.length})</div>
            {hitClips.map(c => (
              <ClipCard key={c.id} c={c} draft={draft} setDraft={setDraft}
                savingId={savingId} openingId={openingId}
                downloadingId={downloadingId} downloadPct={downloadPct}
                saveLabels={saveLabels} openClip={openClip}
                downloadClip={handleDownloadClip} isHit />
            ))}
          </>
        )}

        {otherClips.length > 0 && (
          <>
            <div className="section-label">All clips ({otherClips.length})</div>
            {otherClips.map(c => (
              <ClipCard key={c.id} c={c} draft={draft} setDraft={setDraft}
                savingId={savingId} openingId={openingId}
                downloadingId={downloadingId} downloadPct={downloadPct}
                saveLabels={saveLabels} openClip={openClip}
                downloadClip={handleDownloadClip} isHit={false} />
            ))}
          </>
        )}

        <p style={{ marginTop: 48, fontSize: 14, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase", background: "linear-gradient(135deg,#e8622c,#f0a830)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Find Your Flow
        </p>
      </div>
    </>
  );
}

function ClipCard({ c, draft, setDraft, savingId, openingId, downloadingId, downloadPct, saveLabels, openClip, downloadClip, isHit }: {
  c: ClipRow;
  draft: Record<string, { player_name: string; jersey_number: string }>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, { player_name: string; jersey_number: string }>>>;
  savingId: string; openingId: string; downloadingId: string; downloadPct: number;
  saveLabels: (id: string) => void;
  openClip: (id: string) => void;
  downloadClip: (id: string, label: string) => void;
  isHit: boolean;
}) {
  const isDownloading = downloadingId === c.id;
  return (
    <div className={`clip-card${isHit ? " hit" : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{c.label || "Clip"}</div>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>{c.is_hit === true ? "✅ Hit" : c.is_hit === false ? "❌ Not a hit" : "🤷 Unscored"}</span>
            {typeof c.ai_confidence === "number" && (
              <span style={{ padding: "2px 8px", borderRadius: 20, background: "#1a1a1a", border: "1px solid #2a2a2a", fontSize: 12, fontFamily: "monospace" }}>
                {Math.round(c.ai_confidence * 100)}%
              </span>
            )}
          </div>
          {c.ai_reason && <div style={{ fontSize: 13, color: "#555", marginBottom: 8, lineHeight: 1.5 }}>{c.ai_reason}</div>}
          {isDownloading && downloadPct > 0 && (
            <div className="dl-bar-wrap">
              <div className="dl-bar" style={{ width: `${downloadPct}%` }} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button className="btn-primary" onClick={() => openClip(c.id)} disabled={openingId === c.id || isDownloading}>
            {openingId === c.id ? "…" : "▶ Play"}
          </button>
          <button className="btn-secondary" onClick={() => downloadClip(c.id, c.label || c.id)} disabled={isDownloading || openingId === c.id}>
            {isDownloading ? (downloadPct > 0 ? `${downloadPct}%` : "…") : "⬇ Save"}
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: "#222", margin: "14px 0" }} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input className="clip-input" placeholder="Player name"
          value={draft[c.id]?.player_name || ""}
          onChange={e => setDraft(prev => ({ ...prev, [c.id]: { ...(prev[c.id] ?? { player_name: "", jersey_number: "" }), player_name: e.target.value } }))}
          style={{ minWidth: 180 }} />
        <input className="clip-input" placeholder="Jersey #"
          value={draft[c.id]?.jersey_number || ""}
          onChange={e => setDraft(prev => ({ ...prev, [c.id]: { ...(prev[c.id] ?? { player_name: "", jersey_number: "" }), jersey_number: e.target.value } }))}
          style={{ width: 100 }} />
        <button className="btn-secondary" onClick={() => saveLabels(c.id)} disabled={savingId === c.id}>
          {savingId === c.id ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}