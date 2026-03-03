"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api";

type ClipRow = {
  id: string;
  upload_id: string;
  bucket: string;
  s3_key: string;
  label: string;
  player_name?: string | null;
  jersey_number?: string | null;
  created_at: string;
};

export default function UploadDetailPage() {
  const { isLoaded, isSignedIn } = useUser();
  const params = useParams();
  const uploadId = String(params.uploadId);

  const [clips, setClips] = useState<ClipRow[]>([]);
  const [error, setError] = useState<string>("");
  const [savingId, setSavingId] = useState<string>("");

  const [draft, setDraft] = useState<
    Record<string, { player_name: string; jersey_number: string }>
  >({});

  useEffect(() => {
    async function load() {
      try {
        setError("");
        const res = await fetch(
          `${API_BASE}/api/uploads/${uploadId}/clips`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          setError(await res.text());
          return;
        }

        const data = await res.json();
        const newClips: ClipRow[] = data.clips ?? [];
        setClips(newClips);

        const nextDraft: Record<
          string,
          { player_name: string; jersey_number: string }
        > = {};

        for (const c of newClips) {
          nextDraft[c.id] = {
            player_name: c.player_name ?? "",
            jersey_number: c.jersey_number ?? "",
          };
        }

        setDraft(nextDraft);
      } catch (e: any) {
        setError(String(e));
      }
    }

    if (uploadId) load();
  }, [uploadId]);

  async function saveLabels(clipId: string) {
    try {
      setSavingId(clipId);
      const payload = draft[clipId];

      const res = await fetch(`${API_BASE}/api/clips/${clipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setError(await res.text());
      }
    } catch (e: any) {
      setError(String(e));
    } finally {
      setSavingId("");
    }
  }

  if (!isLoaded) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!isSignedIn) return <div style={{ padding: 24 }}>Please sign in.</div>;

  return (
    <div style={{ padding: 24 }}>
      <Link href="/uploads">← Back to uploads</Link>

      <h1 style={{ marginTop: 12 }}>Clips</h1>

      {error && <pre style={{ color: "red" }}>{error}</pre>}

      {clips.length === 0 ? (
        <p>No clips yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {clips.map((c) => (
            <li
              key={c.id}
              style={{
                border: "1px solid #333",
                padding: 12,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <strong>{c.label}</strong>

              <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                <input
                  placeholder="Player name"
                  value={draft[c.id]?.player_name || ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [c.id]: {
                        ...prev[c.id],
                        player_name: e.target.value,
                      },
                    }))
                  }
                />

                <input
                  placeholder="Jersey #"
                  value={draft[c.id]?.jersey_number || ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [c.id]: {
                        ...prev[c.id],
                        jersey_number: e.target.value,
                      },
                    }))
                  }
                  style={{ width: 100 }}
                />

                <button
                  onClick={() => saveLabels(c.id)}
                  disabled={savingId === c.id}
                >
                  {savingId === c.id ? "Saving..." : "Save"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}