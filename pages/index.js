import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const STEPS = [
  { icon: '🎙️', title: 'Speak naturally', body: 'Say what you spent — "I bought fuel for ₦20,000". No forms, no typing.' },
  { icon: '⚡', title: 'Auto-extracted', body: 'Date, amount, category and description pulled out instantly. Edit anything before saving.' },
  { icon: '📊', title: 'Synced live', body: 'Every entry lands in your Google Sheet and feeds your Power BI dashboard in real time.' },
];

const FEATURES = [
  { icon: '🇳🇬', title: 'Built for Nigeria', body: 'Understands Naira amounts, local merchants, Nigerian English and common phrases.' },
  { icon: '🔒', title: 'Your data, your sheet', body: 'Nothing stored on our servers. Transactions go straight to your own Google Sheet.' },
  { icon: '📱', title: 'Any device', body: 'Open in Chrome on your phone or laptop — no install needed.' },
  { icon: '📈', title: 'Power BI ready', body: 'Connect your Sheet once. Get live charts, category breakdowns and monthly trends.' },
  { icon: '⚡', title: 'Free to run', body: 'Speech runs in the browser. No API fees, no subscriptions, no hidden costs.' },
  { icon: '✏️', title: 'Always editable', body: 'Every field stays editable before you save. You stay in control.' },
];

