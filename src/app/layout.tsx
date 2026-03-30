export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClipFlow — Find Your Flow",
  description: "ClipFlow uses AI to automatically find every hit in your youth baseball game footage and compile a highlight reel in minutes.",
  metadataBase: new URL("https://www.clipflow.pro"),
  openGraph: {
    title: "ClipFlow — Find Your Flow",
    description: "AI-powered youth baseball highlight reels. Upload your game footage and ClipFlow finds every hit automatically.",
    url: "https://www.clipflow.pro",
    siteName: "ClipFlow",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ClipFlow — AI-powered youth baseball highlight reels",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClipFlow — Find Your Flow",
    description: "AI-powered youth baseball highlight reels. Upload your game footage and ClipFlow finds every hit automatically.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          signInFallbackRedirectUrl="/upload"
          signUpFallbackRedirectUrl="/upload"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}