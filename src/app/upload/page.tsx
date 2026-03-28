"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api";
import { useRouter } from "next/navigation";

const MAX_RECORD_SEC = 180; // 3 minutes

export default function UploadPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const recordInputRef = useRef<HTMLInputElement>(null);

  const [recording, setRecording] = useState(false);

  // ── shared upload logic ───────────────────────────────────────────────────
  async function handleUpload(uploadFile: File) {
    if (!isLoaded) { setStatus("Loading user…"); return; }
    if (!isSignedIn || !user) { setStatus("Please sign in before uploading."); return; }

    try {
      setStatus("Requesting upload link…");
      const res = await fetch(`${API_BASE}/api/uploads/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          original_filename: uploadFile.name,
          content_type: uploadFile.type || "application/octet-stream",
        }),
      });
      const rawText = await res.text();
      if (!res.ok) { setStatus(`Backend error (${res.status}): ${rawText}`); return; }

      let data: any;
      try { data = JSON.parse(rawText); }
      catch { setStatus("Backend returned non-JSON: " + rawText); return; }

      if (!data?.presigned_url) {
        setStatus("Missing presigned_url in response: " + JSON.stringify(data));
        return;
      }

      setStatus("Uploading to S3…");
      const putRes = await fetch(data.presigned_url, {
        method: "PUT",
        headers: { "Content-Type": uploadFile.type || "application/octet-stream" },
        body: uploadFile,
      });
      if (!putRes.ok) {
        setStatus(`S3 upload failed: ${putRes.status} ${await putRes.text().catch(() => "")}`);
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

  // ── file picker handler ───────────────────────────────────────────────────
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setStatus("");
  }

  // ── record button ─────────────────────────────────────────────────────────
  function startRecording() {
    setStatus("");
    setFile(null);
    setRecording(true);
    recordInputRef.current?.click();

    // If user dismisses camera without recording, onChange won't fire on mobile.
    // Listen for the page regaining focus and reset recording state if no file arrived.
    const onFocus = () => {
      setTimeout(() => {
        setRecording(prev => {
          // Only reset if we're still in recording state (no file was selected)
          if (prev && !recordInputRef.current?.files?.length) return false;
          return prev;
        });
      }, 500); // small delay to let onChange fire first if a file was selected
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
  }

  function onRecordingComplete(e: React.ChangeEvent<HTMLInputElement>) {
    setRecording(false);
    const f = e.target.files?.[0] ?? null;
    if (!f) { setStatus("No video captured."); return; }
    setFile(f);
    setStatus("");
    handleUpload(f);
  }

  function fmt(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ── auth guards ───────────────────────────────────────────────────────────
  const loadingStyle = {
    background: "#0a0a0a", minHeight: "100vh", padding: 24,
    color: "#fff", fontFamily: "'Outfit', system-ui, sans-serif",
  };
  if (!isLoaded)   return <div style={loadingStyle}>Loading…</div>;
  if (!isSignedIn) return <div style={loadingStyle}>Please sign in first.</div>;

  const uploading = status !== "" && !status.includes("✅") && !status.toLowerCase().includes("error") && !status.toLowerCase().includes("failed");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a0a;color:#fff;font-family:'Outfit',-apple-system,system-ui,sans-serif}

        .btn-record-main{
          width:100%;padding:18px 32px;border-radius:16px;border:none;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-weight:700;font-size:17px;
          font-family:'Outfit',sans-serif;cursor:pointer;
          transition:opacity 0.2s;letter-spacing:0.2px;
        }
        .btn-record-main:hover{opacity:0.9}
        .btn-record-main:disabled{opacity:0.5;cursor:not-allowed}

        .btn-browse{
          background:none;border:none;cursor:pointer;
          color:#555;font-size:14px;font-weight:500;
          font-family:'Outfit',sans-serif;
          transition:color 0.2s;text-decoration:underline;
          text-underline-offset:3px;padding:0;
        }
        .btn-browse:hover{color:#ccc}
        .btn-browse:disabled{opacity:0.4;cursor:not-allowed}

        .btn-upload{
          width:100%;padding:14px 32px;border-radius:14px;border:none;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-weight:600;font-size:15px;
          font-family:'Outfit',sans-serif;cursor:pointer;
          transition:opacity 0.2s;
        }
        .btn-upload:hover{opacity:0.9}
        .btn-upload:disabled{background:#222;color:#555;cursor:not-allowed;opacity:1}

        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .recording-dot{
          display:inline-block;width:10px;height:10px;border-radius:50%;
          background:#fff;margin-right:8px;
          animation:pulse 1s ease-in-out infinite;
        }
      `}</style>

      <div style={{
        background: "#0a0a0a", minHeight: "100vh",
        fontFamily: "'Outfit', -apple-system, system-ui, sans-serif",
        padding: "48px 24px", maxWidth: 520, margin: "0 auto",
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 36 }}>
          <img src="/logo.png" alt="ClipFlow — Find Your Flow" style={{ width: 140, height: "auto" }} />
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.5px", marginBottom: 40 }}>
          Record{" "}
          <span style={{
            background: "linear-gradient(135deg,#e8622c,#f0a830)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            game video
          </span>
        </h1>

        {/* Hidden inputs */}
        <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={onFileChange} />
        <input ref={recordInputRef} type="file" accept="video/*" capture="environment" style={{ display: "none" }} onChange={onRecordingComplete} />

        {/* Record button / recording state */}
        {recording ? (
          <div style={{
            width: "100%", padding: "18px 24px", borderRadius: 16,
            background: "rgba(232,98,44,0.08)", border: "1px solid rgba(232,98,44,0.25)",
            fontSize: 15, fontWeight: 600, color: "#e8622c",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 20,
          }}>
            <span><span className="recording-dot" style={{ background: "#e8622c" }} />Recording…</span>
          </div>
        ) : (
          <button
            className="btn-record-main"
            onClick={startRecording}
            disabled={uploading}
            style={{ marginBottom: 20 }}
          >
            🎥 Record Video
          </button>
        )}

        {/* Browse link */}
        {!recording && (
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <button
              className="btn-browse"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Or choose a saved video
            </button>
          </div>
        )}

        {/* View uploads link */}
        {!recording && (
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Link
              href="/uploads"
              style={{
                color: "#444", fontSize: 13, fontWeight: 500,
                textDecoration: "underline", textUnderlineOffset: "3px",
                fontFamily: "'Outfit', sans-serif", transition: "color 0.2s",
              }}
              onMouseOver={e => (e.currentTarget.style.color = "#888")}
              onMouseOut={e => (e.currentTarget.style.color = "#444")}
            >
              View my uploads
            </Link>
          </div>
        )}

        {/* Selected file name */}
        {file && !recording && (
          <div style={{ fontSize: 13, color: "#666", marginBottom: 16, textAlign: "center" }}>
            Selected: <span style={{ color: "#ccc" }}>{file.name}</span>
          </div>
        )}

        {/* Upload button — only shown when file picked manually */}
        {file && !recording && (
          <button
            className="btn-upload"
            onClick={() => handleUpload(file)}
            disabled={uploading}
            style={{ marginBottom: 16 }}
          >
            {uploading ? "Uploading…" : "Upload Video"}
          </button>
        )}

        {/* Status */}
        {status && (
          <div style={{
            marginTop: 4, padding: "14px 18px", borderRadius: 14,
            background: status.includes("✅") ? "rgba(52,211,153,0.08)" : "#141414",
            border: status.includes("✅") ? "1px solid rgba(52,211,153,0.2)" : "1px solid #222",
            color: status.includes("✅") ? "#34d399" : "#ccc",
            fontSize: 14, lineHeight: 1.6,
          }}>
            {status}
          </div>
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