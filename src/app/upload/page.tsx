"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";

export default function UploadPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");

  if (!isLoaded) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!isSignedIn) return <div style={{ padding: 24 }}>Please sign in first.</div>;

  if (!isLoaded) {
    setStatus("Loading user…");
    return;
  }
  if (!isSignedIn || !user) {
    setStatus("Please sign in before uploading.");
    return;
  }
 
async function handleUpload() {
  if (!file) return;

  try {
    setStatus("Requesting upload link…");

    const res = await fetch("http://127.0.0.1:8000/api/uploads/create", {
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

    const completeRes = await fetch("http://127.0.0.1:8000/api/uploads/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_id: data.upload_id }),
    });

    if (!completeRes.ok) {
      setStatus("Finalize failed: " + (await completeRes.text()));
      return;
    }

    setStatus("Upload complete ✅");
  } catch (e: any) {
    setStatus("Network/JS error: " + String(e));
  }
}

  return (
    <div style={{ padding: 24 }}>
      <h1>Upload a game video</h1>
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <div style={{ marginTop: 12 }}>
        <button onClick={handleUpload} disabled={!file}>
          Upload
        </button>
      </div>
      <p style={{ marginTop: 12 }}>{status}</p>
    </div>
  );
}