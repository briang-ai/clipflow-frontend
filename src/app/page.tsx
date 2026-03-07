import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        maxWidth: 900,
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ marginBottom: 18, fontSize: 14, opacity: 0.7 }}>
        ClipFlow
      </div>

      <h1 style={{ fontSize: 44, lineHeight: 1.1, marginBottom: 16 }}>
        Turn baseball game footage into highlight clips automatically.
      </h1>

      <p style={{ fontSize: 18, opacity: 0.8, maxWidth: 700, marginBottom: 28 }}>
        Upload a game video and ClipFlow breaks it into clips, scores potential highlights,
        and gives you playable segments fast.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 36 }}>
        <Link
          href="/upload"
          style={{
            padding: "12px 18px",
            borderRadius: 10,
            textDecoration: "none",
            border: "1px solid #333",
          }}
        >
          Upload Video
        </Link>

        <Link
          href="/uploads"
          style={{
            padding: "12px 18px",
            borderRadius: 10,
            textDecoration: "none",
            border: "1px solid #333",
          }}
        >
          View Uploads
        </Link>

        <Link
          href="/join"
          style={{
            padding: "12px 18px",
            borderRadius: 10,
            textDecoration: "none",
            border: "1px solid #333",
          }}
        >
          Join Early Access
        </Link>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div style={{ border: "1px solid #333", borderRadius: 12, padding: 16 }}>
          <h3>1. Upload</h3>
          <p style={{ opacity: 0.75 }}>
            Drop in a game recording from your phone or camera.
          </p>
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 12, padding: 16 }}>
          <h3>2. Process</h3>
          <p style={{ opacity: 0.75 }}>
            ClipFlow segments the video into short baseball moments automatically.
          </p>
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 12, padding: 16 }}>
          <h3>3. Review</h3>
          <p style={{ opacity: 0.75 }}>
            Play clips, label players, and review which ones may be real highlights.
          </p>
        </div>
      </div>
    </main>
  );
}