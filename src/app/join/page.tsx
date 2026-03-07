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
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Outfit',-apple-system,system-ui,sans-serif;background:#0a0a0a;color:#fff;min-height:100vh}

        .w{max-width:520px;margin:0 auto;padding:48px 20px 60px;text-align:center}

        .logo{margin-bottom:36px}
        .logo img{width:160px;height:auto}

        .badge{
          display:inline-block;padding:6px 16px;border-radius:24px;
          font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;
          margin-bottom:24px;
          background-image:linear-gradient(135deg,#e8622c,#f0a830);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
          border:1px solid rgba(232,98,44,0.3)
        }

        h1{font-size:36px;font-weight:700;line-height:1.2;margin-bottom:16px;letter-spacing:-0.5px}
        h1 span{
          background:linear-gradient(135deg,#e8622c,#f0a830);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent
        }

        .sub{color:#999;font-size:16px;line-height:1.6;margin-bottom:36px;font-weight:300}

        .fm{display:flex;gap:8px;margin-bottom:10px}
        .fm input{
          flex:1;padding:14px 18px;border-radius:14px;
          background:#141414;border:1px solid #222;
          color:#fff;font-size:15px;font-family:'Outfit',sans-serif;
          outline:none;transition:border-color 0.2s
        }
        .fm input:focus{border-color:#e8622c}
        .fm input::placeholder{color:#666}
        .fm button{
          padding:14px 28px;border-radius:14px;border:none;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-weight:600;font-size:15px;
          font-family:'Outfit',sans-serif;
          cursor:pointer;white-space:nowrap;
          transition:opacity 0.2s,transform 0.1s
        }
        .fm button:hover{opacity:0.9}
        .fm button:active{transform:scale(0.98)}
        .fm button:disabled{opacity:0.5;cursor:not-allowed}

        .hint{color:#666;font-size:13px;margin-bottom:28px}

        .signup-btn{
          display:inline-block;
          padding:14px 28px;border-radius:14px;border:none;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-weight:600;font-size:15px;
          font-family:'Outfit',sans-serif;
          cursor:pointer;text-decoration:none;
          transition:opacity 0.2s,transform 0.1s;
          margin-bottom:44px;
        }
        .signup-btn:hover{opacity:0.9}
        .signup-btn:active{transform:scale(0.98)}

        .ok{
          color:#34d399;display:block;margin-bottom:24px;font-weight:500;font-size:16px;
          padding:16px;border-radius:14px;
          background:rgba(52,211,153,0.08);
          border:1px solid rgba(52,211,153,0.2)
        }

        .err{color:#fca5a5;font-size:13px;margin-top:10px;margin-bottom:8px;white-space:pre-wrap}

        .divider{width:40px;height:3px;background:linear-gradient(135deg,#e8622c,#f0a830);border-radius:2px;margin:0 auto 24px}

        .section-label{
          font-size:11px;font-weight:600;text-transform:uppercase;
          letter-spacing:2px;color:#666;margin-bottom:16px
        }

        .steps{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:36px}
        .step{
          padding:20px 14px;border-radius:16px;
          background:#141414;border:1px solid #222;
          transition:border-color 0.2s
        }
        .step:hover{border-color:rgba(232,98,44,0.3)}

        .step-num{
          display:inline-block;width:20px;height:20px;border-radius:6px;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-size:11px;font-weight:700;line-height:20px;
          text-align:center;margin-bottom:8px
        }

        .si{font-size:28px;margin-bottom:10px}
        .st{font-size:14px;font-weight:600;margin-bottom:4px}
        .sd{font-size:12px;color:#999;line-height:1.5;font-weight:300}

        .trust{
          padding:18px 20px;border-radius:16px;
          background:#141414;border:1px solid #222;
          color:#999;font-size:13px;line-height:1.6;font-weight:300
        }
        .trust strong{color:#fff;font-weight:500}

        .footer-tagline{
          margin-top:40px;font-size:14px;font-weight:500;
          letter-spacing:2px;text-transform:uppercase;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent
        }

        @media(max-width:480px){
          .w{padding:32px 16px 48px}
          h1{font-size:28px}
          .sub{font-size:14px}
          .fm{flex-direction:column}
          .fm button{padding:14px}
          .signup-btn{width:100%;text-align:center}
          .steps{grid-template-columns:1fr;gap:8px}
          .step{display:flex;align-items:center;gap:14px;text-align:left;padding:16px}
          .step .si{margin-bottom:0;font-size:24px}
          .logo img{width:130px}
        }
      `}</style>

      <div className="w">
        {/* Logo */}
        <div className="logo">
          <img src="/logo.png" alt="ClipFlow — Find Your Flow" />
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
          Record your kid&apos;s game. Upload the video. Our AI finds every
          at-bat and builds per-player highlight reels &mdash; so you never
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
          <p className="ok">&#10003; You&apos;re on the list! We&apos;ll be in touch soon.</p>
        )}

        {/* Sign Up CTA */}
        <a href="https://www.clipflow.pro/sign-up" className="signup-btn">
          Take Me To Sign Up →
        </a>

        {/* Divider */}
        <div className="divider"></div>
        <p className="section-label">How it works</p>

        <div className="steps">
          <div className="step">
            <div>
              <div className="step-num">1</div>
              <div className="si">📱</div>
              <div className="st">Upload</div>
              <div className="sd">Record the game on your phone, upload when you&apos;re ready</div>
            </div>
          </div>
          <div className="step">
            <div>
              <div className="step-num">2</div>
              <div className="si">🤖</div>
              <div className="st">AI Analyzes</div>
              <div className="sd">We find every at-bat and identify players automatically</div>
            </div>
          </div>
          <div className="step">
            <div>
              <div className="step-num">3</div>
              <div className="si">🎬</div>
              <div className="st">Get Clips</div>
              <div className="sd">Download or share highlight reels organized by player</div>
            </div>
          </div>
        </div>

        <div className="trust">
          &#128274; <strong>Built for families.</strong> No facial recognition.
          No long-term video storage. Your footage stays private and is
          automatically deleted after processing.
        </div>

        <p className="footer-tagline">Find Your Flow</p>
      </div>
    </>
  );
}