"use client";

import { UserButton, useUser } from "@clerk/nextjs";

export default function Dashboard() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!isSignedIn) return <div style={{ padding: 24 }}>Not signed in</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p>
        Hello, {user.firstName ?? user.emailAddresses?.[0]?.emailAddress ?? "there"}!
      </p>
      <UserButton />
    </div>
  );
}