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

        // IMPORTANT: use API_BASE (prod Render URL) not localhost
        const url = `${API_BASE}/api/uploads/recent?limit=50`;

        const res = await fetch(url, {
          method: "GET",
          // Avoid caching weirdness during early beta
          cache: "no-store",
        });

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

  if (!isLoaded) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!isSignedIn) return <div style={{ padding: 24 }}>Please sign in.</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>My uploads</h1>

      <p style={{ marginTop: 8 }}>
        <Link href="/upload">Upload another video</Link>
      </p>

      {error && (
        <pre style={{ marginTop: 16, whiteSpace: "pre-wrap", color: "#fca5a5" }}>
          {error}
        </pre>
      )}

      <div style={{ marginTop: 16 }}>
        {myUploads.length === 0 ? (
          <p>No uploads yet for your user.</p>
        ) : (
          <ul>
            {myUploads.map((u) => (
              <li key={u.id} style={{ marginBottom: 14 }}>
                <div>
                  <Link href={`/uploads/${u.id}`}>
                    <strong>{u.original_filename}</strong>
                  </Link>
                </div>
                <div style={{ fontFamily: "monospace", opacity: 0.8 }}>{u.status}</div>
                <div style={{ opacity: 0.7 }}>{new Date(u.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}