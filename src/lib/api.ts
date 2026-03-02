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