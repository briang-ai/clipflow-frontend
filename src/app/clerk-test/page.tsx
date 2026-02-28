"use client";

import { useSession } from "@clerk/nextjs";

export default function ClerkTest() {
  const { isLoaded, isSignedIn } = useSession();

  if (!isLoaded) return <div>Loading…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Clerk Test</h1>
      <div>Signed in: {String(isSignedIn)}</div>
    </div>
  );
}