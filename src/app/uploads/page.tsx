"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { downloadVideo } from "@/lib/downloadVideo";
import { API_BASE } from "@/lib/api";
import Nav from "@/components/Nav";
import RecordFAB from "@/components/RecordFAB";

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

type UploadSummary = {
  hit_count: number;
  swing_count: number;
  total_clips: number;
};

type CompileMode = "hits_only" | "all_swings";

function groupIntoGames(uploads: UploadRow[]): UploadRow[][] {
  if (!uploads.length) return [];
  const sorted = [...uploads].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const groups: UploadRow[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].created_at).getTime();
    const curr = new Date(sorted[i].created_at).getTime();
    if (curr - prev <= 3 * 60 * 60 * 1000) groups[groups.length - 1].push(sorted[i]);
    else groups.push([sorted[i]]);
  }
  return groups.reverse();
}

function fmtGameLabel(group: UploadRow[]): string {
  const d = new Date(group[0].created_at);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function fmtDuration(sec: number | null | undefined): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function fetchReelsForUploads(uploadIds: string[]): Promise<Record<string, ReelRow[]>> {
  const results: Record<string, ReelRow[]> = {};
  await Promise.all(
    uploadIds.map(async id => {
      try {
        const res = await fetch(`${API_BASE}/api/uploads/${id}/reels`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        results[id] = data.reels ?? [];
      } catch { /* silent */ }
    })
  );
  return results;
}

async function fetchSummariesForUploads(uploadIds: string[]): Promise<Record<string, UploadSummary>> {
  const results: Record<string, UploadSummary> = {};
  await Promise.all(
    uploadIds.map(async id => {
      try {
        const res = await fetch(`${API_BASE}/api/uploads/${id}/summary`, { cache: "no-store" });
        if (!res.ok) return;
        results[id] = await res.json();
      } catch { /* silent */ }
    })
  );
  return results;
}

async function fetchThumbnailsForUploads(uploadIds: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  await Promise.all(
    uploadIds.map(async id => {
      try {
        const res = await fetch(`${API_BASE}/api/uploads/${id}/thumbnail`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.thumbnail_url) results[id] = data.thumbnail_url;
      } catch { /* silent */ }
    })
  );
  return results;
}

// ── UploadCard ────────────────────────────────────────────────────────────────

function UploadCard({
  u, summary, thumbnailUrl, isSelected, isDeleting, onToggle, onDelete,
}: {
  u: UploadRow;
  summary?: UploadSummary;
  thumbnailUrl?: string;
  isSelected: boolean;
  isDeleting: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered]         = useState(false);
  const [clipUrl, setClipUrl]         = useState<string | null>(null);
  const [loadingClip, setLoadingClip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  async function handleMouseEnter() {
    setHovered(true);
    if (!clipUrl && !loadingClip && u.status === "complete") {
      setLoadingClip(true);
      try {
        const clipsRes = await fetch(`${API_BASE}/api/uploads/${u.id}/clips`, { cache: "no-store" });
        if (clipsRes.ok) {
          const data = await clipsRes.json();
          const firstClip = (data.clips ?? [])[0];
          if (firstClip) {
            const dlRes = await fetch(`${API_BASE}/api/clips/${firstClip.id}/download`, { cache: "no-store" });
            if (dlRes.ok) {
              const dlData = await dlRes.json();
              setClipUrl(dlData.download_url ?? null);
            }
          }
        }
      } catch { /* silent */ }
      finally { setLoadingClip(false); }
    }
  }

  function handleMouseLeave() {
    setHovered(false);
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
  }

  useEffect(() => {
    if (hovered && clipUrl && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [hovered, clipUrl]);

  return (
    <div
      className={`upload-card${isSelected ? " selected" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#0d0d0d", overflow: "hidden" }}>
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            opacity: hovered && clipUrl ? 0 : 1, transition: "opacity 0.25s",
          }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 28 }}>🎥</div>
        )}
        {u.status === "complete" && (
          <video ref={videoRef} src={clipUrl ?? undefined} muted playsInline loop style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            opacity: hovered && clipUrl ? 1 : 0, transition: "opacity 0.25s",
          }} />
        )}
        {hovered && loadingClip && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
            <span className="spinner" />
          </div>
        )}
        {u.status !== "complete" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", fontSize: 12, color: "#f0a830" }}>
            {u.status === "processing" ? <><span className="spinner" />Processing…</> : u.status === "error" ? "⚠ Error" : "⏳ Queued"}
          </div>
        )}
        {hovered && clipUrl && (
          <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "2px 7px", fontSize: 11, color: "#fff" }}>
            ▶ live
          </div>
        )}
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <input type="checkbox" className="cb" checked={isSelected} onChange={onToggle} />
        </div>
      </div>
      <div className="upload-info">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 12, color: "#666" }}>{fmtTime(u.created_at)}</div>
          <button className="btn-trash" onClick={onDelete} disabled={isDeleting}>
            {isDeleting ? <span className="spinner" /> : "🗑️"}
          </button>
        </div>
        {summary && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
            {summary.hit_count > 0 && <span className="pill hit">⚾ {summary.hit_count} hit{summary.hit_count !== 1 ? "s" : ""}</span>}
            {summary.swing_count > summary.hit_count && (
              <span className="pill swing">🏏 {summary.swing_count - summary.hit_count} miss{summary.swing_count - summary.hit_count !== 1 ? "es" : ""}</span>
            )}
            {summary.total_clips === 0 && <span className="pill">Processing…</span>}
          </div>
        )}
        <Link href={`/uploads/${u.id}`} className="btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none", width: "100%", padding: "6px 0" }}>
          View clips
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UploadsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [uploads, setUploads]               = useState<UploadRow[]>([]);
  const [error, setError]                   = useState<string>("");
  const [reelsByUpload, setReelsByUpload]   = useState<Record<string, ReelRow[]>>({});
  const [summaries, setSummaries]           = useState<Record<string, UploadSummary>>({});
  const [thumbnails, setThumbnails]         = useState<Record<string, string>>({});
  const [compilingGroup, setCompilingGroup] = useState<string>("");
  const [compileError, setCompileError]     = useState<string>("");
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds]       = useState<Set<string>>(new Set());
  const [deletingReelIds, setDeletingReelIds] = useState<Set<string>>(new Set());
  const [reelSaveHint, setReelSaveHint] = useState<string>("");
  const [modeByGroup, setModeByGroup]       = useState<Record<string, CompileMode>>({});
  const [confirmModal, setConfirmModal]     = useState<{
    mode: "single" | "bulk"; uploadIds: string[]; label: string;
  } | null>(null);

  const myUploads = useMemo(() => {
    const uid = user?.id;
    if (!uid) return [];
    return uploads.filter(u => u.user_id === uid);
  }, [uploads, user?.id]);

  const gameGroups = useMemo(() => groupIntoGames(myUploads), [myUploads]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch(`${API_BASE}/api/uploads/recent?limit=50`, { cache: "no-store" })
      .then(r => r.json()).then(d => setUploads(d.uploads ?? []))
      .catch(e => setError(`Network error: ${String(e)}`));
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!myUploads.length) return;
    const ids = myUploads.map(u => u.id);
    fetchReelsForUploads(ids).then(setReelsByUpload);
    fetchSummariesForUploads(ids).then(setSummaries);
    fetchThumbnailsForUploads(ids).then(setThumbnails);
  }, [myUploads]);

  useEffect(() => {
    const allReels = Object.values(reelsByUpload).flat();
    const stillWorking = allReels.some(r => r.status === "pending" || r.status === "processing");
    if (!stillWorking) { setCompilingGroup(""); return; }
    const timer = setTimeout(async () => {
      const fresh = await fetchReelsForUploads(myUploads.map(u => u.id));
      setReelsByUpload(prev => ({ ...prev, ...fresh }));
    }, 3000);
    return () => clearTimeout(timer);
  }, [reelsByUpload, myUploads]);

  async function compileGroup(group: UploadRow[], groupKey: string) {
    setCompileError(""); setCompilingGroup(groupKey);
    const mode = modeByGroup[groupKey] ?? "hits_only";
    try {
      const allHitClipIds: string[] = [];
      await Promise.all(group.map(async u => {
        try {
          const res = await fetch(`${API_BASE}/api/uploads/${u.id}/clips`, { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          const hits = (data.clips ?? []).filter((c: any) => c.is_hit === true).map((c: any) => c.id);
          allHitClipIds.push(...hits);
        } catch { /* silent */ }
      }));
      if (!allHitClipIds.length) { setCompileError("No hit clips found. Try uploading more game footage."); setCompilingGroup(""); return; }
      const res = await fetch(`${API_BASE}/api/reels/compile`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_id: group[0].id, clip_ids: allHitClipIds, watermark: true, mode }),
      });
      if (!res.ok) { setCompileError(await res.text()); setCompilingGroup(""); return; }
      const fresh = await fetchReelsForUploads(group.map(u => u.id));
      setReelsByUpload(prev => ({ ...prev, ...fresh }));
    } catch (e: any) { setCompileError(String(e)); setCompilingGroup(""); }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSelectAll(groupUploads: UploadRow[]) {
    const ids = groupUploads.map(u => u.id);
    const allSel = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (allSel) ids.forEach(id => n.delete(id)); else ids.forEach(id => n.add(id));
      return n;
    });
  }
  function requestDelete(uploadIds: string[], label: string, mode: "single" | "bulk") {
    setConfirmModal({ mode, uploadIds, label });
  }
  async function confirmDelete() {
    if (!confirmModal) return;
    const { uploadIds } = confirmModal;
    setConfirmModal(null);
    setDeletingIds(prev => new Set([...prev, ...uploadIds]));
    try {
      if (uploadIds.length === 1) {
        await fetch(`${API_BASE}/api/uploads/${uploadIds[0]}`, { method: "DELETE" });
      } else {
        await fetch(`${API_BASE}/api/uploads/bulk`, {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upload_ids: uploadIds }),
        });
      }
      setUploads(prev => prev.filter(u => !uploadIds.includes(u.id)));
      setSelectedIds(prev => { const n = new Set(prev); uploadIds.forEach(id => n.delete(id)); return n; });
      setReelsByUpload(prev => { const n = { ...prev }; uploadIds.forEach(id => delete n[id]); return n; });
      setSummaries(prev => { const n = { ...prev }; uploadIds.forEach(id => delete n[id]); return n; });
      setThumbnails(prev => { const n = { ...prev }; uploadIds.forEach(id => delete n[id]); return n; });
    } catch (e: any) { setError(`Delete failed: ${String(e)}`); }
    finally { setDeletingIds(prev => { const n = new Set(prev); uploadIds.forEach(id => n.delete(id)); return n; }); }
  }

  async function getReelUrl(reelId: string): Promise<string | null> {
    const res = await fetch(`${API_BASE}/api/reels/${reelId}/download`, { cache: "no-store" });
    if (!res.ok) { setCompileError(await res.text()); return null; }
    return (await res.json())?.download_url ?? null;
  }
  async function openReel(reelId: string) {
    const win = window.open("", "_blank");
    const url = await getReelUrl(reelId);
    if (!url) { win?.close(); return; }
    if (win) win.location.href = url;
  }
  async function shareReel(reelId: string) {
    const shareUrl = `${window.location.origin}/share/${reelId}`;
    try {
      if (navigator.share) await navigator.share({ title: "Check out my highlight reel!", url: shareUrl });
      else { await navigator.clipboard.writeText(shareUrl); setCopiedReelId(reelId); setTimeout(() => setCopiedReelId(""), 2000); }
    } catch { /* cancelled */ }
  }
  async function deleteReel(reelId: string, uploadId: string) {
    setDeletingReelIds(prev => new Set([...prev, reelId]));
    try {
      const res = await fetch(`${API_BASE}/api/reels/${reelId}`, { method: "DELETE" });
      if (!res.ok) { setCompileError(await res.text()); return; }
      setReelsByUpload(prev => ({ ...prev, [uploadId]: (prev[uploadId] ?? []).filter(r => r.id !== reelId) }));
    } catch (e: any) { setCompileError(`Delete failed: ${String(e)}`); }
    finally { setDeletingReelIds(prev => { const n = new Set(prev); n.delete(reelId); return n; }); }
  }
  async function downloadReel(reelId: string, playerName: string, gameDate: string) {
    try {
      const url = await getReelUrl(reelId);
      if (!url) return;
      const filename = `highlight_${playerName}_${gameDate}`;
      if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
        window.open(url, "_blank");
        setReelSaveHint("Tap the share icon (⬆) at the bottom of the screen, then tap Save Video to save to your camera roll.");
        setTimeout(() => setReelSaveHint(""), 8000);
        return;
      }
      await downloadVideo(url, filename);
    } catch (e: any) {
      setCompileError(`Download failed: ${String(e)}`);
    }
  }

  const loadingStyle = { background: "#0a0a0a", minHeight: "100vh", padding: 24, color: "#fff", fontFamily: "'Outfit', system-ui, sans-serif" };
  if (!isLoaded)   return <div style={loadingStyle}>Loading…</div>;
  if (!isSignedIn) return <div style={loadingStyle}>Please sign in.</div>;

  const anySelected = selectedIds.size > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a0a;color:#fff;font-family:'Outfit',-apple-system,system-ui,sans-serif}

        .upload-card{border-radius:14px;background:#141414;border:1px solid #222;overflow:hidden;transition:border-color 0.2s;cursor:default}
        .upload-card:hover{border-color:rgba(232,98,44,0.25)}
        .upload-card.selected{border-color:rgba(232,98,44,0.5);background:#161010}
        .upload-info{padding:12px 14px}

        .reel-card{padding:14px 16px;border-radius:14px;background:#0f0f0f;border:1px solid #1e1e1e;transition:border-color 0.2s}
        .reel-card.complete{border-color:rgba(232,98,44,0.2)}

        .pill{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;background:#1a1a1a;border:1px solid #2a2a2a;font-size:11px;color:#888}
        .pill-value{color:#ccc;font-weight:500}
        .pill.hit{background:rgba(232,98,44,0.08);border-color:rgba(232,98,44,0.2);color:#e8622c}
        .pill.swing{background:rgba(240,168,48,0.08);border-color:rgba(240,168,48,0.2);color:#f0a830}

        .btn-primary{padding:6px 12px;border-radius:9px;border:none;background:linear-gradient(135deg,#e8622c,#f0a830);color:#fff;font-weight:600;font-size:12px;font-family:'Outfit',sans-serif;cursor:pointer;white-space:nowrap;transition:opacity 0.2s}
        .btn-primary:hover{opacity:0.9}
        .btn-primary:disabled{opacity:0.5;cursor:not-allowed}

        .btn-secondary{padding:6px 12px;border-radius:9px;background:#1a1a1a;border:1px solid #2a2a2a;color:#ccc;font-weight:500;font-size:12px;font-family:'Outfit',sans-serif;cursor:pointer;white-space:nowrap;transition:border-color 0.2s}
        .btn-secondary:hover{border-color:rgba(232,98,44,0.4);color:#fff}
        .btn-secondary:disabled{opacity:0.5;cursor:not-allowed}

        .btn-share{padding:6px 12px;border-radius:9px;background:#1a1a1a;border:1px solid rgba(232,98,44,0.3);color:#e8622c;font-weight:500;font-size:12px;font-family:'Outfit',sans-serif;cursor:pointer;white-space:nowrap;transition:border-color 0.2s}
        .btn-share:hover{border-color:#e8622c}
        .btn-share.copied{border-color:#34d399;color:#34d399}

        .btn-danger{padding:6px 12px;border-radius:9px;background:#1a1a1a;border:1px solid rgba(239,68,68,0.3);color:#ef4444;font-weight:500;font-size:12px;font-family:'Outfit',sans-serif;cursor:pointer;white-space:nowrap;transition:border-color 0.2s}
        .btn-danger:hover{border-color:#ef4444}
        .btn-danger:disabled{opacity:0.5;cursor:not-allowed}

        .btn-compile{padding:9px 16px;border-radius:10px;border:none;background:linear-gradient(135deg,#e8622c,#f0a830);color:#fff;font-weight:600;font-size:13px;font-family:'Outfit',sans-serif;cursor:pointer;white-space:nowrap;transition:opacity 0.2s}
        .btn-compile:hover{opacity:0.9}
        .btn-compile:disabled{opacity:0.5;cursor:not-allowed}

        .btn-custom{padding:9px 16px;border-radius:10px;background:#1a1a1a;border:1px solid rgba(232,98,44,0.35);color:#e8622c;font-weight:600;font-size:13px;font-family:'Outfit',sans-serif;cursor:pointer;white-space:nowrap;transition:border-color 0.2s,color 0.2s;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
        .btn-custom:hover{border-color:#e8622c;color:#f0a830}

        .mode-toggle{display:flex;border-radius:8px;overflow:hidden;border:1px solid #2a2a2a;background:#111}
        .mode-btn{padding:5px 10px;font-size:11px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;border:none;background:transparent;color:#555;transition:background 0.15s,color 0.15s;white-space:nowrap}
        .mode-btn.active{background:rgba(232,98,44,0.15);color:#e8622c}

        .game-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:14px 16px;border-radius:14px 14px 0 0;background:#111;border:1px solid #1e1e1e;border-bottom:none}
        .game-body{padding:10px;border-radius:0 0 14px 14px;background:#0d0d0d;border:1px solid #1e1e1e;border-top:none;display:flex;flex-direction:column;gap:8px;margin-bottom:20px}

        .uploads-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        @media(max-width:480px){.uploads-grid{grid-template-columns:1fr}}

        .cb{width:16px;height:16px;border-radius:4px;border:1px solid #333;background:#1a1a1a;appearance:none;-webkit-appearance:none;cursor:pointer;flex-shrink:0;position:relative;transition:border-color 0.15s,background 0.15s}
        .cb:checked{background:linear-gradient(135deg,#e8622c,#f0a830);border-color:#e8622c}
        .cb:checked::after{content:'';position:absolute;left:4px;top:1px;width:4px;height:8px;border:2px solid #fff;border-left:none;border-top:none;transform:rotate(45deg)}

        .btn-trash{padding:5px 7px;border-radius:7px;background:transparent;border:1px solid transparent;color:#555;font-size:13px;cursor:pointer;transition:color 0.15s,border-color 0.15s;line-height:1}
        .btn-trash:hover{color:#ef4444;border-color:rgba(239,68,68,0.3)}
        .btn-trash:disabled{opacity:0.3;cursor:not-allowed}

        .bulk-bar{position:sticky;top:68px;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 16px;border-radius:12px;background:#1a0e0e;border:1px solid rgba(239,68,68,0.3);margin-bottom:16px}

        .modal-overlay{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px}
        .modal{background:#141414;border:1px solid #2a2a2a;border-radius:20px;padding:28px 24px;max-width:400px;width:100%}

        @keyframes spin{to{transform:rotate(360deg)}}
        .spinner{display:inline-block;width:12px;height:12px;border:2px solid #333;border-top-color:#e8622c;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:4px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .pulse{animation:pulse 1.5s ease-in-out infinite}
      `}</style>

      <Nav />
      <RecordFAB />

      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 22, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Delete upload{confirmModal.uploadIds.length > 1 ? "s" : ""}?</div>
            <div style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 24 }}>
              {confirmModal.mode === "bulk"
                ? `Permanently delete ${confirmModal.uploadIds.length} uploads, all clips and reels. Cannot be undone.`
                : <>Permanently delete <strong style={{ color: "#ccc" }}>{confirmModal.label}</strong> and all its clips and reels. Cannot be undone.</>}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontWeight: 600, fontSize: 13, fontFamily: "'Outfit',sans-serif", cursor: "pointer" }}>
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'Outfit',-apple-system,system-ui,sans-serif", padding: "32px 20px", maxWidth: 720, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>
            My <span style={{ background: "linear-gradient(135deg,#e8622c,#f0a830)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>uploads</span>
          </h1>
          <a href="mailto:info@clipflow.pro?subject=ClipFlow%20Beta%20Feedback"
            style={{ padding: "8px 16px", borderRadius: 10, background: "#141414", border: "1px solid rgba(232,98,44,0.35)", color: "#f0a830", fontWeight: 600, fontSize: 13, fontFamily: "'Outfit',sans-serif", textDecoration: "none" }}
            onMouseOver={e => (e.currentTarget.style.borderColor = "#e8622c")}
            onMouseOut={e => (e.currentTarget.style.borderColor = "rgba(232,98,44,0.35)")}>
            💬 Feedback
          </a>
        </div>

        {error && <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(252,165,165,0.08)", border: "1px solid rgba(252,165,165,0.2)", color: "#fca5a5", fontSize: 13 }}>{error}</div>}
        {compileError && <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(252,165,165,0.08)", border: "1px solid rgba(252,165,165,0.2)", color: "#fca5a5", fontSize: 13 }}>{compileError}</div>}
        {reelSaveHint && (
          <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(240,168,48,0.08)", border: "1px solid rgba(240,168,48,0.25)", color: "#f0a830", fontSize: 13, lineHeight: 1.5 }}>
            📱 {reelSaveHint}
          </div>
        )}

        {anySelected && (
          <div className="bulk-bar">
            <span style={{ fontSize: 13, color: "#ccc" }}><strong style={{ color: "#fff" }}>{selectedIds.size}</strong> selected</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-secondary" onClick={() => setSelectedIds(new Set())}>Clear</button>
              <button className="btn-danger" onClick={() => requestDelete([...selectedIds], "", "bulk")}>🗑️ Delete</button>
            </div>
          </div>
        )}

        {gameGroups.length === 0 ? (
          <div style={{ padding: "40px 24px", borderRadius: 16, background: "#141414", border: "1px solid #222", color: "#555", fontSize: 15, textAlign: "center" }}>
            No uploads yet — tap 🎥 to record your first game.
          </div>
        ) : (
          gameGroups.map((group, gi) => {
            const groupKey    = group[0].id;
            const groupReels  = group.flatMap(u => reelsByUpload[u.id] ?? []);
            const isCompiling = compilingGroup === groupKey || groupReels.some(r => r.status === "pending" || r.status === "processing");
            const allGroupSelected = group.every(u => selectedIds.has(u.id));
            const mode        = modeByGroup[groupKey] ?? "hits_only";
            const groupHits   = group.reduce((sum, u) => sum + (summaries[u.id]?.hit_count ?? 0), 0);
            const groupSwings = group.reduce((sum, u) => sum + (summaries[u.id]?.swing_count ?? 0), 0);

            return (
              <div key={groupKey}>
                <div className="game-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="checkbox" className="cb" checked={allGroupSelected} onChange={() => toggleSelectAll(group)} title="Select all" />
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "#444", marginBottom: 2 }}>
                        Game {gameGroups.length - gi}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{fmtGameLabel(group)}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                        {groupHits > 0 && <span className="pill hit">⚾ {groupHits} hit{groupHits !== 1 ? "s" : ""}</span>}
                        {groupSwings > groupHits && <span className="pill swing">🏏 {groupSwings - groupHits} miss{groupSwings - groupHits !== 1 ? "es" : ""}</span>}
                        <span className="pill">{group.length} clip{group.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>

                  {/* Compile controls */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {/* Custom Reel button */}
                      <Link href={`/reels/new?game=${groupKey}`} className="btn-custom">
                        ✂️ Custom
                      </Link>
                      <button className="btn-compile" onClick={() => compileGroup(group, groupKey)} disabled={isCompiling}>
                        {isCompiling ? <><span className="spinner" />Compiling…</> : "🎬 Compile Reel"}
                      </button>
                    </div>
                    <div className="mode-toggle">
                      <button className={`mode-btn${mode === "hits_only" ? " active" : ""}`} onClick={() => setModeByGroup(p => ({ ...p, [groupKey]: "hits_only" }))}>
                        Hits only
                      </button>
                      <button className={`mode-btn${mode === "all_swings" ? " active" : ""}`} onClick={() => setModeByGroup(p => ({ ...p, [groupKey]: "all_swings" }))}>
                        All swings
                      </button>
                    </div>
                  </div>
                </div>

                <div className="game-body">
                  {groupReels.map(reel => (
                    <div key={reel.id} className={`reel-card${reel.status === "complete" ? " complete" : ""}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                            🎬 {reel.player_name || "Highlight Reel"}
                            {reel.jersey_number && (
                              <span style={{ marginLeft: 8, fontSize: 11, padding: "1px 7px", borderRadius: 20, background: "rgba(232,98,44,0.12)", border: "1px solid rgba(232,98,44,0.25)", color: "#e8622c" }}>
                                #{reel.jersey_number}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                            <span className="pill">🎞 <span className="pill-value">{reel.clip_count} clip{reel.clip_count !== 1 ? "s" : ""}</span></span>
                            {reel.duration_sec && <span className="pill">⏱ <span className="pill-value">{fmtDuration(reel.duration_sec)}</span></span>}
                          </div>
                          {reel.status !== "complete" && (
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                              {reel.status === "pending" || reel.status === "processing"
                                ? <span style={{ color: "#f0a830" }} className="pulse"><span className="spinner" />{reel.status === "pending" ? "Queued…" : "Compiling…"}</span>
                                : <span style={{ color: "#fca5a5" }}>⚠ Error</span>}
                            </div>
                          )}
                        </div>
                        {reel.status === "complete" && (
                          <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                            <button className="btn-primary" onClick={() => openReel(reel.id)}>▶ Play</button>
                            <button className="btn-secondary" onClick={() => downloadReel(reel.id, reel.player_name, reel.game_date)}>⬇</button>
                            <button className={`btn-share${copiedReelId === reel.id ? " copied" : ""}`} onClick={() => shareReel(reel.id)}>
                              {copiedReelId === reel.id ? "✓" : "🔗"}
                            </button>
                            <button className="btn-trash"
                              onClick={() => deleteReel(reel.id, group.flatMap(u => (reelsByUpload[u.id] ?? []).find(r => r.id === reel.id) ? [u.id] : [])[0])}
                              disabled={deletingReelIds.has(reel.id)}>
                              {deletingReelIds.has(reel.id) ? <span className="spinner" /> : "🗑️"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="uploads-grid">
                    {group.map(u => (
                      <UploadCard
                        key={u.id}
                        u={u}
                        summary={summaries[u.id]}
                        thumbnailUrl={thumbnails[u.id]}
                        isSelected={selectedIds.has(u.id)}
                        isDeleting={deletingIds.has(u.id)}
                        onToggle={() => toggleSelect(u.id)}
                        onDelete={() => requestDelete([u.id], u.original_filename, "single")}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <p style={{ marginTop: 48, fontSize: 13, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase", background: "linear-gradient(135deg,#e8622c,#f0a830)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Find Your Flow
        </p>
      </div>
    </>
  );
}