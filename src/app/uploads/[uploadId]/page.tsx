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

export default function UploadDetailPage() {
  const { isLoaded, isSignedIn } = useUser();
  const params = useParams();
  const uploadId = String(params.uploadId);

  const [clips, setClips] = useState<ClipRow[]>([]);
  const [error, setError] = useState<string>("");
  const [savingId, setSavingId] = useState<string>("");
  const [openingId, setOpeningId] = useState<string>("");

  const [draft, setDraft] = useState<
    Record<string, { player_name: string; jersey_number: string }>
  >({});

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastCount = -1;
    let unchangedPolls = 0;

    async function poll() {
      try {
        if (cancelled) return;
        const res = await fetch(`${API_BASE}/api/uploads/${uploadId}/clips`, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setError(await res.text());
          return;
        }
        const data = await res.json();
        const newClips: ClipRow[] = data.clips ?? [];
        if (cancelled) return;
        setClips(newClips);
        setDraft((prev) => {
          const next = { ...prev };
          for (const c of newClips) {
            if (!next[c.id]) {
              next[c.id] = { player_name: c.player_name ?? "", jersey_number: c.jersey_number ?? "" };
            }
          }
          return next;
        });
        if (newClips.length !== lastCount) { lastCount = newClips.length; unchangedPolls = 0; }
        else { unchangedPolls += 1; }
        if (!cancelled && unchangedPolls < 3) timer = setTimeout(poll, 2000);
      } catch (e: any) {
        if (!cancelled) setError(String(e));
      }
    }

    if (uploadId) { setError(""); poll(); }
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [uploadId]);

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
      setClips((prev) => prev.map((c) => c.id === clipId ? { ...c, ...payload } : c));
    } catch (e: any) { setError(String(e)); }
    finally { setSavingId(""); }
  }

  async function openClip(clipId: string) {
    try {
      setError(""); setOpeningId(clipId);
      const res = await fetch(`${API_BASE}/api/clips/${clipId}/download`, { cache: "no-store" });
      if (!res.ok) { setError(await res.text()); return; }
      const data = await res.json();
      const url = data?.download_url;
      if (!url) { setError("Missing download_url in response: " + JSON.stringify(data)); return; }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) { setError(String(e)); }
    finally { setOpeningId(""); }
  }

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

        .clip-input{
          padding:10px 14px;border-radius:10px;
          background:#1a1a1a;border:1px solid #2a2a2a;
          color:#fff;font-size:14px;font-family:'Outfit',sans-serif;
          outline:none;transition:border-color 0.2s;
        }
        .clip-input:focus{border-color:#e8622c}
        .clip-input::placeholder{color:#555}

        .btn-primary{
          padding:10px 18px;border-radius:10px;border:none;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-weight:600;font-size:13px;
          font-family:'Outfit',sans-serif;cursor:pointer;
          transition:opacity 0.2s;white-space:nowrap;
        }
        .btn-primary:hover{opacity:0.9}
        .btn-primary:disabled{opacity:0.5;cursor:not-allowed}

        .btn-secondary{
          padding:10px 18px;border-radius:10px;
          background:#1a1a1a;border:1px solid #2a2a2a;
          color:#ccc;font-weight:500;font-size:13px;
          font-family:'Outfit',sans-serif;cursor:pointer;
          transition:border-color 0.2s;white-space:nowrap;
        }
        .btn-secondary:hover{border-color:rgba(232,98,44,0.3)}
        .btn-secondary:disabled{opacity:0.5;cursor:not-allowed}
      `}</style>

      <div style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        fontFamily: "'Outfit', -apple-system, system-ui, sans-serif",
        padding: "48px 24px",
        maxWidth: 800,
        margin: "0 auto",
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
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Clips
          </span>
        </h1>

        <div style={{
          fontFamily: "monospace", fontSize: 12, color: "#555", marginBottom: 24,
        }}>
          Upload ID: {uploadId}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: 20, padding: "14px 18px", borderRadius: 14,
            background: "rgba(252,165,165,0.08)", border: "1px solid rgba(252,165,165,0.2)",
            color: "#fca5a5", fontSize: 13, whiteSpace: "pre-wrap",
          }}>
            {error}
          </div>
        )}

        {/* Empty / processing state */}
        {clips.length === 0 ? (
          <div style={{
            padding: "32px 24px", borderRadius: 16,
            background: "#141414", border: "1px solid #222",
            color: "#666", fontSize: 15, textAlign: "center",
          }}>
            ⏳ Processing clips… this page will refresh automatically.
          </div>
        ) : (
          <div>
            {clips.map((c) => (
              <div key={c.id} className="clip-card">

                {/* Top row: info + play button */}
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>

                    {/* Clip label */}
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10 }}>
                      {c.label || "Clip"}
                    </div>

                    {/* AI scoring */}
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

                    {/* AI reason */}
                    {c.ai_reason && (
                      <div style={{ fontSize: 13, color: "#666", marginBottom: 8, lineHeight: 1.5 }}>
                        {c.ai_reason}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>
                      {new Date(c.created_at).toLocaleString()}
                    </div>

                    {/* S3 key */}
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#444" }}>
                      {c.s3_key}
                    </div>
                  </div>

                  {/* Play button */}
                  <button
                    className="btn-primary"
                    onClick={() => openClip(c.id)}
                    disabled={openingId === c.id}
                  >
                    {openingId === c.id ? "Opening…" : "▶ Play / Download"}
                  </button>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "#222", margin: "14px 0" }} />

                {/* Label inputs */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    className="clip-input"
                    placeholder="Player name"
                    value={draft[c.id]?.player_name || ""}
                    onChange={(e) => setDraft((prev) => ({
                      ...prev,
                      [c.id]: { ...(prev[c.id] ?? { player_name: "", jersey_number: "" }), player_name: e.target.value },
                    }))}
                    style={{ minWidth: 200 }}
                  />
                  <input
                    className="clip-input"
                    placeholder="Jersey #"
                    value={draft[c.id]?.jersey_number || ""}
                    onChange={(e) => setDraft((prev) => ({
                      ...prev,
                      [c.id]: { ...(prev[c.id] ?? { player_name: "", jersey_number: "" }), jersey_number: e.target.value },
                    }))}
                    style={{ width: 110 }}
                  />
                  <button
                    className="btn-secondary"
                    onClick={() => saveLabels(c.id)}
                    disabled={savingId === c.id}
                  >
                    {savingId === c.id ? "Saving…" : "Save"}
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Footer tagline */}
        <p style={{
          marginTop: 48, fontSize: 14, fontWeight: 500,
          letterSpacing: "2px", textTransform: "uppercase",
          background: "linear-gradient(135deg,#e8622c,#f0a830)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          Find Your Flow
        </p>

      </div>
    </>
  );
}