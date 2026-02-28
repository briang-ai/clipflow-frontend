"use client";

import Link from "next/link";

export default function JoinPage() {
  return (
    <div style={{ padding: 40, textAlign: "center", maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 40, marginBottom: 10 }}>ClipFlow</h1>

      <p style={{ fontSize: 18 }}>
        Turn your kid’s baseball videos into instant highlight clips.
      </p>

      <div style={{ marginTop: 30 }}>
        <Link href="/join">
          <button
            style={{
              padding: "14px 28px",
              fontSize: 18,
              background: "black",
              color: "white",
              borderRadius: 8,
              cursor: "pointer"
            }}
          >
            Create Free Account
          </button>
        </Link>
      </div>

      <p style={{ marginTop: 20, opacity: 0.7 }}>
        Opening Day Early Access ⚾
      </p>
    </div>
  );
}