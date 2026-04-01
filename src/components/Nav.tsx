"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

const navLinks = [
  { href: "/upload",  label: "🎥 Record" },
  { href: "/uploads", label: "📂 My Uploads" },
  { href: "/plans",   label: "⭐ Plans" },
];

export default function Nav() {
  const { signOut } = useClerk();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <style>{`
        .nav-root{
          position:sticky;top:0;z-index:50;
          background:rgba(10,10,10,0.92);
          backdrop-filter:blur(12px);
          border-bottom:1px solid #1a1a1a;
        }
        .nav-inner{
          max-width:900px;margin:0 auto;
          padding:0 20px;height:56px;
          display:flex;align-items:center;justify-content:space-between;
        }
        .nav-logo{width:110px;height:auto;display:block}

        /* Desktop links */
        .nav-links{display:flex;align-items:center;gap:4px}
        .nav-link{
          padding:7px 14px;border-radius:10px;
          font-size:13px;font-weight:500;
          color:#666;text-decoration:none;
          transition:color 0.15s,background 0.15s;
          font-family:'Outfit',sans-serif;
          white-space:nowrap;
        }
        .nav-link:hover{color:#fff;background:#141414}
        .nav-link.active{color:#fff;background:#141414}
        .nav-link.gradient{
          background:linear-gradient(135deg,#e8622c,#f0a830);
          color:#fff;font-weight:600;
          padding:7px 16px;
        }
        .nav-link.gradient:hover{opacity:0.9;background:linear-gradient(135deg,#e8622c,#f0a830)}

        .nav-signout{
          background:none;border:none;cursor:pointer;
          color:#444;font-size:13px;font-weight:500;
          font-family:'Outfit',sans-serif;
          padding:7px 14px;border-radius:10px;
          transition:color 0.15s,background 0.15s;
        }
        .nav-signout:hover{color:#fff;background:#141414}

        /* Hamburger */
        .nav-hamburger{
          display:none;
          background:none;border:none;cursor:pointer;
          padding:8px;border-radius:8px;
          color:#888;font-size:20px;line-height:1;
          transition:color 0.15s;
        }
        .nav-hamburger:hover{color:#fff}

        /* Mobile drawer */
        .nav-drawer{
          position:fixed;inset:0;z-index:49;
        }
        .nav-backdrop{
          position:absolute;inset:0;
          background:rgba(0,0,0,0.7);
          backdrop-filter:blur(4px);
        }
        .nav-panel{
          position:absolute;top:0;right:0;bottom:0;
          width:260px;background:#111;
          border-left:1px solid #1e1e1e;
          display:flex;flex-direction:column;
          padding:24px 16px;gap:4px;
        }
        .nav-panel-close{
          align-self:flex-end;background:none;border:none;
          color:#555;font-size:22px;cursor:pointer;
          margin-bottom:16px;padding:4px 8px;
          border-radius:8px;transition:color 0.15s;
        }
        .nav-panel-close:hover{color:#fff}
        .nav-panel-link{
          padding:13px 16px;border-radius:12px;
          font-size:15px;font-weight:500;
          color:#888;text-decoration:none;
          transition:color 0.15s,background 0.15s;
          font-family:'Outfit',sans-serif;
        }
        .nav-panel-link:hover,.nav-panel-link.active{
          color:#fff;background:#1a1a1a;
        }
        .nav-panel-signout{
          margin-top:auto;background:none;border:none;
          cursor:pointer;color:#444;font-size:14px;
          font-weight:500;font-family:'Outfit',sans-serif;
          padding:13px 16px;border-radius:12px;text-align:left;
          transition:color 0.15s,background 0.15s;
        }
        .nav-panel-signout:hover{color:#ef4444;background:rgba(239,68,68,0.08)}

        @media(max-width:600px){
          .nav-links{display:none}
          .nav-hamburger{display:block}
        }
      `}</style>

      <nav className="nav-root">
        <div className="nav-inner">
          {/* Logo */}
          <Link href="/uploads">
            <img src="/logo.png" alt="ClipFlow" className="nav-logo" />
          </Link>

          {/* Desktop nav */}
          <div className="nav-links">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link${pathname === href ? " active" : ""}${href === "/upload" ? " gradient" : ""}`}
              >
                {label}
              </Link>
            ))}
            <button className="nav-signout" onClick={() => signOut({ redirectUrl: "/sign-in" })}>
              Sign out
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="nav-hamburger" onClick={() => setOpen(true)} aria-label="Open menu">
            ☰
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="nav-drawer">
          <div className="nav-backdrop" onClick={() => setOpen(false)} />
          <div className="nav-panel">
            <button className="nav-panel-close" onClick={() => setOpen(false)}>✕</button>
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`nav-panel-link${pathname === href ? " active" : ""}`}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <button
              className="nav-panel-signout"
              onClick={() => signOut({ redirectUrl: "/sign-in" })}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}