"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api";
import Nav from "@/components/Nav";

type UploadRow = {
  id: string;
  user_id: string;
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

type GameGroup = {
  key: string;           // first upload id — stable identity
  uploads: UploadRow[];
  clips: ClipRow[];
  collapsed: boolean;
};

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
  return groups.reverse(); // most recent first
}

function fmtGameLabel(group: UploadRow[]): string {
  const d = new Date(group[0].created_at);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

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
    if (hovered && clipUrl && videoRef.current) videoRef.current.play().catch(() => {});
  }, [hovered, clipUrl]);

  return (
    <div
      onClick={onToggle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        borderRadius: 12, overflow: "hidden", cursor: "pointer",
        border: `2px solid ${selected ? "#e8622c" : "#222"}`,
        background: selected ? "#1a0e08" : "#141414",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      {/* Media */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#0d0d0d", overflow: "hidden" }}>
        {thumbnailUrl && (
          <img src={thumbnailUrl} alt="" style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            opacity: hovered && clipUrl ? 0 : 1, transition: "opacity 0.25s",
          }} />
        )}
        {!thumbnailUrl && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 24 }}>🎥</div>
        )}
        <video ref={videoRef} src={clipUrl ?? undefined} muted playsInline loop style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
          opacity: hovered && clipUrl ? 1 : 0, transition: "opacity 0.25s",
        }} />
        {hovered && loadingClip && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}>
            <span className="spinner" />
          </div>
        )}
        {/* Badge */}
        <div style={{ position: "absolute", top: 6, right: 6 }}>
          {clip.is_hit
            ? <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "rgba(232,98,44,0.85)", color: "#fff", fontWeight: 700 }}>⚾ HIT</span>
            : clip.is_swing
            ? <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "rgba(240,168,48,0.8)", color: "#fff", fontWeight: 700 }}>🏏 SWING</span>
            : null}
        </div>
        {/* Checkmark */}
        <div style={{
          position: "absolute", top: 6, left: 6, width: 20, height: 20, borderRadius: 5,
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
        <div style={{ fontSize: 11, color: "#666" }}>{clip.label || "Clip"}</div>
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
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [groups, setGroups]           = useState<GameGroup[]>([]);
  const [thumbsByClip, setThumbsByClip] = useState<Record<string, string>>({});
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [loading, setLoading]         = useState(true);
  const [compiling, setCompiling]     = useState(false);
  const [error, setError]             = useState("");

  // ── Load all uploads + clips ──────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;
    const uid = user.id;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/uploads/recent?limit=100`, { cache: "no-store" });
        if (!res.ok) { setError("Failed to load uploads"); return; }
        const data = await res.json();
        const myUploads: UploadRow[] = (data.uploads ?? []).filter((u: UploadRow) => u.user_id === uid);

        const rawGroups = groupIntoGames(myUploads);

        // Fetch clips for all uploads in parallel
        const clipsMap: Record<string, ClipRow[]> = {};
        await Promise.all(myUploads.map(async u => {
          try {
            const r = await fetch(`${API_BASE}/api/uploads/${u.id}/clips`, { cache: "no-store" });
            if (!r.ok) return;
            const d = await r.json();
            clipsMap[u.id] = d.clips ?? [];
          } catch { /* silent */ }
        }));

        // Build game groups with clips merged and sorted by start_sec
        const builtGroups: GameGroup[] = rawGroups.map(uploads => {
          const clips = uploads
            .flatMap(u => clipsMap[u.id] ?? [])
            .sort((a, b) => (a.start_sec ?? 0) - (b.start_sec ?? 0));
          return { key: uploads[0].id, uploads, clips, collapsed: false };
        });
        setGroups(builtGroups);

        // Fetch thumbnails for all clips
        const allClips = builtGroups.flatMap(g => g.clips);
        const thumbMap: Record<string, string> = {};
        await Promise.all(allClips.map(async clip => {
          if (!clip.thumbnail_s3_key) return;
          try {
            const r = await fetch(`${API_BASE}/api/clips/${clip.id}/thumbnail`, { cache: "no-store" });
            if (!r.ok) return;
            const d = await r.json();
            if (d.thumbnail_url) thumbMap[clip.id] = d.thumbnail_url;
          } catch { /* silent */ }
        }));
        setThumbsByClip(thumbMap);
      } catch (e: any) { setError(String(e)); }
      finally { setLoading(false); }
    }

    load();
  }, [isLoaded, isSignedIn, user?.id]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function toggleCollapse(key: string) {
    setGroups(prev => prev.map(g => g.key === key ? { ...g, collapsed: !g.collapsed } : g));
  }

  function toggleClip(id: string) {
    setSelectedClips(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function selectAllInGroup(g: GameGroup) {
    setSelectedClips(prev => new Set([...prev, ...g.clips.map(c => c.id)]));
  }
  function deselectAllInGroup(g: GameGroup) {
    const ids = new Set(g.clips.map(c => c.id));
    setSelectedClips(prev => new Set([...prev].filter(id => !ids.has(id))));
  }
  function allSelectedInGroup(g: GameGroup) {
    return g.clips.length > 0 && g.clips.every(c => selectedClips.has(c.id));
  }
  function noneSelectedInGroup(g: GameGroup) {
    return g.clips.every(c => !selectedClips.has(c.id));
  }

  const totalSelected = groups.reduce(
    (sum, g) => sum + g.clips.filter(c => selectedClips.has(c.id)).length, 0
  );

  // ── Compile ───────────────────────────────────────────────────────────────
  async function handleCompile() {
    setError(""); setCompiling(true);
    try {
      const clipIds = [...selectedClips];
      if (!clipIds.length) { setError("Select at least one clip to compile."); return; }

      // Use the upload_id of the first selected clip's upload as the anchor
      const allClips = groups.flatMap(g => g.clips);
      const firstSelected = allClips.find(c => selectedClips.has(c.id));
      const anchorUploadId = firstSelected?.upload_id;
      if (!anchorUploadId) { setError("Could not determine upload context."); return; }

      const res = await fetch(`${API_BASE}/api/reels/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_id: anchorUploadId,
          clip_ids: clipIds,
          watermark: true,
          mode: "hits_only",
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a0a;color:#fff;font-family:'Outfit',-apple-system,system-ui,sans-serif}

        .game-block{border-radius:14px;border:1px solid #1e1e1e;overflow:hidden;margin-bottom:16px}

        .game-header-row{
          display:flex;align-items:center;justify-content:space-between;
          gap:10px;padding:12px 16px;background:#111;cursor:pointer;
          user-select:none;transition:background 0.15s;flex-wrap:wrap;
        }
        .game-header-row:hover{background:#161616}

        .clips-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px}
        @media(max-width:600px){.clips-grid{grid-template-columns:repeat(2,1fr)}}

        .btn-secondary{padding:6px 12px;border-radius:9px;background:#1a1a1a;border:1px solid #2a2a2a;color:#ccc;font-weight:500;font-size:12px;font-family:'Outfit',sans-serif;cursor:pointer;white-space:nowrap;transition:border-color 0.2s}
        .btn-secondary:hover{border-color:rgba(232,98,44,0.4);color:#fff}
        .btn-secondary:disabled{opacity:0.4;cursor:not-allowed}

        .btn-primary{padding:10px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,#e8622c,#f0a830);color:#fff;font-weight:700;font-size:14px;font-family:'Outfit',sans-serif;cursor:pointer;transition:opacity 0.2s;white-space:nowrap}
        .btn-primary:hover{opacity:0.9}
        .btn-primary:disabled{opacity:0.4;cursor:not-allowed}

        .pill{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;background:#1a1a1a;border:1px solid #2a2a2a;font-size:11px;color:#666}
        .pill.hit{background:rgba(232,98,44,0.08);border-color:rgba(232,98,44,0.2);color:#e8622c}
        .pill.swing{background:rgba(240,168,48,0.08);border-color:rgba(240,168,48,0.2);color:#f0a830}

        .sticky-footer{position:sticky;bottom:0;z-index:20;background:rgba(10,10,10,0.93);backdrop-filter:blur(12px);border-top:1px solid #1e1e1e;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}

        @keyframes spin{to{transform:rotate(360deg)}}
        .spinner{display:inline-block;width:12px;height:12px;border:2px solid #333;border-top-color:#e8622c;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:4px}

        .chevron{display:inline-block;transition:transform 0.2s;font-style:normal}
        .chevron.open{transform:rotate(90deg)}
      `}</style>

      <Nav />

      <div style={{ background: "#0a0a0a", minHeight: "100vh", padding: "32px 20px 120px", maxWidth: 760, margin: "0 auto" }}>

        <Link href="/uploads" style={{ fontSize: 13, color: "#555", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}
          onMouseOver={e => (e.currentTarget.style.color = "#e8622c")}
          onMouseOut={e => (e.currentTarget.style.color = "#555")}>
          ← Back to uploads
        </Link>

        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 6 }}>
          Custom <span style={{ background: "linear-gradient(135deg,#e8622c,#f0a830)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>reel</span>
        </h1>
        <p style={{ fontSize: 14, color: "#555", marginBottom: 28 }}>Pick clips from any game. Hit clips are pre-selected.</p>

        {error && (
          <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(252,165,165,0.08)", border: "1px solid rgba(252,165,165,0.2)", color: "#fca5a5", fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: "48px 24px", borderRadius: 16, background: "#141414", border: "1px solid #222", color: "#555", fontSize: 15, textAlign: "center" }}>
            <span className="spinner" />Loading clips…
          </div>
        ) : groups.length === 0 ? (
          <div style={{ padding: "48px 24px", borderRadius: 16, background: "#141414", border: "1px solid #222", color: "#555", fontSize: 15, textAlign: "center" }}>
            No processed uploads yet.
          </div>
        ) : (
          groups.map((g, gi) => {
            const hitCount   = g.clips.filter(c => c.is_hit).length;
            const swingCount = g.clips.filter(c => c.is_swing && !c.is_hit).length;
            const selCount   = g.clips.filter(c => selectedClips.has(c.id)).length;
            const allSel     = allSelectedInGroup(g);
            const noneSel    = noneSelectedInGroup(g);

            return (
              <div key={g.key} className="game-block">
                {/* ── Game header row ── */}
                <div className="game-header-row" onClick={() => toggleCollapse(g.key)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <i className={`chevron${g.collapsed ? "" : " open"}`}>▶</i>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "#444" }}>
                        Game {groups.length - gi}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{fmtGameLabel(g.uploads)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {hitCount > 0 && <span className="pill hit">⚾ {hitCount}</span>}
                      {swingCount > 0 && <span className="pill swing">🏏 {swingCount}</span>}
                      <span className="pill">{g.clips.length} clips</span>
                      {selCount > 0 && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(232,98,44,0.12)", border: "1px solid rgba(232,98,44,0.3)", color: "#e8622c" }}>
                          {selCount} selected
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Select/deselect all — stop propagation so it doesn't toggle collapse */}
                  <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button className="btn-secondary" onClick={() => selectAllInGroup(g)} disabled={allSel}>All</button>
                    <button className="btn-secondary" onClick={() => deselectAllInGroup(g)} disabled={noneSel}>None</button>
                  </div>
                </div>

                {/* ── Clip grid (collapsible) ── */}
                {!g.collapsed && (
                  g.clips.length === 0 ? (
                    <div style={{ padding: "20px 16px", background: "#0d0d0d", color: "#444", fontSize: 13, textAlign: "center" }}>
                      No clips for this game yet.
                    </div>
                  ) : (
                    <div style={{ background: "#0d0d0d" }}>
                      <div className="clips-grid">
                        {g.clips.map(c => (
                          <ClipCard
                            key={c.id}
                            clip={c}
                            selected={selectedClips.has(c.id)}
                            onToggle={() => toggleClip(c.id)}
                            thumbnailUrl={thumbsByClip[c.id]}
                          />
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Sticky footer ── */}
      {!loading && (
        <div className="sticky-footer">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {totalSelected} clip{totalSelected !== 1 ? "s" : ""} selected
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>
              across {groups.filter(g => g.clips.some(c => selectedClips.has(c.id))).length} game{groups.filter(g => g.clips.some(c => selectedClips.has(c.id))).length !== 1 ? "s" : ""}
            </div>
          </div>
          <button className="btn-primary" onClick={handleCompile} disabled={compiling || totalSelected === 0}>
            {compiling ? <><span className="spinner" />Compiling…</> : "🎬 Compile Reel"}
          </button>
        </div>
      )}
    </>
  );
}