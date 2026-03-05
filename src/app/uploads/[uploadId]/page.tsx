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
  label?: string | null;
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
  const [openingId, setOpeningId] = useState<string>("");

  const [draft, setDraft] = useState<
    Record<string, { player_name: string; jersey_number: string }>
  >({});

  async function loadClips() {
    try {
      setError("");
      const res = await fetch(`${API_BASE}/api/uploads/${uploadId}/clips`, {
        cache: "no-store",
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      const data = await res.json();
      const newClips: ClipRow[] = data.clips ?? [];
      setClips(newClips);

      const nextDraft: Record<string, { player_name: string; jersey_number: string }> = {};
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

  useEffect(() => {
    if (uploadId) loadClips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadId]);

  async function saveLabels(clipId: string) {
    try {
      setError("");
      setSavingId(clipId);

      const payload = draft[clipId] ?? { player_name: "", jersey_number: "" };

      const res = await fetch(`${API_BASE}/api/clips/${clipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      // Reload to reflect saved values from DB (optional but nice)
      await loadClips();
    } catch (e: any) {
      setError(String(e));
    } finally {
      setSavingId("");
    }
  }

  async function openClip(clipId: string) {
    try {
      setError("");
      setOpeningId(clipId);

      const res = await fetch(`${API_BASE}/api/clips/${clipId}/download`, {
        cache: "no-store",
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      const data = await res.json();
      const url = data?.download_url;

      if (!url) {
        setError("Missing download_url in response: " + JSON.stringify(data));
        return;
      }

      // This will either play in a new tab or download depending on browser/S3 headers
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setError(String(e));
    } finally {
      setOpeningId("");
    }
  }

  if (!isLoaded) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!isSignedIn) return <div style={{ padding: 24 }}>Please sign in.</div>;

  return (
    <div style={{ padding: 24 }}>
      <Link href="/uploads">← Back to uploads</Link>

      <h1 style={{ marginTop: 12 }}>Clips</h1>
      <div style={{ opacity: 0.75, fontFamily: "monospace", marginBottom: 12 }}>
        Upload ID: {uploadId}
      </div>

      {error && (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#1b1b1b",
            border: "1px solid #333",
            padding: 12,
            borderRadius: 8,
            color: "#ffb4b4",
            marginBottom: 12,
          }}
        >
          {error}
        </pre>
      )}

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
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>{c.label || "Clip"}</strong>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                    {c.s3_key}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <button
                    onClick={() => openClip(c.id)}
                    disabled={openingId === c.id}
                    style={{ padding: "6px 10px", borderRadius: 8 }}
                  >
                    {openingId === c.id ? "Opening…" : "Play/Download"}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  placeholder="Player name"
                  value={draft[c.id]?.player_name || ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [c.id]: {
                        ...(prev[c.id] ?? { player_name: "", jersey_number: "" }),
                        player_name: e.target.value,
                      },
                    }))
                  }
                  style={{ padding: 8, borderRadius: 8, border: "1px solid #333", minWidth: 220 }}
                />

                <input
                  placeholder="Jersey #"
                  value={draft[c.id]?.jersey_number || ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [c.id]: {
                        ...(prev[c.id] ?? { player_name: "", jersey_number: "" }),
                        jersey_number: e.target.value,
                      },
                    }))
                  }
                  style={{ width: 110, padding: 8, borderRadius: 8, border: "1px solid #333" }}
                />

                <button
                  onClick={() => saveLabels(c.id)}
                  disabled={savingId === c.id}
                  style={{ padding: "8px 12px", borderRadius: 8 }}
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