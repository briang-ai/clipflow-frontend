"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

type ClipRow = {
  id: string;
  upload_id: string;
  bucket: string;
  s3_key: string;
  label: string;
  created_at: string;
};

export default function UploadDetailPage() {
  const { isLoaded, isSignedIn } = useUser();
  const params = useParams();
  const uploadId = String(params.uploadId);

  const [clips, setClips] = useState<ClipRow[]>([]);
  const [error, setError] = useState<string>("");

async function downloadClip(clipId: string) {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/clips/${clipId}/download`);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    const data = await res.json();
    if (!data?.download_url) {
      setError("No download_url returned: " + JSON.stringify(data));
      return;
    }
    window.open(data.download_url, "_blank");
  } catch (e: any) {
    setError(String(e));
  }
}

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/uploads/${uploadId}/clips`);
        if (!res.ok) {
          setError(await res.text());
          return;
        }
        const data = await res.json();
        setClips(data.clips ?? []);
      } catch (e: any) {
        setError(String(e));
      }
    }
    if (uploadId) load();
  }, [uploadId]);

  if (!isLoaded) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!isSignedIn) return <div style={{ padding: 24 }}>Please sign in.</div>;

  return (
    <div style={{ padding: 24 }}>
      <p>
        <Link href="/uploads">← Back to uploads</Link>
      </p>
      <h1>Upload</h1>
      <p style={{ opacity: 0.8 }}>{uploadId}</p>

      {error && <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>}

      <h2>Clips</h2>
      {clips.length === 0 ? (
        <p>No clips found yet.</p>
      ) : (
        <ul>
          {clips.map((c) => (
            <li key={c.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <strong>{c.label}</strong>
                <button onClick={() => downloadClip(c.id)}>Download</button>
              </div>
              <div style={{ fontFamily: "monospace" }}>{c.s3_key}</div>
              <div>{new Date(c.created_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

