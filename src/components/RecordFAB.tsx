"use client";
import { useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";

export default function RecordFAB() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const recordInputRef = useRef<HTMLInputElement>(null);

  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [showStatus, setShowStatus] = useState(false);

  // Don't render if not signed in
  if (!isLoaded || !isSignedIn) return null;

  function startRecording() {
    if (uploading) return;
    setStatus("");
    setShowStatus(false);
    setRecording(true);
    recordInputRef.current?.click();

    const onFocus = () => {
      setTimeout(() => {
        setRecording(prev => {
          if (prev && !recordInputRef.current?.files?.length) return false;
          return prev;
        });
      }, 500);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
  }

  async function onRecordingComplete(e: React.ChangeEvent<HTMLInputElement>) {
    setRecording(false);
    const f = e.target.files?.[0] ?? null;
    if (!f) return;

    try {
      setUploading(true);
      setStatus("Uploading…");
      setShowStatus(true);

      const res = await fetch(`${API_BASE}/api/uploads/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user!.id,
          original_filename: f.name,
          content_type: f.type || "application/octet-stream",
        }),
      });
      const rawText = await res.text();
      if (!res.ok) { setStatus("Upload failed"); return; }

      let data: any;
      try { data = JSON.parse(rawText); } catch { setStatus("Upload failed"); return; }
      if (!data?.presigned_url) { setStatus("Upload failed"); return; }

      const putRes = await fetch(data.presigned_url, {
        method: "PUT",
        headers: { "Content-Type": f.type || "application/octet-stream" },
        body: f,
      });
      if (!putRes.ok) { setStatus("Upload failed"); return; }

      const completeRes = await fetch(`${API_BASE}/api/uploads/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_id: data.upload_id }),
      });
      if (!completeRes.ok) { setStatus("Upload failed"); return; }

      setStatus("✅ Done!");
      setTimeout(() => {
        setShowStatus(false);
        router.push(`/uploads/${data.upload_id}`);
      }, 1000);
    } catch {
      setStatus("Upload failed");
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (recordInputRef.current) recordInputRef.current.value = "";
    }
  }

  const isActive = recording || uploading;

  return (
    <>
      <style>{`
        .fab-wrap{
          position:fixed;bottom:28px;right:24px;
          z-index:200;display:flex;flex-direction:column;
          align-items:flex-end;gap:10px;
        }
        .fab-status{
          padding:8px 14px;border-radius:20px;
          background:rgba(20,20,20,0.95);border:1px solid #2a2a2a;
          color:#ccc;font-size:13px;font-weight:500;
          font-family:'Outfit',sans-serif;
          backdrop-filter:blur(8px);white-space:nowrap;
        }
        .fab-status.success{color:#34d399;border-color:rgba(52,211,153,0.3)}
        .fab-status.error{color:#fca5a5;border-color:rgba(252,165,165,0.3)}
        .fab-btn{
          width:60px;height:60px;border-radius:50%;border:none;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-size:24px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 4px 20px rgba(232,98,44,0.4);
          transition:transform 0.15s,opacity 0.15s,box-shadow 0.15s;
          flex-shrink:0;
        }
        .fab-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(232,98,44,0.55)}
        .fab-btn:active{transform:scale(0.96)}
        .fab-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        .fab-btn.recording{
          background:rgba(232,98,44,0.15);
          border:2px solid rgba(232,98,44,0.4);
          box-shadow:none;
        }

        @keyframes fab-pulse{0%,100%{box-shadow:0 4px 20px rgba(232,98,44,0.4)}50%{box-shadow:0 4px 28px rgba(232,98,44,0.7)}}
        .fab-btn.uploading{animation:fab-pulse 1s ease-in-out infinite}

        @keyframes spin{to{transform:rotate(360deg)}}
        .fab-spinner{
          width:22px;height:22px;border:3px solid rgba(255,255,255,0.3);
          border-top-color:#fff;border-radius:50%;
          animation:spin 0.7s linear infinite;
        }
      `}</style>

      <div className="fab-wrap">
        {/* Status toast */}
        {showStatus && status && (
          <div className={`fab-status${status.includes("✅") ? " success" : status.includes("failed") ? " error" : ""}`}>
            {status}
          </div>
        )}

        {/* FAB button */}
        <button
          className={`fab-btn${recording ? " recording" : ""}${uploading ? " uploading" : ""}`}
          onClick={startRecording}
          disabled={isActive}
          title="Record a video"
          aria-label="Record video"
        >
          {uploading ? (
            <div className="fab-spinner" />
          ) : recording ? (
            <span style={{ fontSize: 20 }}>⏺</span>
          ) : (
            <span>🎥</span>
          )}
        </button>
      </div>

      {/* Hidden camera input */}
      <input
        ref={recordInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={onRecordingComplete}
      />
    </>
  );
}