function SignInModal({ onClose }) {
  const router = useRouter();
  const [mode, setMode] = useState('signin');
  const [done, setDone] = useState(false);
  const submit = (e) => { e.preventDefault(); setDone(true); setTimeout(() => router.push('/app'), 1200); };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="mclose" onClick={onClose}>✕</button>
        <div className="mlogo"><span className="teal-dot" />VoiceLog</div>
        {done ? (
          <div className="msuccess">
            <div className="mcheck">✓</div>
            <h3>Welcome!</h3>
            <p>Taking you to the app…</p>
          </div>
        ) : (
          <>
            <div className="mtabs">
              <button className={mode === 'signin' ? 'mtab on' : 'mtab'} onClick={() => setMode('signin')}>Sign in</button>
              <button className={mode === 'signup' ? 'mtab on' : 'mtab'} onClick={() => setMode('signup')}>Sign up</button>
            </div>
            <form className="mform" onSubmit={submit}>
              {mode === 'signup' && <div className="mfield"><label>Full name</label><input type="text" placeholder="Seun Nifemi" required /></div>}
              <div className="mfield"><label>Email</label><input type="email" placeholder="you@example.com" required /></div>
              <div className="mfield"><label>Password</label><input type="password" placeholder="••••••••" required /></div>
              <button type="submit" className="msubmit">{mode === 'signin' ? 'Sign in →' : 'Create account →'}</button>
            </form>
            <div className="mdiv"><span>or</span></div>
            <button className="gbtn" onClick={submit}>
              <svg width="16" height="16" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Landing() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const go = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setNavOpen(false); };

  return (
    <>
      <Head>
        <title>VoiceLog — Voice-Powered Spending Tracker</title>
        <meta name="description" content="Log spending by voice. Syncs to Google Sheets and Power BI." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      {showModal && <SignInModal onClose={() => setShowModal(false)} />}

      {/* Animated mesh background */}
      <div className="mesh-bg" aria-hidden="true">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="blob b4" />
      </div>

      {/* Nav */}
      <nav className={scrolled ? 'nav scrolled' : 'nav'}>
        <div className="nav-in">
          <div className="brand" onClick={() => go('hero')}>
            <span className="teal-dot" />VoiceLog
          </div>
          <div className={navOpen ? 'nlinks open' : 'nlinks'}>
            <button onClick={() => go('how')}>How it works</button>
            <button onClick={() => go('features')}>Features</button>
            <button onClick={() => go('about')}>About</button>
            <button className="nsign" onClick={() => { setShowModal(true); setNavOpen(false); }}>Sign in</button>
            <button className="ncta" onClick={() => router.push('/app')}>Start free →</button>
          </div>
          <button className="burger" onClick={() => setNavOpen(v => !v)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section id="hero" className="hero">
        <div className="wrap">
          <span className="eyebrow">🇳🇬 Built for Nigeria &nbsp;·&nbsp; 100% Free</span>
          <h1>Your voice is<br /><em>your budget tracker.</em></h1>
          <p className="hero-sub">Say what you spent. VoiceLog extracts the details and logs it to your Google Sheet — no forms, no typing.</p>
          <div className="hero-btns">
            <button className="btn-teal" onClick={() => router.push('/app')}>Start tracking free →</button>
            <button className="btn-ghost" onClick={() => go('how')}>See how it works</button>
          </div>
          <div className="hero-chips">
            {['Chrome & Edge', 'Google Sheets sync', 'Power BI ready'].map(c => (
              <span key={c} className="chip">{c}</span>
            ))}
          </div>
        </div>

        {/* Animated waveform */}
        <div className="wave-row" aria-hidden="true">
          {Array.from({ length: 48 }, (_, i) => (
            <div key={i} className="wbar" style={{
              height: `${14 + Math.abs(Math.sin(i * 0.42) * 36) + Math.abs(Math.cos(i * 0.28) * 18)}px`,
              animationDelay: `${i * 0.07}s`,
              animationDuration: `${1.4 + (i % 5) * 0.2}s`,
            }} />
          ))}
        </div>
      </section>

      {/* Stats */}
      <div className="stats-row">
        {[{ v: '₦0', l: 'Monthly cost' }, { v: '0s', l: 'Setup time' }, { v: '10+', l: 'Categories' }, { v: 'Live', l: 'Sheet sync' }].map(s => (
          <div key={s.l} className="stat-item">
            <strong>{s.v}</strong><span>{s.l}</span>
          </div>
        ))}
      </div>

      {/* How it works */}
      <section id="how" className="section">
        <div className="wrap">
          <div className="sec-hdr">
            <span className="tag">How it works</span>
            <h2>Three steps. Zero friction.</h2>
          </div>
          <div className="steps-grid">
            {STEPS.map((s, i) => (
              <div key={i} className="step-card">
                <div className="step-num">{String(i + 1).padStart(2, '0')}</div>
                <div className="step-ico">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
          <div className="phrase-box">
            <span className="phrase-label">Try saying</span>
            <div className="phrases">
              {['"I bought fuel for ₦20,000"', '"Paid 5k for groceries yesterday"', '"Electricity bill 15,000 last Friday"', '"Uber ride 3,500 naira"'].map(p => (
                <span key={p} className="phrase">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section alt-bg">
        <div className="wrap">
          <div className="sec-hdr">
            <span className="tag">Features</span>
            <h2>Everything you need.<br />Nothing you don't.</h2>
          </div>
          <div className="feat-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feat-card">
                <span className="feat-ico">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="section">
        <div className="wrap dash-layout">
          <div className="dash-text">
            <span className="tag">Power BI Integration</span>
            <h2>Your spending,<br />visualised live.</h2>
            <p>Every voice entry feeds your Sheet in real time. Connect once to Power BI and get live charts, category breakdowns and monthly trends — automatically.</p>
            <button className="btn-teal" onClick={() => router.push('/app')}>Start logging →</button>
          </div>
          <div className="dash-mock">
            <div className="dmcard">
              <div className="dmlabel">Total this month</div>
              <div className="dmval">₦847,500</div>
              {[{ c: 'Transport', w: 62, col: '#0d9488' }, { c: 'Food', w: 48, col: '#14b8a6' }, { c: 'Utilities', w: 35, col: '#5eead4' }, { c: 'Health', w: 20, col: '#99f6e4' }, { c: 'Other', w: 14, col: '#ccfbf1' }].map(b => (
                <div key={b.c} className="dmrow">
                  <span>{b.c}</span>
                  <div className="dmtrack"><div className="dmfill" style={{ width: `${b.w}%`, background: b.col }} /></div>
                </div>
              ))}
            </div>
            <div className="dmcard dmsmall">
              <div className="dmlabel">Today</div>
              <div className="dmval sm">₦12,400</div>
              {[{ e: '🚗', d: 'Fuel', a: '₦8,000' }, { e: '🍽️', d: 'Lunch', a: '₦2,400' }, { e: '💡', d: 'Airtime', a: '₦2,000' }].map(e => (
                <div key={e.d} className="dmentry"><span>{e.e} {e.d}</span><span className="dma">{e.a}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="section alt-bg">
        <div className="wrap about-layout">
          <div className="about-text">
            <span className="tag">About VoiceLog</span>
            <h2>Tracking spending<br />should feel effortless.</h2>
            <p>VoiceLog was built from a simple frustration: every budgeting app requires too much effort. Opening an app, navigating menus, typing numbers — by the time you're done, you've forgotten half your transactions.</p>
            <p>We believe the fastest interface is your voice. VoiceLog removes every barrier between a transaction happening and it being recorded.</p>
          </div>
          <div className="about-cards">
            {[
              { t: 'Open source', b: 'Built on Web Speech API, Next.js, and Google Sheets. No black boxes.' },
              { t: 'Privacy first', b: 'Zero data on our servers. Your transactions belong to you.' },
              { t: 'Made in Nigeria', b: 'Designed for the way Nigerians talk about money — Naira, local phrases, everyday spending.' },
            ].map(c => (
              <div key={c.t} className="acard">
                <strong>{c.t}</strong>
                <p>{c.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-sec">
        <div className="wrap cta-in">
          <h2>Ready to stop forgetting what you spent?</h2>
          <p>Open in Chrome, tap mic, speak. That's it.</p>
          <button className="btn-teal btn-lg" onClick={() => router.push('/app')}>Start tracking free →</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="wrap footer-in">
          <div className="fbrand">
            <div className="brand"><span className="teal-dot" />VoiceLog</div>
            <p>Voice-powered spending tracker for Nigeria.</p>
          </div>
          <div className="flinks">
            <button onClick={() => go('how')}>How it works</button>
            <button onClick={() => go('features')}>Features</button>
            <button onClick={() => go('about')}>About</button>
            <button onClick={() => setShowModal(true)}>Sign in</button>
          </div>
        </div>
        <div className="wrap fcopy">© 2026 VoiceLog · Free & open source · Web Speech API + Google Sheets</div>
      </footer>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --teal: #0d9488; --teal-light: #14b8a6; --teal-xlight: #5eead4;
          --teal-bg: #f0fdfa; --teal-bg2: #ccfbf1;
          --deep: #134e4a; --text: #1c4a47; --muted: #5a8a85;
          --white: #ffffff; --border: #b2dfdb;
          --font: 'Plus Jakarta Sans', sans-serif; --mono: 'JetBrains Mono', monospace;
          --max: 1100px;
        }
        html { scroll-behavior: smooth; }
        body { font-family: var(--font); background: var(--white); color: var(--text); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
        button { font-family: var(--font); cursor: pointer; border: none; background: none; color: inherit; }
        input { font-family: var(--font); }
        ::selection { background: var(--teal-xlight); color: var(--deep); }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
      `}</style>

      <style jsx>{`
        /* ── Mesh background ── */
        .mesh-bg { position: fixed; inset: 0; z-index: -1; overflow: hidden; background: linear-gradient(135deg, #f0fdfa 0%, #e6faf7 40%, #f7fffe 100%); }
        .blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.55; }
        .b1 { width: 600px; height: 600px; background: radial-gradient(circle, #5eead4 0%, transparent 70%); top: -120px; left: -100px; animation: drift1 14s ease-in-out infinite; }
        .b2 { width: 500px; height: 500px; background: radial-gradient(circle, #99f6e4 0%, transparent 70%); top: 30%; right: -80px; animation: drift2 18s ease-in-out infinite; }
        .b3 { width: 400px; height: 400px; background: radial-gradient(circle, #a7f3d0 0%, transparent 70%); bottom: 20%; left: 20%; animation: drift3 20s ease-in-out infinite; }
        .b4 { width: 350px; height: 350px; background: radial-gradient(circle, #ccfbf1 0%, transparent 70%); bottom: -60px; right: 30%; animation: drift1 16s ease-in-out infinite reverse; }
        @keyframes drift1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.08)} 66%{transform:translate(-20px,40px) scale(0.95)} }
        @keyframes drift2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,30px) scale(1.05)} 66%{transform:translate(30px,-40px) scale(0.97)} }
        @keyframes drift3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(35px,-25px) scale(1.06)} }

        /* ── Nav ── */
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 24px; transition: background 0.3s, box-shadow 0.3s; }
        .nav.scrolled { background: rgba(240,253,250,0.88); backdrop-filter: blur(16px); box-shadow: 0 1px 0 var(--border); }
        .nav-in { max-width: var(--max); margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 60px; }
        .brand { display: flex; align-items: center; gap: 7px; font-size: 1rem; font-weight: 800; color: var(--deep); cursor: pointer; letter-spacing: -0.02em; }
        .teal-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); display: inline-block; flex-shrink: 0; }
        .nlinks { display: flex; align-items: center; gap: 4px; }
        .nlinks button { font-size: 0.875rem; color: var(--muted); padding: 6px 10px; border-radius: 8px; font-weight: 500; transition: color 0.18s, background 0.18s; }
        .nlinks button:hover { color: var(--deep); background: var(--teal-bg2); }
        .nsign { border: 1px solid var(--border) !important; color: var(--teal) !important; }
        .nsign:hover { border-color: var(--teal) !important; background: var(--teal-bg) !important; }
        .ncta { background: var(--teal) !important; color: white !important; font-weight: 700 !important; padding: 8px 16px !important; border-radius: 8px !important; }
        .ncta:hover { background: var(--teal-light) !important; }
        .burger { display: none; flex-direction: column; gap: 5px; padding: 4px; }
        .burger span { display: block; width: 20px; height: 2px; background: var(--deep); border-radius: 2px; }
        @media (max-width: 700px) {
          .burger { display: flex; }
          .nlinks { display: none; flex-direction: column; position: absolute; top: 60px; left: 0; right: 0; background: rgba(240,253,250,0.97); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); padding: 12px 16px; gap: 2px; }
          .nlinks.open { display: flex; }
          .nlinks button { width: 100%; text-align: left; padding: 10px 12px; }
        }

        /* ── Shared ── */
        .wrap { max-width: var(--max); margin: 0 auto; padding: 0 24px; }
        .section { padding: 56px 0; }
        .alt-bg { background: rgba(240,253,250,0.6); }
        .sec-hdr { margin-bottom: 36px; }
        .tag { font-family: var(--mono); font-size: 0.7rem; color: var(--teal); letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-bottom: 10px; }
        .sec-hdr h2, h2 { font-size: clamp(1.7rem, 3.5vw, 2.4rem); font-weight: 800; letter-spacing: -0.04em; line-height: 1.1; color: var(--deep); }

        /* ── Buttons ── */
        .btn-teal { background: var(--teal); color: white; font-weight: 700; font-size: 0.95rem; padding: 12px 24px; border-radius: 10px; transition: background 0.18s, transform 0.15s; letter-spacing: -0.01em; }
        .btn-teal:hover { background: var(--teal-light); transform: translateY(-1px); }
        .btn-teal.btn-lg { padding: 14px 32px; font-size: 1rem; }
        .btn-ghost { color: var(--teal); font-size: 0.9rem; font-weight: 600; padding: 12px 20px; border: 1.5px solid var(--teal-xlight); border-radius: 10px; transition: border-color 0.18s, background 0.18s; }
        .btn-ghost:hover { border-color: var(--teal); background: var(--teal-bg); }

        /* ── Hero ── */
        .hero { padding: 110px 0 0; }
        .eyebrow { display: inline-block; font-family: var(--mono); font-size: 0.73rem; background: var(--teal-bg2); color: var(--teal); padding: 5px 14px; border-radius: 100px; border: 1px solid var(--teal-xlight); margin-bottom: 22px; }
        .hero h1 { font-size: clamp(2.8rem, 7vw, 5rem); font-weight: 800; line-height: 1.04; letter-spacing: -0.05em; color: var(--deep); margin-bottom: 18px; }
        .hero h1 em { font-style: normal; color: var(--teal); }
        .hero-sub { font-size: clamp(1rem, 2vw, 1.15rem); color: var(--muted); line-height: 1.65; max-width: 500px; margin-bottom: 28px; font-weight: 400; }
        .hero-btns { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
        .hero-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .chip { font-family: var(--mono); font-size: 0.7rem; color: var(--muted); background: white; border: 1px solid var(--border); padding: 4px 12px; border-radius: 100px; }

        /* ── Waveform ── */
        .wave-row { display: flex; align-items: center; gap: 3px; justify-content: center; padding: 36px 0 0; overflow: hidden; }
        .wbar { width: 5px; border-radius: 4px; background: linear-gradient(to top, var(--teal), var(--teal-xlight)); opacity: 0.6; animation: wbounce 1.6s ease-in-out infinite; }
        @keyframes wbounce { 0%,100%{transform:scaleY(0.4);opacity:0.3} 50%{transform:scaleY(1);opacity:0.8} }

        /* ── Stats ── */
        .stats-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: var(--border); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .stat-item { background: white; padding: 20px 24px; display: flex; flex-direction: column; gap: 2px; }
        .stat-item strong { font-size: 1.8rem; font-weight: 800; color: var(--teal); letter-spacing: -0.04em; }
        .stat-item span { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
        @media (max-width: 600px) { .stats-row { grid-template-columns: repeat(2,1fr); } }

        /* ── Steps ── */
        .steps-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 2px; background: var(--border); border-radius: 14px; overflow: hidden; margin-bottom: 24px; }
        .step-card { background: white; padding: 28px 22px; }
        .step-num { font-family: var(--mono); font-size: 0.65rem; color: var(--teal-xlight); letter-spacing: 0.1em; margin-bottom: 14px; font-weight: 500; }
        .step-ico { font-size: 1.7rem; margin-bottom: 12px; display: block; }
        .step-card h3 { font-size: 1rem; font-weight: 700; color: var(--deep); margin-bottom: 8px; letter-spacing: -0.02em; }
        .step-card p { font-size: 0.875rem; color: var(--muted); line-height: 1.6; }
        @media (max-width: 700px) { .steps-grid { grid-template-columns: 1fr; } }
        .phrase-box { background: white; border: 1.5px solid var(--teal-bg2); border-radius: 12px; padding: 20px 22px; }
        .phrase-label { font-family: var(--mono); font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 12px; }
        .phrases { display: flex; flex-wrap: wrap; gap: 8px; }
        .phrase { font-family: var(--mono); font-size: 0.82rem; color: var(--deep); background: var(--teal-bg); border: 1px solid var(--teal-bg2); padding: 6px 12px; border-radius: 7px; }

        /* ── Features ── */
        .feat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 2px; background: var(--border); border-radius: 14px; overflow: hidden; }
        .feat-card { background: white; padding: 26px 22px; transition: background 0.18s; }
        .feat-card:hover { background: var(--teal-bg); }
        .feat-ico { font-size: 1.6rem; display: block; margin-bottom: 10px; }
        .feat-card h3 { font-size: 0.95rem; font-weight: 700; color: var(--deep); margin-bottom: 6px; letter-spacing: -0.02em; }
        .feat-card p { font-size: 0.85rem; color: var(--muted); line-height: 1.6; }
        @media (max-width: 800px) { .feat-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 480px) { .feat-grid { grid-template-columns: 1fr; } }

        /* ── Dashboard ── */
        .dash-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        .dash-text h2 { margin-bottom: 14px; }
        .dash-text p { font-size: 0.95rem; color: var(--muted); line-height: 1.7; margin-bottom: 24px; }
        .dash-mock { display: flex; flex-direction: column; gap: 10px; }
        .dmcard { background: white; border: 1.5px solid var(--border); border-radius: 14px; padding: 20px; box-shadow: 0 2px 16px rgba(13,148,136,0.07); }
        .dmcard.dmsmall { padding: 16px 20px; }
        .dmlabel { font-family: var(--mono); font-size: 0.63rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
        .dmval { font-size: 1.7rem; font-weight: 800; color: var(--teal); letter-spacing: -0.04em; margin-bottom: 14px; }
        .dmval.sm { font-size: 1.3rem; margin-bottom: 10px; }
        .dmrow { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; font-size: 0.72rem; color: var(--muted); }
        .dmtrack { flex: 1; height: 5px; background: var(--teal-bg2); border-radius: 3px; overflow: hidden; }
        .dmfill { height: 100%; border-radius: 3px; }
        .dmentry { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 0.77rem; padding: 5px 0; border-bottom: 1px solid var(--teal-bg2); color: var(--muted); }
        .dmentry:last-child { border: none; }
        .dma { color: var(--teal); font-weight: 500; }
        @media (max-width: 800px) { .dash-layout { grid-template-columns: 1fr; gap: 32px; } }

        /* ── About ── */
        .about-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: start; }
        .about-text h2 { margin-bottom: 14px; }
        .about-text p { font-size: 0.92rem; color: var(--muted); line-height: 1.72; margin-bottom: 12px; }
        .about-cards { display: flex; flex-direction: column; gap: 10px; padding-top: 44px; }
        .acard { background: white; border: 1.5px solid var(--border); border-radius: 12px; padding: 18px 20px; }
        .acard strong { display: block; font-size: 0.9rem; font-weight: 700; color: var(--deep); margin-bottom: 6px; }
        .acard p { font-size: 0.84rem; color: var(--muted); line-height: 1.6; }
        @media (max-width: 800px) { .about-layout { grid-template-columns: 1fr; } .about-cards { padding-top: 0; } }

        /* ── CTA ── */
        .cta-sec { background: linear-gradient(135deg, var(--teal) 0%, var(--teal-light) 100%); padding: 56px 0; }
        .cta-in { text-align: center; }
        .cta-in h2 { color: white; margin-bottom: 10px; font-size: clamp(1.6rem, 3.5vw, 2.2rem); }
        .cta-in p { color: rgba(255,255,255,0.8); font-size: 1rem; margin-bottom: 28px; }
        .cta-sec .btn-teal { background: white; color: var(--teal); }
        .cta-sec .btn-teal:hover { background: var(--teal-bg); }

        /* ── Footer ── */
        .footer { padding: 36px 0 20px; border-top: 1px solid var(--border); background: white; }
        .footer-in { display: flex; justify-content: space-between; align-items: flex-start; gap: 32px; flex-wrap: wrap; margin-bottom: 24px; }
        .fbrand p { font-size: 0.82rem; color: var(--muted); margin-top: 8px; }
        .flinks { display: flex; gap: 4px; flex-wrap: wrap; }
        .flinks button { font-size: 0.82rem; color: var(--muted); padding: 5px 10px; border-radius: 6px; transition: color 0.18s; font-weight: 500; }
        .flinks button:hover { color: var(--teal); }
        .fcopy { font-family: var(--mono); font-size: 0.62rem; color: var(--muted); padding-top: 16px; border-top: 1px solid var(--border); }

        /* ── Modal ── */
        .overlay { position: fixed; inset: 0; background: rgba(13,148,136,0.15); backdrop-filter: blur(6px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: white; border: 1.5px solid var(--border); border-radius: 20px; padding: 32px; width: 100%; max-width: 380px; position: relative; box-shadow: 0 20px 60px rgba(13,148,136,0.15); }
        .mclose { position: absolute; top: 14px; right: 16px; color: var(--muted); font-size: 0.9rem; transition: color 0.18s; }
        .mclose:hover { color: var(--deep); }
        .mlogo { display: flex; align-items: center; gap: 7px; font-weight: 800; font-size: 1rem; color: var(--deep); margin-bottom: 20px; }
        .mtabs { display: flex; gap: 2px; background: var(--teal-bg); border-radius: 10px; padding: 3px; margin-bottom: 20px; }
        .mtab { flex: 1; padding: 7px; border-radius: 8px; font-size: 0.875rem; color: var(--muted); font-weight: 500; transition: background 0.18s, color 0.18s; }
        .mtab.on { background: white; color: var(--deep); font-weight: 700; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .mform { display: flex; flex-direction: column; gap: 12px; }
        .mfield { display: flex; flex-direction: column; gap: 4px; }
        .mfield label { font-family: var(--mono); font-size: 0.62rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .mfield input { background: var(--teal-bg); border: 1.5px solid var(--border); border-radius: 9px; color: var(--deep); padding: 9px 12px; font-size: 0.88rem; outline: none; transition: border-color 0.18s; }
        .mfield input:focus { border-color: var(--teal); background: white; }
        .msubmit { background: var(--teal); color: white; font-weight: 700; padding: 11px; border-radius: 9px; font-size: 0.9rem; margin-top: 4px; transition: background 0.18s; }
        .msubmit:hover { background: var(--teal-light); }
        .mdiv { display: flex; align-items: center; gap: 10px; margin: 16px 0; }
        .mdiv::before, .mdiv::after { content: ''; flex: 1; height: 1px; background: var(--border); }
        .mdiv span { font-family: var(--mono); font-size: 0.65rem; color: var(--muted); }
        .gbtn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; border: 1.5px solid var(--border); border-radius: 9px; padding: 10px; font-size: 0.875rem; font-weight: 500; transition: border-color 0.18s, background 0.18s; }
        .gbtn:hover { background: var(--teal-bg); border-color: var(--teal-xlight); }
        .msuccess { text-align: center; padding: 16px 0; }
        .mcheck { width: 50px; height: 50px; border-radius: 50%; background: var(--teal-bg); border: 2px solid var(--teal); color: var(--teal); font-size: 1.3rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
        .msuccess h3 { font-size: 1.1rem; font-weight: 700; color: var(--deep); margin-bottom: 6px; }
        .msuccess p { font-family: var(--mono); font-size: 0.75rem; color: var(--muted); }
      `}</style>
    </>
  );
}
