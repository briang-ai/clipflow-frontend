"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

type UploadRow = {
  id: string;
  user_id: string;
  original_filename: string;
  status: string;
  created_at: string;
};

export default function UploadsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/uploads/recent?limit=50");
        if (!res.ok) {
          setError(await res.text());
          return;
        }
        const data = await res.json();
        setUploads(data.uploads ?? []);
      } catch (e: any) {
        setError(String(e));
      }
    }
    load();
  }, []);

  if (!isLoaded) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!isSignedIn) return <div style={{ padding: 24 }}>Please sign in.</div>;

  // optional filter to your user only
  const mine = uploads.filter((u) => u.user_id === user.id);

  return (
    <div style={{ padding: 24 }}>
      <h1>My uploads</h1>
      <p>
        <Link href="/upload">Upload another video</Link>
      </p>

      {error && <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>}

      <ul>
        {mine.map((u) => (
          <li key={u.id} style={{ marginBottom: 10 }}>
            <strong>
  	      <Link href={`/uploads/${u.id}`}>{u.original_filename}</Link>
	    </strong>
            <div>Status: {u.status}</div>
            <div>{new Date(u.created_at).toLocaleString()}</div>
          </li>
        ))}
      </ul>

      {mine.length === 0 && <p>No uploads yet for your user.</p>}
    </div>
  );
}