"use client";
import { useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api";
import { useRouter } from "next/navigation";

const MAX_RECORD_SEC = 180; // 3 minutes

export default function UploadPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");

  // hidden file inputs
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const recordInputRef = useRef<HTMLInputElement>(null);

  // countdown state (only active while user is in native camera)
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(MAX_RECORD_SEC);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // ── record button: start countdown, open camera ───────────────────────────
  function startRecording() {
    setStatus("");
    setFile(null);
    setCountdown(MAX_RECORD_SEC);
    setRecording(true);

    // tick every second so the user can see the limit
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // trigger the hidden capture input
    recordInputRef.current?.click();
  }

  // ── when user finishes recording and hands back the file ──────────────────
  function onRecordingComplete(e: React.ChangeEvent<HTMLInputElement>) {
    clearInterval(countdownRef.current!);
    setRecording(false);
    setCountdown(MAX_RECORD_SEC);

    const f = e.target.files?.[0] ?? null;
    if (!f) { setStatus("No video captured."); return; }

    setFile(f);
    setStatus("");

    // auto-submit immediately — user just finished recording
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
  if (!isLoaded)    return <div style={loadingStyle}>Loading…</div>;
  if (!isSignedIn)  return <div style={loadingStyle}>Please sign in first.</div>;

  const uploading = status !== "" && !status.includes("✅") && !status.toLowerCase().includes("error") && !status.toLowerCase().includes("failed");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a0a;color:#fff;font-family:'Outfit',-apple-system,system-ui,sans-serif}

        .btn-primary{
          padding:14px 32px;border-radius:14px;border:none;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-weight:600;font-size:15px;
          font-family:'Outfit',sans-serif;cursor:pointer;
          transition:opacity 0.2s;width:100%;
        }
        .btn-primary:hover{opacity:0.9}
        .btn-primary:disabled{background:#222;color:#555;cursor:not-allowed;opacity:1}

        .btn-record{
          padding:14px 32px;border-radius:14px;
          background:#141414;border:1px solid rgba(232,98,44,0.35);
          color:#e8622c;font-weight:600;font-size:15px;
          font-family:'Outfit',sans-serif;cursor:pointer;
          transition:border-color 0.2s,background 0.2s;width:100%;
        }
        .btn-record:hover{border-color:rgba(232,98,44,0.7);background:rgba(232,98,44,0.06)}
        .btn-record:disabled{opacity:0.5;cursor:not-allowed}

        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .recording-dot{
          display:inline-block;width:10px;height:10px;border-radius:50%;
          background:#e8622c;margin-right:8px;
          animation:pulse 1s ease-in-out infinite;
        }
      `}</style>

      <div style={{
        background: "#0a0a0a", minHeight: "100vh",
        fontFamily: "'Outfit', -apple-system, system-ui, sans-serif",
        padding: "48px 24px", maxWidth: 600, margin: "0 auto",
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 36 }}>
          <img src="/logo.png" alt="ClipFlow — Find Your Flow" style={{ width: 140, height: "auto" }} />
        </div>

        {/* Beta badge */}
        <div style={{
          display: "inline-block", padding: "6px 16px", borderRadius: 24,
          fontSize: 11, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "1.5px", marginBottom: 24,
          background: "linear-gradient(135deg,#e8622c,#f0a830)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          border: "1px solid rgba(232,98,44,0.3)",
        }}>
          Beta Testing
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.5px", marginBottom: 12 }}>
          Upload a{" "}
          <span style={{
            background: "linear-gradient(135deg,#e8622c,#f0a830)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            game video
          </span>
        </h1>

        {/* Beta notice */}
        <div style={{
          padding: "14px 18px", borderRadius: 14,
          background: "rgba(232,98,44,0.08)", border: "1px solid rgba(232,98,44,0.25)",
          color: "#f0a830", fontSize: 14, lineHeight: 1.6, marginBottom: 32, fontWeight: 400,
        }}>
          ⚠️ <strong style={{ fontWeight: 600 }}>Beta Testing:</strong> Users are currently limited to shorter videos.
          Please ensure your video upload is <strong style={{ fontWeight: 600 }}>shorter than 5 minutes</strong>.
        </div>

        {/* ── OPTION 1: Choose existing file ──────────────────────────────── */}
        <div style={{
          padding: "28px 24px", borderRadius: 16,
          background: "#141414", border: "1px solid #222", marginBottom: 12,
        }}>
          <label style={{
            display: "block", fontSize: 13, color: "#999",
            fontWeight: 500, marginBottom: 10,
            textTransform: "uppercase", letterSpacing: "1px",
          }}>
            Choose a saved video
          </label>

          {/* hidden standard file picker */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            style={{ display: "none" }}
            onChange={onFileChange}
          />

          <button
            className="btn-record"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || recording}
            style={{ marginBottom: file ? 12 : 0 }}
          >
            📁 Browse files
          </button>

          {file && !recording && (
            <div style={{ fontSize: 13, color: "#999", marginTop: 10 }}>
              Selected: <span style={{ color: "#fff" }}>{file.name}</span>
            </div>
          )}
        </div>

        {/* ── OPTION 2: Record now ────────────────────────────────────────── */}
        <div style={{
          padding: "28px 24px", borderRadius: 16,
          background: "#141414", border: "1px solid #222", marginBottom: 16,
        }}>
          <label style={{
            display: "block", fontSize: 13, color: "#999",
            fontWeight: 500, marginBottom: 4,
            textTransform: "uppercase", letterSpacing: "1px",
          }}>
            Record a new clip
          </label>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
            Opens your camera — up to 3 minutes. Video uploads automatically when you stop recording.
          </div>

          {/* hidden capture input — rear camera, video only */}
          <input
            ref={recordInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={onRecordingComplete}
          />

          {recording ? (
            <div style={{
              padding: "14px 18px", borderRadius: 12,
              background: "rgba(232,98,44,0.08)", border: "1px solid rgba(232,98,44,0.25)",
              fontSize: 15, fontWeight: 600, color: "#e8622c",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span><span className="recording-dot" />Recording…</span>
              <span style={{ fontFamily: "monospace", fontSize: 16 }}>
                {fmt(countdown)} remaining
              </span>
            </div>
          ) : (
            <button
              className="btn-record"
              onClick={startRecording}
              disabled={uploading}
            >
              🎥 Record Video
            </button>
          )}
        </div>

        {/* ── Upload button (only shown when a file is picked manually) ───── */}
        {file && !recording && (
          <button
            className="btn-primary"
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