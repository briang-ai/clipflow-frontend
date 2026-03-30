"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { API_BASE } from "@/lib/api";

type ReelData = {
  player_name: string;
  jersey_number?: string | null;
  game_date: string;
  clip_count: number;
  duration_sec?: number | null;
  video_url: string;
};

function fmtDuration(sec: number | null | undefined): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SharePage() {
  const { reelId } = useParams<{ reelId: string }>();
  const [reel, setReel] = useState<ReelData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reelId) return;
    async function load() {
      const res = await fetch(`${API_BASE}/api/reels/${reelId}/public`, { cache: "no-store" });
      if (!res.ok) { setNotFound(true); return; }
      const data = await res.json();
      if (data.error) { setNotFound(true); return; }
      setReel(data);
    }
    load();
  }, [reelId]);

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${reel?.player_name ?? "Highlight"} Reel — ClipFlow`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* cancelled */ }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a0a;color:#fff;font-family:'Outfit',-apple-system,system-ui,sans-serif}

        .btn-primary{padding:12px 24px;border-radius:12px;border:none;background:linear-gradient(135deg,#e8622c,#f0a830);color:#fff;font-weight:600;font-size:14px;font-family:'Outfit',sans-serif;cursor:pointer;transition:opacity 0.2s;white-space:nowrap}
        .btn-primary:hover{opacity:0.9}

        .btn-secondary{padding:12px 24px;border-radius:12px;background:#141414;border:1px solid #2a2a2a;color:#ccc;font-weight:500;font-size:14px;font-family:'Outfit',sans-serif;cursor:pointer;white-space:nowrap;transition:border-color 0.2s}
        .btn-secondary:hover{border-color:rgba(232,98,44,0.4);color:#fff}
        .btn-secondary.copied{border-color:#34d399;color:#34d399}

        .pill{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;background:#1a1a1a;border:1px solid #2a2a2a;font-size:13px;color:#888}
        .pill-value{color:#ccc;font-weight:500}

        @keyframes spin{to{transform:rotate(360deg)}}
        .spinner{display:inline-block;width:20px;height:20px;border:2px solid #222;border-top-color:#e8622c;border-radius:50%;animation:spin 0.7s linear infinite}
      `}</style>

      <div style={{
        background: "#0a0a0a", minHeight: "100vh",
        fontFamily: "'Outfit', -apple-system, system-ui, sans-serif",
        padding: "48px 24px", maxWidth: 680, margin: "0 auto",
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 36 }}>
          <Link href="/">
            <img src="/logo.png" alt="ClipFlow" style={{ width: 130, height: "auto" }} />
          </Link>
        </div>

        {notFound ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚾</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Reel not found</div>
            <div style={{ fontSize: 14, color: "#555", marginBottom: 32 }}>
              This highlight reel may have been deleted or the link is invalid.
            </div>
            <Link href="/sign-up" style={{
              padding: "12px 24px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#e8622c,#f0a830)",
              color: "#fff", fontWeight: 600, fontSize: 14,
              fontFamily: "'Outfit',sans-serif", textDecoration: "none",
            }}>
              Make your own highlight reel
            </Link>
          </div>
        ) : !reel ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <span className="spinner" />
          </div>
        ) : (
          <>
            {/* Player info */}
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 10 }}>
                {reel.player_name || "Highlight Reel"}
                {reel.jersey_number && (
                  <span style={{
                    marginLeft: 10, fontSize: 15, fontWeight: 500,
                    padding: "3px 10px", borderRadius: 20,
                    background: "rgba(232,98,44,0.12)",
                    border: "1px solid rgba(232,98,44,0.25)", color: "#e8622c",
                  }}>
                    #{reel.jersey_number}
                  </span>
                )}
              </h1>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="pill">📅 <span className="pill-value">{new Date(reel.game_date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span></span>
                <span className="pill">🎞 <span className="pill-value">{reel.clip_count} hit{reel.clip_count !== 1 ? "s" : ""}</span></span>
                {reel.duration_sec && <span className="pill">⏱ <span className="pill-value">{fmtDuration(reel.duration_sec)}</span></span>}
              </div>
            </div>

            {/* Video player */}
            <div style={{
              borderRadius: 16, overflow: "hidden",
              background: "#111", border: "1px solid #1e1e1e",
              marginBottom: 20, aspectRatio: "16/9",
            }}>
              <video
                src={reel.video_url}
                controls
                playsInline
                style={{ width: "100%", height: "100%", display: "block" }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 40 }}>
              <button className={`btn-secondary${copied ? " copied" : ""}`} onClick={handleShare}>
                {copied ? "✓ Link copied!" : "🔗 Share this reel"}
              </button>
            </div>

            {/* ClipFlow CTA */}
            <div style={{
              padding: "24px", borderRadius: 16,
              background: "#111", border: "1px solid #1e1e1e",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                Want highlight reels for your player?
              </div>
              <div style={{ fontSize: 13, color: "#555", marginBottom: 20 }}>
                ClipFlow uses AI to find every hit in your game footage — automatically.
              </div>
              <Link href="/sign-up" style={{
                padding: "12px 28px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,#e8622c,#f0a830)",
                color: "#fff", fontWeight: 600, fontSize: 14,
                fontFamily: "'Outfit',sans-serif", textDecoration: "none",
                display: "inline-block",
              }}>
                Try ClipFlow free →
              </Link>
            </div>
          </>
        )}

        {/* Footer */}
        <p style={{ marginTop: 48, fontSize: 13, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase", background: "linear-gradient(135deg,#e8622c,#f0a830)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Find Your Flow
        </p>
      </div>
    </>
  );
}