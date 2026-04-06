"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api";
import Nav from "@/components/Nav";

type UploadRow = {
  id: string;
  original_filename: string;
  status: string;
  created_at: string;
};

type ClipRow = {
  id: string;
  upload_id: string;
  bucket: string;
  s3_key: string;
  thumbnail_s3_key?: string | null;
  label?: string | null;
  player_name?: string | null;
  is_hit?: boolean | null;
  is_swing?: boolean | null;
  ai_confidence?: number | null;
  ai_reason?: string | null;
  start_sec?: number | null;
  created_at: string;
};

type CompileMode = "hits_only" | "all_swings";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// ── ClipCard ──────────────────────────────────────────────────────────────────
function ClipCard({
  clip, selected, onToggle, thumbnailUrl,
}: {
  clip: ClipRow;
  selected: boolean;
  onToggle: () => void;
  thumbnailUrl?: string;
}) {
  const [hovered, setHovered]         = useState(false);
  const [clipUrl, setClipUrl]         = useState<string | null>(null);
  const [loadingClip, setLoadingClip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  async function handleMouseEnter() {
    setHovered(true);
    if (!clipUrl && !loadingClip) {
      setLoadingClip(true);
      try {
        const res = await fetch(`${API_BASE}/api/clips/${clip.id}/download`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setClipUrl(data.download_url ?? null);
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

  const isHit = clip.is_hit === true;

  return (
    <div
      onClick={onToggle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        borderRadius: 12, overflow: "hidden", cursor: "pointer",
        border: selected
          ? "2px solid #e8622c"
          : "2px solid #222",
        background: selected ? "#1a0e08" : "#141414",
        transition: "border-color 0.15s, background 0.15s",
        position: "relative",
      }}
    >
      {/* Media */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#0d0d0d", overflow: "hidden" }}>
        {thumbnailUrl && (
          <img src={thumbnailUrl} alt="" style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover",
            opacity: hovered && clipUrl ? 0 : 1,
            transition: "opacity 0.25s",
          }} />
        )}
        {!thumbnailUrl && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 24 }}>🎥</div>
        )}
        <video
          ref={videoRef}
          src={clipUrl ?? undefined}
          muted playsInline loop
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover",
            opacity: hovered && clipUrl ? 1 : 0,
            transition: "opacity 0.25s",
          }}
        />
        {hovered && loadingClip && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}>
            <span className="spinner" />
          </div>
        )}
        {/* Hit / swing badge */}
        <div style={{ position: "absolute", top: 6, right: 6 }}>
          {isHit
            ? <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "rgba(232,98,44,0.85)", color: "#fff", fontWeight: 700 }}>⚾ HIT</span>
            : clip.is_swing
            ? <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "rgba(240,168,48,0.8)", color: "#fff", fontWeight: 700 }}>🏏 SWING</span>
            : null}
        </div>
        {/* Checkmark overlay */}
        <div style={{
          position: "absolute", top: 6, left: 6,
          width: 20, height: 20, borderRadius: 5,
          background: selected ? "linear-gradient(135deg,#e8622c,#f0a830)" : "rgba(0,0,0,0.5)",
          border: selected ? "none" : "1.5px solid #555",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s",
        }}>
          {selected && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "8px 10px" }}>
        <div style={{ fontSize: 11, color: "#666" }}>{clip.label || `Clip`}</div>
        {clip.ai_reason && (
          <div style={{ fontSize: 10, color: "#444", marginTop: 2, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {clip.ai_reason}
          </div>
        )}
        {typeof clip.ai_confidence === "number" && (
          <div style={{ marginTop: 4, fontSize: 10, color: "#555" }}>
            AI: <span style={{ color: "#888" }}>{Math.round(clip.ai_confidence * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReelsNewPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const gameParam    = searchParams.get("game"); // first upload ID of the group

  const [uploads, setUploads]               = useState<UploadRow[]>([]);
  const [clipsByUpload, setClipsByUpload]   = useState<Record<string, ClipRow[]>>({});
  const [thumbsByClip, setThumbsByClip]     = useState<Record<string, string>>({});
  const [enabledUploads, setEnabledUploads] = useState<Set<string>>(new Set());
  const [selectedClips, setSelectedClips]   = useState<Set<string>>(new Set());
  const [mode, setMode]                     = useState<CompileMode>("hits_only");
  const [loading, setLoading]               = useState(true);
  const [compiling, setCompiling]           = useState(false);
  const [error, setError]                   = useState("");

  // ── Load uploads in this game group ──────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !gameParam) return;

    async function load() {
      setLoading(true);
      try {
        // Fetch all recent uploads and find the ones in this game group
        const res = await fetch(`${API_BASE}/api/uploads/recent?limit=50`, { cache: "no-store" });
        if (!res.ok) { setError("Failed to load uploads"); return; }
        const data = await res.json();
        const all: UploadRow[] = data.uploads ?? [];

        // Recreate the same 3-hour grouping logic
        const sorted = [...all].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const groups: UploadRow[][] = sorted.length ? [[sorted[0]]] : [];
        for (let i = 1; i < sorted.length; i++) {
          const prev = new Date(sorted[i - 1].created_at).getTime();
          const curr = new Date(sorted[i].created_at).getTime();
          if (curr - prev <= 3 * 60 * 60 * 1000) groups[groups.length - 1].push(sorted[i]);
          else groups.push([sorted[i]]);
        }

        const group = groups.find(g => g[0].id === gameParam) ?? [];
        if (!group.length) { setError("Game group not found"); return; }

        setUploads(group);
        setEnabledUploads(new Set(group.map(u => u.id)));

        // Fetch clips for every upload in the group
        const clipsMap: Record<string, ClipRow[]> = {};
        await Promise.all(group.map(async u => {
          try {
            const r = await fetch(`${API_BASE}/api/uploads/${u.id}/clips`, { cache: "no-store" });
            if (!r.ok) return;
            const d = await r.json();
            clipsMap[u.id] = d.clips ?? [];
          } catch { /* silent */ }
        }));
        setClipsByUpload(clipsMap);

        // Pre-select all hit clips
        const hitIds = new Set<string>();
        for (const clips of Object.values(clipsMap)) {
          for (const c of clips) {
            if (c.is_hit === true) hitIds.add(c.id);
          }
        }
        setSelectedClips(hitIds);

        // Fetch thumbnails (presigned URLs stored on clip rows)
        const thumbMap: Record<string, string> = {};
        await Promise.all(
          Object.values(clipsMap).flat().map(async clip => {
            if (!clip.thumbnail_s3_key) return;
            try {
              const r = await fetch(`${API_BASE}/api/clips/${clip.id}/thumbnail`, { cache: "no-store" });
              if (!r.ok) return;
              const d = await r.json();
              if (d.thumbnail_url) thumbMap[clip.id] = d.thumbnail_url;
            } catch { /* silent */ }
          })
        );
        setThumbsByClip(thumbMap);
      } catch (e: any) { setError(String(e)); }
      finally { setLoading(false); }
    }

    load();
  }, [isLoaded, isSignedIn, gameParam]);

  // ── Derived clip list (only from enabled uploads) ─────────────────────────
  const visibleClips = uploads
    .filter(u => enabledUploads.has(u.id))
    .flatMap(u => clipsByUpload[u.id] ?? []);

  const hitClips   = visibleClips.filter(c => c.is_hit === true);
  const swingClips = visibleClips.filter(c => c.is_swing === true && c.is_hit !== true);
  const otherClips = visibleClips.filter(c => c.is_swing !== true && c.is_hit !== true);

  // ── Select / deselect all helpers ─────────────────────────────────────────
  function selectAllVisible() {
    setSelectedClips(prev => new Set([...prev, ...visibleClips.map(c => c.id)]));
  }
  function deselectAllVisible() {
    const visibleIds = new Set(visibleClips.map(c => c.id));
    setSelectedClips(prev => new Set([...prev].filter(id => !visibleIds.has(id))));
  }
  const allSelected  = visibleClips.length > 0 && visibleClips.every(c => selectedClips.has(c.id));
  const noneSelected = visibleClips.every(c => !selectedClips.has(c.id));

  function toggleClip(id: string) {
    setSelectedClips(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleUpload(id: string) {
    setEnabledUploads(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // ── Compile ───────────────────────────────────────────────────────────────
  async function handleCompile() {
    setError(""); setCompiling(true);
    try {
      const clipIds = [...selectedClips].filter(id => visibleClips.some(c => c.id === id));
      if (!clipIds.length) { setError("Select at least one clip to compile."); return; }

      const res = await fetch(`${API_BASE}/api/reels/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_id: gameParam,
          clip_ids: clipIds,
          watermark: true,
          mode,
        }),
      });
      if (!res.ok) { setError(await res.text()); return; }
      router.push("/uploads");
    } catch (e: any) { setError(String(e)); }
    finally { setCompiling(false); }
  }

  const loadingStyle = { background: "#0a0a0a", minHeight: "100vh", padding: 24, color: "#fff", fontFamily: "'Outfit', system-ui, sans-serif" };
  if (!isLoaded)   return <div style={loadingStyle}>Loading…</div>;
  if (!isSignedIn) return <div style={loadingStyle}>Please sign in.</div>;

  const selectedVisible = visibleClips.filter(c => selectedClips.has(c.id)).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a0a;color:#fff;font-family:'Outfit',-apple-system,system-ui,sans-serif}

        .section-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:10px}

        .upload-toggle{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;border:2px solid #222;background:#141414;cursor:pointer;transition:border-color 0.15s,background 0.15s;user-select:none}
        .upload-toggle.on{border-color:rgba(232,98,44,0.4);background:#1a0e08}
        .upload-toggle:hover{border-color:rgba(232,98,44,0.25)}

        .clips-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        @media(max-width:600px){.clips-grid{grid-template-columns:repeat(2,1fr)}}

        .mode-toggle{display:flex;border-radius:8px;overflow:hidden;border:1px solid #2a2a2a;background:#111}
        .mode-btn{padding:6px 12px;font-size:12px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;border:none;background:transparent;color:#555;transition:background 0.15s,color 0.15s;white-space:nowrap}
        .mode-btn.active{background:rgba(232,98,44,0.15);color:#e8622c}

        .btn-primary{padding:10px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,#e8622c,#f0a830);color:#fff;font-weight:700;font-size:14px;font-family:'Outfit',sans-serif;cursor:pointer;transition:opacity 0.2s;white-space:nowrap}
        .btn-primary:hover{opacity:0.9}
        .btn-primary:disabled{opacity:0.4;cursor:not-allowed}

        .btn-secondary{padding:7px 14px;border-radius:9px;background:#1a1a1a;border:1px solid #2a2a2a;color:#ccc;font-weight:500;font-size:12px;font-family:'Outfit',sans-serif;cursor:pointer;transition:border-color 0.2s;white-space:nowrap}
        .btn-secondary:hover{border-color:rgba(232,98,44,0.4);color:#fff}

        .sticky-footer{position:sticky;bottom:0;z-index:20;background:rgba(10,10,10,0.92);backdrop-filter:blur(12px);border-top:1px solid #1e1e1e;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}

        .cb{width:16px;height:16px;border-radius:4px;border:1px solid #333;background:#1a1a1a;appearance:none;-webkit-appearance:none;cursor:pointer;flex-shrink:0;position:relative;transition:border-color 0.15s,background 0.15s}
        .cb:checked{background:linear-gradient(135deg,#e8622c,#f0a830);border-color:#e8622c}
        .cb:checked::after{content:'';position:absolute;left:4px;top:1px;width:4px;height:8px;border:2px solid #fff;border-left:none;border-top:none;transform:rotate(45deg)}

        @keyframes spin{to{transform:rotate(360deg)}}
        .spinner{display:inline-block;width:12px;height:12px;border:2px solid #333;border-top-color:#e8622c;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:4px}

        .divider{height:1px;background:#1a1a1a;margin:28px 0}
      `}</style>

      <Nav />

      <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'Outfit',-apple-system,system-ui,sans-serif", padding: "32px 20px 120px", maxWidth: 760, margin: "0 auto" }}>

        <Link href="/uploads" style={{ fontSize: 13, color: "#555", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}
          onMouseOver={e => (e.currentTarget.style.color = "#e8622c")}
          onMouseOut={e => (e.currentTarget.style.color = "#555")}>
          ← Back to uploads
        </Link>

        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 6 }}>
          Custom <span style={{ background: "linear-gradient(135deg,#e8622c,#f0a830)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>reel</span>
        </h1>
        <p style={{ fontSize: 14, color: "#555", marginBottom: 32 }}>Choose which uploads and clips to include.</p>

        {error && (
          <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(252,165,165,0.08)", border: "1px solid rgba(252,165,165,0.2)", color: "#fca5a5", fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: "48px 24px", borderRadius: 16, background: "#141414", border: "1px solid #222", color: "#555", fontSize: 15, textAlign: "center" }}>
            <span className="spinner" />Loading clips…
          </div>
        ) : (
          <>
            {/* ── Step 1: Uploads ── */}
            <div className="section-label">Step 1 — Select uploads</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 0 }}>
              {uploads.map(u => {
                const on = enabledUploads.has(u.id);
                const clips = clipsByUpload[u.id] ?? [];
                const hits = clips.filter(c => c.is_hit).length;
                return (
                  <div key={u.id} className={`upload-toggle${on ? " on" : ""}`} onClick={() => toggleUpload(u.id)}>
                    <input type="checkbox" className="cb" checked={on} onChange={() => {}} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: on ? "#fff" : "#666" }}>
                        {fmtTime(u.created_at)}
                      </div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                        {clips.length} clip{clips.length !== 1 ? "s" : ""}{hits > 0 ? ` · ${hits} hit${hits !== 1 ? "s" : ""}` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: on ? "#e8622c" : "#333", fontWeight: 600 }}>
                      {on ? "Included" : "Excluded"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="divider" />

            {/* ── Step 2: Clips ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <div className="section-label" style={{ margin: 0 }}>
                Step 2 — Select clips
                <span style={{ marginLeft: 8, color: "#e8622c", fontWeight: 700 }}>({selectedVisible} selected)</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-secondary" onClick={selectAllVisible} disabled={allSelected}>Select all</button>
                <button className="btn-secondary" onClick={deselectAllVisible} disabled={noneSelected}>Deselect all</button>
              </div>
            </div>

            {visibleClips.length === 0 ? (
              <div style={{ padding: "32px 24px", borderRadius: 14, background: "#141414", border: "1px solid #222", color: "#555", fontSize: 14, textAlign: "center" }}>
                No clips available — enable at least one upload above.
              </div>
            ) : (
              <>
                {hitClips.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
                      ⚾ Hits ({hitClips.length})
                    </div>
                    <div className="clips-grid" style={{ marginBottom: 20 }}>
                      {hitClips.map(c => (
                        <ClipCard key={c.id} clip={c} selected={selectedClips.has(c.id)} onToggle={() => toggleClip(c.id)} thumbnailUrl={thumbsByClip[c.id]} />
                      ))}
                    </div>
                  </>
                )}
                {swingClips.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
                      🏏 Swings / misses ({swingClips.length})
                    </div>
                    <div className="clips-grid" style={{ marginBottom: 20 }}>
                      {swingClips.map(c => (
                        <ClipCard key={c.id} clip={c} selected={selectedClips.has(c.id)} onToggle={() => toggleClip(c.id)} thumbnailUrl={thumbsByClip[c.id]} />
                      ))}
                    </div>
                  </>
                )}
                {otherClips.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
                      Other ({otherClips.length})
                    </div>
                    <div className="clips-grid">
                      {otherClips.map(c => (
                        <ClipCard key={c.id} clip={c} selected={selectedClips.has(c.id)} onToggle={() => toggleClip(c.id)} thumbnailUrl={thumbsByClip[c.id]} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Sticky footer ── */}
      {!loading && (
        <div className="sticky-footer">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {selectedVisible} clip{selectedVisible !== 1 ? "s" : ""} selected
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>
              from {enabledUploads.size} upload{enabledUploads.size !== 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="mode-toggle">
              <button className={`mode-btn${mode === "hits_only" ? " active" : ""}`} onClick={() => setMode("hits_only")}>Hits only</button>
              <button className={`mode-btn${mode === "all_swings" ? " active" : ""}`} onClick={() => setMode("all_swings")}>All swings</button>
            </div>
            <button className="btn-primary" onClick={handleCompile} disabled={compiling || selectedVisible === 0}>
              {compiling ? <><span className="spinner" />Compiling…</> : "🎬 Compile Reel"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}