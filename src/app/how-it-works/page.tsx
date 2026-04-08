"use client";
import Link from "next/link";
import Nav from "@/components/Nav";

const steps = [
  {
    number: "01",
    emoji: "🎥",
    title: "Film the game",
    description:
      "Record straight from your phone — no special equipment needed. Upload one clip or an entire game's worth of footage. ClipFlow accepts any standard video format.",
  },
  {
    number: "02",
    emoji: "🤖",
    title: "AI finds every hit",
    description:
      "Our AI watches every second of your footage, analyzing each frame for bat-ball contact, swing mechanics, and audio cracks. Hits and swings are automatically tagged so nothing gets missed.",
  },
  {
    number: "03",
    emoji: "✂️",
    title: "Curate your reel",
    description:
      "Review every detected clip and choose exactly what makes the cut. Keep only the best hits, add swings, pull from multiple games — the final reel is completely yours to craft.",
  },
  {
    number: "04",
    emoji: "🚀",
    title: "Share the moment",
    description:
      "Your highlight reel compiles in minutes. Download it, share a link, or send it straight to coaches, family, and teammates. Every reel is a memory that lasts forever.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a0a;color:#fff;font-family:'Outfit',-apple-system,system-ui,sans-serif}

        .hiw-hero{
          text-align:center;
          padding:72px 24px 56px;
          max-width:680px;
          margin:0 auto;
        }
        .hiw-eyebrow{
          display:inline-block;
          font-size:11px;font-weight:700;
          text-transform:uppercase;letter-spacing:2.5px;
          color:#e8622c;margin-bottom:20px;
        }
        .hiw-headline{
          font-size:clamp(32px,6vw,52px);
          font-weight:800;line-height:1.1;
          letter-spacing:-1px;
          margin-bottom:20px;
        }
        .hiw-headline span{
          background:linear-gradient(135deg,#e8622c,#f0a830);
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
        }
        .hiw-subhead{
          font-size:17px;color:#666;
          line-height:1.7;max-width:520px;margin:0 auto 36px;
        }
        .hiw-cta-row{
          display:flex;align-items:center;justify-content:center;
          gap:12px;flex-wrap:wrap;
        }
        .btn-primary{
          padding:13px 28px;border-radius:12px;border:none;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-weight:700;font-size:15px;
          font-family:'Outfit',sans-serif;cursor:pointer;
          text-decoration:none;display:inline-block;
          transition:opacity 0.2s;
        }
        .btn-primary:hover{opacity:0.9}
        .btn-ghost{
          padding:13px 28px;border-radius:12px;
          background:transparent;border:1px solid #2a2a2a;
          color:#888;font-weight:500;font-size:15px;
          font-family:'Outfit',sans-serif;cursor:pointer;
          text-decoration:none;display:inline-block;
          transition:border-color 0.2s,color 0.2s;
        }
        .btn-ghost:hover{border-color:rgba(232,98,44,0.4);color:#fff}

        /* Steps */
        .hiw-steps{
          max-width:720px;margin:0 auto;
          padding:0 24px 80px;
          display:flex;flex-direction:column;gap:0;
        }
        .hiw-step{
          display:grid;
          grid-template-columns:80px 1fr;
          gap:0 24px;
          position:relative;
        }
        /* Connector line between steps */
        .hiw-step:not(:last-child) .hiw-step-left::after{
          content:'';
          position:absolute;
          left:39px;
          top:80px;
          bottom:-1px;
          width:2px;
          background:linear-gradient(to bottom,#1e1e1e,#1e1e1e);
        }

        .hiw-step-left{
          display:flex;flex-direction:column;
          align-items:center;
          position:relative;
          padding-top:4px;
        }
        .hiw-step-circle{
          width:56px;height:56px;border-radius:50%;
          background:#111;border:1px solid #222;
          display:flex;align-items:center;justify-content:center;
          font-size:24px;flex-shrink:0;
          position:relative;z-index:1;
        }
        .hiw-step-num{
          font-size:10px;font-weight:700;
          color:#333;letter-spacing:1px;
          margin-top:8px;
        }

        .hiw-step-right{
          padding:0 0 56px 0;
        }
        .hiw-step:last-child .hiw-step-right{
          padding-bottom:0;
        }
        .hiw-step-title{
          font-size:22px;font-weight:700;
          margin-bottom:10px;line-height:1.2;
          padding-top:12px;
        }
        .hiw-step-desc{
          font-size:15px;color:#666;
          line-height:1.75;max-width:520px;
        }

        /* Social proof strip */
        .hiw-proof{
          border-top:1px solid #141414;
          border-bottom:1px solid #141414;
          padding:40px 24px;
          text-align:center;
          margin-bottom:72px;
        }
        .hiw-proof-label{
          font-size:11px;font-weight:700;
          text-transform:uppercase;letter-spacing:2px;
          color:#333;margin-bottom:20px;
        }
        .hiw-proof-pills{
          display:flex;align-items:center;justify-content:center;
          gap:12px;flex-wrap:wrap;
        }
        .hiw-pill{
          padding:8px 18px;border-radius:24px;
          background:#111;border:1px solid #1e1e1e;
          font-size:13px;color:#888;font-weight:500;
        }
        .hiw-pill span{
          color:#e8622c;font-weight:700;margin-right:4px;
        }

        /* Bottom CTA */
        .hiw-bottom-cta{
          text-align:center;
          padding:0 24px 96px;
          max-width:560px;margin:0 auto;
        }
        .hiw-bottom-cta h2{
          font-size:clamp(26px,5vw,40px);
          font-weight:800;letter-spacing:-0.5px;
          line-height:1.15;margin-bottom:16px;
        }
        .hiw-bottom-cta h2 span{
          background:linear-gradient(135deg,#e8622c,#f0a830);
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
        }
        .hiw-bottom-cta p{
          font-size:15px;color:#555;
          line-height:1.7;margin-bottom:32px;
        }

        .hiw-slogan{
          margin-top:64px;
          text-align:center;
          font-size:13px;font-weight:500;
          letter-spacing:2px;text-transform:uppercase;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
          padding-bottom:48px;
        }

        @media(max-width:480px){
          .hiw-step{grid-template-columns:56px 1fr;gap:0 16px}
          .hiw-step-circle{width:44px;height:44px;font-size:20px}
          .hiw-step:not(:last-child) .hiw-step-left::after{left:31px}
        }
      `}</style>

      <Nav />

      {/* Hero */}
      <div className="hiw-hero">
        <div className="hiw-eyebrow">How ClipFlow works</div>
        <h1 className="hiw-headline">
          From the dugout<br />
          <span>to forever.</span>
        </h1>
        <p className="hiw-subhead">
          Your kid's best moments happen fast. ClipFlow captures every hit, every swing,
          and turns a full game's footage into a highlight reel you'll share for years —
          in just a few taps.
        </p>
        <div className="hiw-cta-row">
          <Link href="/sign-up" className="btn-primary">🎥 Sign up to get started</Link>
          <Link href="/uploads" className="btn-ghost">View my uploads</Link>
        </div>
      </div>

      {/* Steps */}
      <div className="hiw-steps">
        {steps.map((step) => (
          <div key={step.number} className="hiw-step">
            <div className="hiw-step-left">
              <div className="hiw-step-circle">{step.emoji}</div>
              <div className="hiw-step-num">{step.number}</div>
            </div>
            <div className="hiw-step-right">
              <div className="hiw-step-title">{step.title}</div>
              <div className="hiw-step-desc">{step.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Social proof strip */}
      <div className="hiw-proof">
        <div className="hiw-proof-label">Built for baseball families</div>
        <div className="hiw-proof-pills">
          <div className="hiw-pill"><span>⚾</span>AI hit detection</div>
          <div className="hiw-pill"><span>📱</span>Works on any phone</div>
          <div className="hiw-pill"><span>⚡</span>Reel ready in minutes</div>
          <div className="hiw-pill"><span>🔗</span>One-tap sharing</div>
          <div className="hiw-pill"><span>🎬</span>No editing skills needed</div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="hiw-bottom-cta">
        <h2>Ready to make your first<br /><span>highlight reel?</span></h2>
        <p>
          Upload your game footage and let ClipFlow do the work.
          Your player's best moments deserve to be remembered.
        </p>
        <Link href="/sign-up" className="btn-primary">Sign up to get started</Link>
      </div>

      <p className="hiw-slogan">Find Your Flow</p>
    </>
  );
}