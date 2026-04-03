"use client";
import Link from "next/link";
import Nav from "@/components/Nav";

const plans = [
  {
    id: "founding",
    label: "Founding Member",
    badge: "BETA USERS ONLY",
    badgeColor: "rgba(232,98,44,0.9)",
    color: "#e8622c",
    highlight: false,
    description: "Locked in for life. Never increases. Our thank you for believing in us from day one.",
    features: [
      "Everything in Pro — forever",
      "Price locked for life",
      "Founding Member badge in app",
      "Direct line to founders",
      "Vote on new features",
      "First 50 members only",
    ],
    cta: "Coming Soon",
  },
  {
    id: "basic",
    label: "Basic",
    badge: null,
    color: "#888",
    highlight: false,
    description: "Perfect for families just getting started.",
    features: [
      "Up to 5 highlight reels/month",
      "AI hit detection",
      "Share to social media",
      "Standard quality export",
      "Email support",
      "Mobile & web access",
    ],
    cta: "Coming Soon",
  },
  {
    id: "pro",
    label: "Pro",
    badge: "MOST POPULAR",
    badgeColor: "rgba(52,211,153,0.9)",
    color: "#e8622c",
    highlight: true,
    description: "For serious travel ball families who never want to miss a moment.",
    features: [
      "Unlimited highlight reels",
      "AI hit detection",
      "HD quality export",
      "Share to any platform",
      "Priority support",
      "Early access to new features",
    ],
    cta: "Coming Soon",
  },
  {
    id: "team",
    label: "Team",
    badge: "BEST VALUE",
    badgeColor: "rgba(240,168,48,0.9)",
    color: "#f0a830",
    highlight: false,
    description: "For coaches and team managers — covers the whole team.",
    features: [
      "Up to 15 families per team",
      "Everything in Pro for all families",
      "Team highlight reel builder",
      "Coach dashboard",
      "Season recap video",
      "Tournament highlight packages",
      "Dedicated support",
      "Custom team branding",
    ],
    cta: "Coming Soon",
  },
];

export default function PlansPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a0a;color:#fff;font-family:'Outfit',-apple-system,system-ui,sans-serif}

        .plan-card{
          border-radius:16px;background:#141414;
          border:1px solid #222;overflow:hidden;
          transition:border-color 0.2s;
        }
        .plan-card.highlight{border-color:rgba(232,98,44,0.4)}
        .plan-card:hover{border-color:rgba(232,98,44,0.3)}

        .badge{padding:5px 0;text-align:center;font-size:11px;font-weight:700;letter-spacing:1.5px}
        .badge-spacer{height:27px}

        .feature-row{display:flex;gap:10px;padding:5px 0;font-size:13px}
        .feature-check{color:#e8622c;font-weight:700;flex-shrink:0;margin-top:1px}
        .feature-text{color:#888}

        .btn-soon{
          width:100%;padding:12px 0;border-radius:10px;
          background:#1a1a1a;border:1px solid #2a2a2a;
          color:#555;font-weight:600;font-size:14px;
          font-family:'Outfit',sans-serif;cursor:default;
          letter-spacing:0.3px;
        }

        .pill{
          display:inline-flex;align-items:center;gap:5px;
          padding:4px 12px;border-radius:20px;
          background:rgba(232,98,44,0.08);
          border:1px solid rgba(232,98,44,0.2);
          font-size:12px;color:#e8622c;font-weight:500;
        }

        @media(max-width:600px){
          .plans-grid{grid-template-columns:1fr !important}
        }
      `}</style>

      <Nav />
      import RecordFAB from "@/components/RecordFAB";

      // in JSX, after <Nav />:
      <RecordFAB />

      <div style={{
        background: "#0a0a0a", minHeight: "100vh",
        fontFamily: "'Outfit', -apple-system, system-ui, sans-serif",
        padding: "32px 20px", maxWidth: 780, margin: "0 auto",
      }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="pill" style={{ marginBottom: 16 }}>
            Pricing Coming Soon
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.5px", marginBottom: 14 }}>
            Plans built for{" "}
            <span style={{ background: "linear-gradient(135deg,#e8622c,#f0a830)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              baseball families
            </span>
          </h1>
          <p style={{ fontSize: 15, color: "#555", maxWidth: 480, margin: "0 auto 20px" }}>
            We're still finalizing our pricing. ClipFlow is free during beta —
            enjoy unlimited access while we build something great together.
          </p>
          <Link href="/upload" style={{
            display: "inline-block", padding: "12px 28px", borderRadius: 12,
            background: "linear-gradient(135deg,#e8622c,#f0a830)",
            color: "#fff", fontWeight: 600, fontSize: 14,
            fontFamily: "'Outfit',sans-serif", textDecoration: "none",
          }}>
            Start for free →
          </Link>
        </div>

        {/* Plans grid */}
        <div className="plans-grid" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 48,
        }}>
          {plans.map(plan => (
            <div key={plan.id} className={`plan-card${plan.highlight ? " highlight" : ""}`}>
              {plan.badge ? (
                <div className="badge" style={{ background: plan.badgeColor, color: "#fff" }}>
                  {plan.badge}
                </div>
              ) : (
                <div className="badge-spacer" />
              )}

              <div style={{ padding: "20px 20px 24px" }}>
                <div style={{
                  fontSize: 18, fontWeight: 800, marginBottom: 6,
                  background: plan.highlight ? "linear-gradient(135deg,#e8622c,#f0a830)" : "none",
                  WebkitBackgroundClip: plan.highlight ? "text" : "unset",
                  WebkitTextFillColor: plan.highlight ? "transparent" : plan.color,
                  color: plan.color,
                }}>
                  {plan.label}
                </div>

                <div style={{ fontSize: 13, color: "#555", marginBottom: 20, lineHeight: 1.5, minHeight: 40 }}>
                  {plan.description}
                </div>

                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "#0f0f0f", border: "1px solid #1e1e1e",
                  marginBottom: 20, textAlign: "center",
                }}>
                  <span style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>Pricing coming soon</span>
                </div>

                <div style={{ marginBottom: 20 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} className="feature-row">
                      <span className="feature-check" style={{ color: plan.color }}>✓</span>
                      <span className="feature-text">{f}</span>
                    </div>
                  ))}
                </div>

                <button className="btn-soon">{plan.cta}</button>
              </div>
            </div>
          ))}
        </div>

        {/* Beta notice */}
        <div style={{
          padding: "24px", borderRadius: 16,
          background: "#111", border: "1px solid #1e1e1e",
          textAlign: "center", marginBottom: 48,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            🎉 Currently in free beta
          </div>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 20, lineHeight: 1.6 }}>
            All features are free while we're in beta. Sign up now to lock in
            early access and be first in line for our Founding Member pricing.
          </div>
          <Link href="/sign-up" style={{
            display: "inline-block", padding: "11px 24px", borderRadius: 12,
            background: "linear-gradient(135deg,#e8622c,#f0a830)",
            color: "#fff", fontWeight: 600, fontSize: 14,
            fontFamily: "'Outfit',sans-serif", textDecoration: "none",
          }}>
            Join free during beta →
          </Link>
        </div>

        <p style={{
          textAlign: "center", fontSize: 13, fontWeight: 500,
          letterSpacing: "2px", textTransform: "uppercase",
          background: "linear-gradient(135deg,#e8622c,#f0a830)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Find Your Flow
        </p>
      </div>
    </>
  );
}