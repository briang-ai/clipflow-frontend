import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Outfit',-apple-system,system-ui,sans-serif;background:#0a0a0a;color:#fff;min-height:100vh}

        .w{max-width:900px;margin:0 auto;padding:48px 24px 72px;font-family:'Outfit',-apple-system,system-ui,sans-serif}

        .nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:56px}
        .nav img{width:140px;height:auto}
        .nav-signin{
          padding:10px 22px;border-radius:12px;border:none;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-weight:600;font-size:14px;
          font-family:'Outfit',sans-serif;
          cursor:pointer;text-decoration:none;
          transition:opacity 0.2s,transform 0.1s
        }
        .nav-signin:hover{opacity:0.9}
        .nav-signin:active{transform:scale(0.98)}

        .badge{
          display:inline-block;padding:6px 16px;border-radius:24px;
          font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;
          margin-bottom:24px;
          background-image:linear-gradient(135deg,#e8622c,#f0a830);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
          border:1px solid rgba(232,98,44,0.3)
        }

        h1{font-size:52px;font-weight:700;line-height:1.1;margin-bottom:20px;letter-spacing:-0.5px;max-width:700px}
        h1 span{
          background:linear-gradient(135deg,#e8622c,#f0a830);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent
        }

        .sub{color:#999;font-size:18px;line-height:1.6;max-width:620px;margin-bottom:36px;font-weight:300}

        .cta-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:64px}
        .btn-primary{
          padding:14px 24px;border-radius:14px;border:none;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-weight:600;font-size:15px;
          font-family:'Outfit',sans-serif;
          cursor:pointer;text-decoration:none;
          transition:opacity 0.2s,transform 0.1s
        }
        .btn-primary:hover{opacity:0.9}
        .btn-primary:active{transform:scale(0.98)}
        .btn-secondary{
          padding:14px 24px;border-radius:14px;
          background:#141414;border:1px solid #222;
          color:#fff;font-weight:500;font-size:15px;
          font-family:'Outfit',sans-serif;
          cursor:pointer;text-decoration:none;
          transition:border-color 0.2s
        }
        .btn-secondary:hover{border-color:rgba(232,98,44,0.4)}

        .divider{width:40px;height:3px;background:linear-gradient(135deg,#e8622c,#f0a830);border-radius:2px;margin-bottom:24px}

        .section-label{
          font-size:11px;font-weight:600;text-transform:uppercase;
          letter-spacing:2px;color:#666;margin-bottom:20px
        }

        .steps{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-bottom:0}
        .step{
          padding:24px 20px;border-radius:16px;
          background:#141414;border:1px solid #222;
          transition:border-color 0.2s
        }
        .step:hover{border-color:rgba(232,98,44,0.3)}

        .step-num{
          display:inline-block;width:20px;height:20px;border-radius:6px;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-size:11px;font-weight:700;line-height:20px;
          text-align:center;margin-bottom:10px
        }

        .si{font-size:28px;margin-bottom:10px}
        .st{font-size:15px;font-weight:600;margin-bottom:6px}
        .sd{font-size:13px;color:#999;line-height:1.5;font-weight:300}

        .footer-tagline{
          margin-top:48px;font-size:14px;font-weight:500;
          letter-spacing:2px;text-transform:uppercase;
          background:linear-gradient(135deg,#e8622c,#f0a830);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent
        }

        @media(max-width:600px){
          .w{padding:32px 16px 56px}
          h1{font-size:34px}
          .sub{font-size:15px}
          .nav img{width:110px}
          .steps{grid-template-columns:1fr}
        }
      `}</style>

      <div className="w">
        {/* Nav */}
        <div className="nav">
          <img src="/logo.png" alt="ClipFlow — Find Your Flow" />
          <a href="https://www.clipflow.pro/sign-in" className="nav-signin">
            Sign Up / Sign In
          </a>
        </div>

        {/* Hero */}
        <div className="badge">Scottsdale Little League · Early Access</div>
        <h1>
          Turn game footage into{" "}
          <span>player highlights</span>{" "}
          automatically.
        </h1>
        <p className="sub">
          Upload a game video and ClipFlow breaks it into clips, scores potential
          highlights, and gives you playable per-player segments — so you never
          scrub through footage again.
        </p>

        <div className="cta-row">
          <Link href="/join" className="btn-primary">Join Early Access</Link>
          <Link href="/upload" className="btn-secondary">Record / Upload Video</Link>
          <Link href="/uploads" className="btn-secondary">View Uploads</Link>
        </div>

        {/* How it works */}
        <div className="divider" />
        <p className="section-label">How it works</p>

        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <div className="si">📱</div>
            <div className="st">Record / Upload</div>
            <div className="sd">Record live or drop in a game recording from your phone.</div>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <div className="si">🤖</div>
            <div className="st">AI Analyzes</div>
            <div className="sd">ClipFlow segments the video and identifies every at-bat automatically.</div>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <div className="si">🎬</div>
            <div className="st">Get Clips</div>
            <div className="sd">Play clips, label players, and download or share highlight reels.</div>
          </div>
        </div>

        <p className="footer-tagline">Find Your Flow</p>
      </div>
    </>
  );
}