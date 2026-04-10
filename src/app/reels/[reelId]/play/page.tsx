"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_BASE } from "@/lib/api";

export default function ReelPlayerPage() {
  const params = useParams();
  const reelId = String(params.reelId);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reelId) return;
    fetch(`${API_BASE}/api/reels/${reelId}/download`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d?.download_url) setUrl(d.download_url);
        else setError("Could not load reel.");
      })
      .catch(() => setError("Network error loading reel."));
  }, [reelId]);

  async function handleShare() {
    const shareUrl = `${window.location.origin}/share/${reelId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Check out my highlight reel!", url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* cancelled */ }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#000;color:#fff;font-family:'Outfit',-apple-system,sans-serif;min-height:100vh}
        .player-wrap{
          display:flex;flex-direction:column;
          min-height:100vh;
          align-items:center;justify-content:center;
          padding:24px 20px;gap:20px;
        }
        video{
          width:100%;max-width:480px;
          border-radius:12px;
          background:#111;
          display:block;
        }
        .actions{
          display:flex;flex-direction:column;
          gap:12px;width:100%;max-width:480px;
        }
        .btn{
          display:flex;align-items:center;justify-content:center;gap:8px;
          padding:14px 20px;border-radius:12px;
          font-size:15px;font-weight:600;
          font-family:'Outfit',sans-serif;
          cursor:pointer;border:none;
          text-decoration:none;
          transition:opacity 0.2s;
        }
        .btn:hover{opacity:0.9}
        .btn-save{
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;
        }
        .btn-share{
          background:#1a1a1a;
          border:1px solid rgba(232,98,44,0.35);
          color:#e8622c;
        }
        .hint{
          font-size:12px;color:#555;text-align:center;
          line-height:1.6;max-width:340px;
        }
        .logo{
          font-size:13px;font-weight:700;
          letter-spacing:2px;text-transform:uppercase;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
          margin-top:8px;
        }
      `}</style>

      <div className="player-wrap">
        <div className="logo">ClipFlow</div>

        {error && (
          <div style={{ color: "#fca5a5", fontSize: 14 }}>{error}</div>
        )}

        {!url && !error && (
          <div style={{ color: "#555", fontSize: 14 }}>Loading reel…</div>
        )}

        {url && (
          <>
            <video
              src={url}
              controls
              playsInline
              autoPlay
            />

            <div className="actions">
              {/* Direct download link — on iOS Safari this triggers Save Video prompt */}
              <a
                href={url}
                download
                className="btn btn-save"
                target="_blank"
                rel="noopener noreferrer"
              >
                ⬇ Save to device
              </a>
              <button className="btn btn-share" onClick={handleShare}>
                {copied ? "✓ Link copied!" : "🔗 Share reel link"}
              </button>
            </div>

            <p className="hint">
              On iPhone: tap Save to device, then tap the share icon and choose Save Video to add to your camera roll.
            </p>
          </>
        )}
      </div>
    </>
  );
}