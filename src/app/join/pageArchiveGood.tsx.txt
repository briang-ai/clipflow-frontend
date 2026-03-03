"use client";

import { useState } from "react";

export default function JoinPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  async function submitEmail() {
    setError("");

    const e = email.trim();
    if (!e || !e.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("https://formspree.io/f/mzdawkrw", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: e }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Form submission failed (${res.status})`);
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submitEmail();
  }

  return (
    <>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,system-ui,sans-serif;background:#030712;color:#fff;min-height:100vh}
        .w{max-width:480px;margin:0 auto;padding:40px 20px;text-align:center}
        .logo{display:inline-flex;align-items:center;gap:8px;margin-bottom:32px}
        .li{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#3b82f6);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px}
        .lt{font-weight:700;font-size:22px;letter-spacing:-0.5px}
        .badge{display:inline-block;padding:4px 14px;border-radius:20px;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.2);color:#a78bfa;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px}
        h1{font-size:32px;font-weight:700;line-height:1.2;margin-bottom:16px}
        h1 span{background:linear-gradient(135deg,#a78bfa,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .sub{color:#9ca3af;font-size:15px;line-height:1.6;margin-bottom:32px}
        .fm{display:flex;gap:8px;margin-bottom:8px}
        .fm input{flex:1;padding:14px 16px;border-radius:12px;background:#111827;border:1px solid #374151;color:#fff;font-size:14px;outline:none}
        .fm input:focus{border-color:rgba(139,92,246,.5)}
        .fm button{padding:14px 24px;border-radius:12px;border:none;background:linear-gradient(135deg,#7c3aed,#3b82f6);color:#fff;font-weight:600;font-size:14px;cursor:pointer;white-space:nowrap}
        .fm button:disabled{opacity:.6;cursor:not-allowed}
        .hint{color:#4b5563;font-size:12px;margin-bottom:40px}
        .steps{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:32px}
        .step{padding:16px 12px;border-radius:12px;background:rgba(17,24,39,.6);border:1px solid #1f2937}
        .si{font-size:24px;margin-bottom:8px}
        .st{font-size:12px;font-weight:600;margin-bottom:4px}
        .sd{font-size:10px;color:#6b7280;line-height:1.4}
        .trust{padding:16px;border-radius:12px;background:rgba(17,24,39,.3);border:1px solid #1f2937;color:#9ca3af;font-size:12px}
        .ok{color:#34d399;display:block;margin-bottom:24px;font-weight:500}
        .err{color:#fca5a5;font-size:12px;margin-top:10px;white-space:pre-wrap}
      `}</style>

      <div className="w">
        <div className="logo">
          <div className="li">CF</div>
          <div className="lt">ClipFlow</div>
        </div>

        <div className="badge">Scottsdale Little League · Early Access</div>

        <h1>
          Game video to
          <br />
          <span>player highlights</span>
          <br />
          automatically.
        </h1>

        <p className="sub">
          Upload your game recording and our AI finds every at-bat and builds per-player highlight reels — so you never
          scrub through footage again.
        </p>

        {!submitted ? (
          <>
            <div className="fm">
              <input
                type="email"
                id="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={submitting}
              />
              <button onClick={submitEmail} disabled={submitting}>
                {submitting ? "Joining..." : "Join Waitlist"}
              </button>
            </div>

            {error && <div className="err">{error}</div>}

            <p className="hint">Free for early testers. No credit card needed.</p>
          </>
        ) : (
          <>
            <p className="ok">You're on the list! We'll be in touch soon.</p>
            <p className="hint">Free for early testers. No credit card needed.</p>
          </>
        )}

        <div className="steps">
          <div className="step">
            <div className="si">📱</div>
            <div className="st">Upload</div>
            <div className="sd">Record the game, upload when ready</div>
          </div>
          <div className="step">
            <div className="si">🤖</div>
            <div className="st">AI Analyzes</div>
            <div className="sd">Finds at-bats and identifies players</div>
          </div>
          <div className="step">
            <div className="si">🎬</div>
            <div className="st">Get Clips</div>
            <div className="sd">Download highlights by player</div>
          </div>
        </div>

        <div className="trust">🔒 No facial recognition. No long-term video storage. Built with your family&apos;s privacy in mind.</div>
      </div>
    </>
  );
}