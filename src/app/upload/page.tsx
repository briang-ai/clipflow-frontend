"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");

  async function handleUpload() {
    if (!file) return;
    if (!isLoaded) {
      setStatus("Loading user…");
      return;
    }
    if (!isSignedIn || !user) {
      setStatus("Please sign in before uploading.");
      return;
    }
    try {
      setStatus("Requesting upload link…");
      const res = await fetch(`${API_BASE}/api/uploads/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          original_filename: file.name,
          content_type: file.type || "application/octet-stream",
        }),
      });
      const rawText = await res.text();
      if (!res.ok) {
        setStatus(`Backend error (${res.status}): ${rawText}`);
        return;
      }
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        setStatus("Backend returned non-JSON: " + rawText);
        return;
      }
      if (!data?.presigned_url) {
        setStatus("Missing presigned_url in response: " + JSON.stringify(data));
        return;
      }
      setStatus("Uploading to S3…");
      const putRes = await fetch(data.presigned_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) {
        const errText = await putRes.text().catch(() => "");
        setStatus(`S3 upload failed: ${putRes.status} ${errText}`);
        return;
      }
      setStatus("Finalizing…");
      const completeRes = await fetch(`${API_BASE}/api/uploads/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_id: data.upload_id }),
      });
      if (!completeRes.ok) {
        setStatus("Finalize failed: " + (await completeRes.text()));
        return;
      }
      setStatus("Upload complete ✅ Redirecting…");
      router.push(`/uploads/${data.upload_id}`);
    } catch (e: any) {
      setStatus("Network/JS error: " + String(e));
    }
  }

  if (!isLoaded) return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", padding: 24, color: "#fff", fontFamily: "'Outfit', system-ui, sans-serif" }}>
      Loading…
    </div>
  );
  if (!isSignedIn) return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", padding: 24, color: "#fff", fontFamily: "'Outfit', system-ui, sans-serif" }}>
      Please sign in first.
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a0a;color:#fff;font-family:'Outfit',-apple-system,system-ui,sans-serif}
      `}</style>

      <div style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        fontFamily: "'Outfit', -apple-system, system-ui, sans-serif",
        padding: "48px 24px",
        maxWidth: 600,
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
          textTransform: "uppercase",
          letterSpacing: "1.5px",
          marginBottom: 24,
          background: "linear-gradient(135deg,#e8622c,#f0a830)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          border: "1px solid rgba(232,98,44,0.3)",
        }}>
          Beta Testing
        </div>

        {/* Page title */}
        <h1 style={{
          fontSize: 36,
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: "-0.5px",
          marginBottom: 12,
        }}>
          Upload a{" "}
          <span style={{
            background: "linear-gradient(135deg,#e8622c,#f0a830)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            game video
          </span>
        </h1>

        {/* Beta notice */}
        <div style={{
          padding: "14px 18px",
          borderRadius: 14,
          background: "rgba(232,98,44,0.08)",
          border: "1px solid rgba(232,98,44,0.25)",
          color: "#f0a830",
          fontSize: 14,
          lineHeight: 1.6,
          marginBottom: 32,
          fontWeight: 400,
        }}>
          ⚠️ <strong style={{ fontWeight: 600 }}>Beta Testing:</strong> Users are currently limited to shorter videos.
          Please ensure your video upload is <strong style={{ fontWeight: 600 }}>shorter than 5 minutes</strong>.
        </div>

        {/* File input area */}
        <div style={{
          padding: "28px 24px",
          borderRadius: 16,
          background: "#141414",
          border: "1px solid #222",
          marginBottom: 16,
        }}>
          <label style={{ display: "block", fontSize: 13, color: "#999", fontWeight: 500, marginBottom: 10, textTransform: "uppercase", letterSpacing: "1px" }}>
            Select video file
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{
              color: "#ccc",
              fontSize: 14,
              fontFamily: "'Outfit', sans-serif",
              width: "100%",
            }}
          />
          {file && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#999" }}>
              Selected: <span style={{ color: "#fff" }}>{file.name}</span>
            </div>
          )}
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!file}
          style={{
            padding: "14px 32px",
            borderRadius: 14,
            border: "none",
            background: file ? "linear-gradient(135deg,#e8622c,#f0a830)" : "#222",
            color: file ? "#fff" : "#555",
            fontWeight: 600,
            fontSize: 15,
            fontFamily: "'Outfit', sans-serif",
            cursor: file ? "pointer" : "not-allowed",
            transition: "opacity 0.2s, transform 0.1s",
            width: "100%",
          }}
          onMouseOver={e => { if (file) (e.target as HTMLButtonElement).style.opacity = "0.9"; }}
          onMouseOut={e => { (e.target as HTMLButtonElement).style.opacity = "1"; }}
        >
          Upload Video
        </button>

        {/* Status message */}
        {status && (
          <div style={{
            marginTop: 16,
            padding: "14px 18px",
            borderRadius: 14,
            background: status.includes("✅") ? "rgba(52,211,153,0.08)" : "#141414",
            border: status.includes("✅") ? "1px solid rgba(52,211,153,0.2)" : "1px solid #222",
            color: status.includes("✅") ? "#34d399" : "#ccc",
            fontSize: 14,
            lineHeight: 1.6,
          }}>
            {status}
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