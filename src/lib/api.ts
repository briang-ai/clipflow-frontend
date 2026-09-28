function normalizeBaseUrl(url: string) {
  // Trim and remove any trailing slash
  let u = url.trim().replace(/\/+$/, "");

  // If someone pasted without protocol, default to https
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    u = `https://${u}`;
  }

  return u;
}

export const API_BASE = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"
);

// Clerk puts its browser client on window.Clerk once it has loaded.
type ClerkLike = { loaded?: boolean; session?: { getToken: () => Promise<string | null> } | null };
declare global {
  interface Window { Clerk?: ClerkLike }
}

async function getSessionToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  // Wait up to ~5s for Clerk to finish loading on first page view.
  for (let i = 0; i < 50 && !window.Clerk?.loaded; i++) {
    await new Promise(r => setTimeout(r, 100));
  }
  try {
    return (await window.Clerk?.session?.getToken()) ?? null;
  } catch {
    return null;
  }
}

/**
 * fetch() for the ClipFlow API. Adds the signed-in user's login token so the
 * backend can check who is asking and only return that user's own videos.
 * Usage: apiFetch("/api/uploads/recent", { cache: "no-store" })
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = await getSessionToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}
