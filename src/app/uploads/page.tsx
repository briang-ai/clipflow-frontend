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

export default function UploadsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [error, setError] = useState<string>("");

  const myUploads = useMemo(() => {
    const uid = user?.id;
    if (!uid) return [];
    return uploads.filter((u) => u.user_id === uid);
  }, [uploads, user?.id]);

  useEffect(() => {
    async function load() {
      try {
        setError("");
        const url = `${API_BASE}/api/uploads/recent?limit=50`;
        const res = await fetch(url, { method: "GET", cache: "no-store" });
        if (!res.ok) {
          const txt = await res.text();
          setError(`Backend error ${res.status}: ${txt}`);
          return;
        }
        const data = await res.json();
        setUploads(data.uploads ?? []);
      } catch (e: any) {
        setError(`Network/JS error: ${String(e)}`);
      }
    }
    if (isLoaded && isSignedIn) load();
  }, [isLoaded, isSignedIn]);

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

        .upload-card{
          padding:20px 24px;border-radius:16px;
          background:#141414;border:1px solid #222;
          transition:border-color 0.2s;
        }
        .upload-card:hover{border-color:rgba(232,98,44,0.3)}

        .status-pill{
          display:inline-block;padding:3px 10px;border-radius:20px;
          font-size:12px;font-weight:500;font-family:monospace;
          background:#1a1a1a;border:1px solid #2a2a2a;color:#999;
        }
      `}</style>

      <div style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        fontFamily: "'Outfit', -apple-system, system-ui, sans-serif",
        padding: "48px 24px",
        maxWidth: 700,
        margin: "0 auto",
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 36 }}>
          <img src="/logo.png" alt="ClipFlow — Find Your Flow" style={{ width: 140, height: "auto" }} />
        </div>

        {/* Beta badge */}
        <div style={{
          display: "inline-block",
          padding: "6px 16px",
          borderRadius: 24,
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "1.5px",
          marginBottom: 24,
          background: "linear-gradient(135deg,#e8622c,#f0a830)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
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
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              uploads
            </span>
          </h1>
          <Link
            href="/upload"
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg,#e8622c,#f0a830)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              fontFamily: "'Outfit', sans-serif",
              textDecoration: "none",
              whiteSpace: "nowrap" as const,
            }}
          >
            + Upload Video
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: 24,
            padding: "14px 18px",
            borderRadius: 14,
            background: "rgba(252,165,165,0.08)",
            border: "1px solid rgba(252,165,165,0.2)",
            color: "#fca5a5",
            fontSize: 13,
            whiteSpace: "pre-wrap",
          }}>
            {error}
          </div>
        )}

        {/* Upload list */}
        {myUploads.length === 0 ? (
          <div style={{
            padding: "32px 24px",
            borderRadius: 16,
            background: "#141414",
            border: "1px solid #222",
            color: "#666",
            fontSize: 15,
            textAlign: "center",
          }}>
            No uploads yet. Upload your first game video to get started.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {myUploads.map((u) => (
              <div key={u.id} className="upload-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <Link
                    href={`/uploads/${u.id}`}
                    style={{
                      fontWeight: 600,
                      fontSize: 16,
                      color: "#fff",
                      textDecoration: "none",
                      lineHeight: 1.3,
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = "linear-gradient(135deg,#e8622c,#f0a830)", e.currentTarget.style.WebkitBackgroundClip = "text", e.currentTarget.style.WebkitTextFillColor = "transparent")}
                    onMouseOut={e => (e.currentTarget.style.background = "none", e.currentTarget.style.WebkitTextFillColor = "#fff")}
                  >
                    {u.original_filename}
                  </Link>
                  <span className="status-pill">{u.status}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
                  {new Date(u.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer tagline */}
        <p style={{
          marginTop: 48,
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: "2px",
          textTransform: "uppercase",
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