import { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';

// ─── Data ────────────────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  Transport:'#f59e0b',Food:'#10b981',Utilities:'#3b82f6',Health:'#ef4444',
  Entertainment:'#8b5cf6',Shopping:'#ec4899',Education:'#06b6d4',
  Housing:'#f97316',Savings:'#84cc16',Other:'#6b7280',
};
const CATEGORY_ICONS = {
  Transport:'🚗',Food:'🍽️',Utilities:'💡',Health:'💊',
  Entertainment:'🎬',Shopping:'🛍️',Education:'📚',
  Housing:'🏠',Savings:'💰',Other:'📝',
};
const STEPS = [
  { n:'01', icon:'🎙️', title:'Speak naturally', body:'Say what you spent in plain language — "I bought fuel for ₦20,000" or "Paid 5k for groceries yesterday". No forms, no typing.' },
  { n:'02', icon:'⚡', title:'Auto-extracted', body:'VoiceLog parses the date, amount, category and description instantly. Review and correct any field before saving.' },
  { n:'03', icon:'📊', title:'Synced to your dashboard', body:'Every entry lands in your Google Sheet in real time, feeding your Power BI dashboard with up-to-date spending data.' },
];
const FEATURES = [
  { icon:'🇳🇬', title:'Built for Nigeria', body:'Understands Nigerian English, Naira amounts, local merchants and slang out of the box.' },
  { icon:'🔒', title:'Your data, your sheet', body:'Nothing is stored on our servers. Every transaction goes directly into your own Google Sheet.' },
  { icon:'📱', title:'Works on any device', body:'Open in Chrome on your phone or desktop — no app install needed.' },
  { icon:'📈', title:'Power BI ready', body:'Connect your Sheet to Power BI for live spending dashboards and monthly reports.' },
  { icon:'⚡', title:'100% free to run', body:'Speech recognition runs in the browser. No AI API fees, no subscriptions, no hidden costs.' },
  { icon:'✏️', title:'Always editable', body:'Every field — date, amount, category — is editable before you save. You stay in control.' },
];

function formatAmount(amount, currency) {
  if (amount===null||amount===undefined||amount==='') return '—';
  const sym=currency==='NGN'?'₦':currency==='USD'?'$':currency==='GBP'?'£':(currency+' ');
  return sym+Number(amount).toLocaleString();
}
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try { return new Date(dateStr+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }
  catch { return dateStr; }
}

// ─── Waveform ticker (hero decoration) ───────────────────────────────────────
function WaveformTicker() {
  const bars = Array.from({length:60},(_,i)=>({
    h: 12 + Math.abs(Math.sin(i*0.45+1)*38) + Math.abs(Math.cos(i*0.3)*22),
    delay: i*0.04,
  }));
  return (
    <div className="ticker-wrap">
      <div className="ticker">
        {[...bars,...bars].map((b,i)=>(
          <div key={i} className="ticker-bar"
            style={{height:`${b.h}px`,animationDelay:`${b.delay}s`}}/>
        ))}
      </div>
    </div>
  );
}

// ─── App section ─────────────────────────────────────────────────────────────
function AppSection() {
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [editingParsed, setEditingParsed] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [sheetStatus, setSheetStatus] = useState(null);
  const recognitionRef = useRef(null);
  const finalRef = useRef('');

  const isSupported = typeof window!=='undefined'&&('SpeechRecognition' in window||'webkitSpeechRecognition' in window);

  const startListening = () => {
    if (!isSupported) { setStatus('unsupported'); return; }
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
    const r = new SR();
    r.lang='en-NG'; r.interimResults=true; r.maxAlternatives=1; r.continuous=false;
    finalRef.current='';
    setTranscript(''); setInterimText(''); setError('');
    setParsed(null); setEditingParsed(null); setSheetStatus(null);
    r.onstart=()=>setStatus('listening');
    r.onresult=(e)=>{
      let interim='',final='';
      for(let i=e.resultIndex;i<e.results.length;i++){
        const t=e.results[i][0].transcript;
        if(e.results[i].isFinal) final+=t; else interim+=t;
      }
      if(final) finalRef.current+=final;
      setInterimText(interim);
      if(finalRef.current) setTranscript(finalRef.current);
    };
    r.onerror=(e)=>{
      if(e.error==='no-speech') setError('No speech detected. Try again.');
      else if(e.error==='not-allowed') setError('Microphone denied. Allow it in browser settings.');
      else setError('Speech error: '+e.error);
      setStatus('error');
    };
    r.onend=()=>{
      setInterimText('');
      const text=finalRef.current.trim();
      if(text){setTranscript(text);parseTransaction(text);}
      else if(status!=='error'){setError('Nothing captured. Please try again.');setStatus('error');}
    };
    recognitionRef.current=r;
    r.start();
  };

  const stopListening=()=>recognitionRef.current?.stop();

  const parseTransaction=async(text)=>{
    setStatus('parsing');
    try {
      const res=await fetch('/api/parse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({transcript:text})});
      const data=await res.json();
      if(!res.ok){setError(data.error||'Parsing failed.');setStatus('error');return;}
      const p=data.parsed;
      setParsed(p);setEditingParsed(p?{...p}:null);setStatus('done');
      if(text) setHistory(prev=>[{id:Date.now(),transcript:text,parsed:p,time:new Date().toLocaleTimeString(),sheetStatus:null},...prev]);
    } catch{setError('Network error. Please try again.');setStatus('error');}
  };

  const saveToSheet=async(data,tx)=>{
    setSheetStatus('saving');
    try {
      const res=await fetch('/api/save-transaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,transcript:tx})});
      const result=await res.json();
      if(!res.ok){setSheetStatus('error');setError(result.error||'Failed to save.');}
      else{setSheetStatus('saved');setHistory(prev=>prev.map((h,i)=>i===0?{...h,sheetStatus:'saved'}:h));}
    } catch{setSheetStatus('error');setError('Failed to save to Google Sheets.');}
  };

  const reset=()=>{
    recognitionRef.current?.abort();
    setStatus('idle');setTranscript('');setInterimText('');
    setParsed(null);setEditingParsed(null);setError('');setSheetStatus(null);
  };

  useEffect(()=>()=>recognitionRef.current?.abort(),[]);

  const isListening=status==='listening';
  const isParsing=status==='parsing';
  const isDone=status==='done';
  const isError=status==='error';
  const totalSpend=history.filter(h=>h.parsed?.amount).reduce((s,h)=>s+Number(h.parsed.amount),0);
  const displayText=transcript||interimText;

  return (
    <div className="app-shell">
      <div className="app-topbar">
        <span className="app-title"><span className="app-dot"/>VoiceLog App</span>
        {history.length>0&&<span className="app-total">Session: ₦{totalSpend.toLocaleString()}</span>}
      </div>

      <div className="app-card mic-card">
        <div className={`bubble ${displayText?'has-text':''} ${interimText&&!transcript?'interim':''}`}>
          {displayText
            ?<span>{displayText}</span>
            :<span className="ph">{isListening?'Listening…':isParsing?'Processing…':'Your words appear here as you speak'}</span>}
        </div>
        <div className="status-row">
          {status==='idle'&&<span>Tap the mic and speak your transaction</span>}
          {isListening&&<><span className="rdot"/><span>Speak now — tap mic to finish</span></>}
          {isParsing&&<><span className="spinn"/><span>Extracting transaction details…</span></>}
          {isDone&&<span className="ok">✓ Review and save below</span>}
          {(isError||status==='unsupported')&&<span className="err">⚠ {error||'Use Chrome or Edge for speech recognition'}</span>}
        </div>
        <button
          className={`mic-btn ${isListening?'mic-active':''} ${isParsing?'mic-loading':''}`}
          onClick={isListening?stopListening:isParsing?undefined:(isDone||isError)?reset:startListening}
          disabled={isParsing}
        >
          {isParsing?(
            <svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50" strokeDashoffset="15" className="spin-c"/></svg>
          ):isListening?(
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
          ):(isDone||isError)?(
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13a6 6 0 1 1-1.4-3.9"/><polyline points="18 6 18 12 12 12"/></svg>
          ):(
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" stroke="none"/>
              <path d="M3 11c0 5 3.58 8 9 8s9-3 9-8"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </button>
        {isListening&&<div className="rings"><span/><span/><span/></div>}
      </div>

      {isDone&&transcript&&(
        <div className="app-card review-card">
          <div className="review-hdr">
            <span className="rlabel">Review Transaction</span>
            {sheetStatus==='saved'&&<span className="rpill rgreen">✓ Saved</span>}
            {sheetStatus==='saving'&&<span className="rpill rgray">Saving…</span>}
            {sheetStatus==='error'&&<span className="rpill rred">Failed</span>}
          </div>
          {editingParsed?(
            <>
              <div className="fields-grid">
                <div className="fld"><label>Date</label>
                  <input type="date" value={editingParsed.date||''} onChange={e=>setEditingParsed({...editingParsed,date:e.target.value})}/>
                </div>
                <div className="fld"><label>Amount ({editingParsed.currency||'NGN'})</label>
                  <input type="number" value={editingParsed.amount??''} placeholder="e.g. 20000"
                    onChange={e=>setEditingParsed({...editingParsed,amount:e.target.value?Number(e.target.value):null})}/>
                </div>
                <div className="fld"><label>Description</label>
                  <input type="text" value={editingParsed.description||''} onChange={e=>setEditingParsed({...editingParsed,description:e.target.value})}/>
                </div>
                <div className="fld"><label>Category</label>
                  <select value={editingParsed.category||'Other'} onChange={e=>setEditingParsed({...editingParsed,category:e.target.value})}>
                    {Object.keys(CATEGORY_ICONS).map(c=><option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
                  </select>
                </div>
              </div>
              <button className="save-btn" onClick={()=>saveToSheet(editingParsed,transcript)}
                disabled={sheetStatus==='saving'||sheetStatus==='saved'}>
                {sheetStatus==='saved'?'✓ Saved to Google Sheets':sheetStatus==='saving'?'Saving…':'↗ Save to Google Sheets'}
              </button>
            </>
          ):(
            <p className="no-parse">Could not detect a transaction. Try: <em>"I bought fuel for ₦20,000"</em></p>
          )}
        </div>
      )}

      {history.length>0&&(
        <div className="app-card hist-card">
          <div className="hist-hdr">
            <span>{history.length} {history.length===1?'entry':'entries'} this session</span>
            <button onClick={()=>setHistory([])}>Clear all</button>
          </div>
          {history.map(item=>(
            <div key={item.id} className="hitem">
              <div className="hicon" style={{background:CATEGORY_COLORS[item.parsed?.category]||'#6b7280'}}>
                {CATEGORY_ICONS[item.parsed?.category]||'📝'}
              </div>
              <div className="hbody">
                <div className="htop">
                  <span className="hdesc">{item.parsed?.description||item.transcript.slice(0,36)}</span>
                  <span className="hamt">{formatAmount(item.parsed?.amount,item.parsed?.currency)}</span>
                </div>
                <div className="hmeta">
                  {formatDate(item.parsed?.date)} · {item.parsed?.category||'Other'}
                  {item.sheetStatus==='saved'&&<span className="stag"> · ✓ Sheet</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sign-in modal ────────────────────────────────────────────────────────────
function SignInModal({ onClose }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e) => { e.preventDefault(); setDone(true); };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-logo"><span className="mdot"/>VoiceLog</div>
        {done?(
          <div className="modal-success">
            <div className="success-icon">✓</div>
            <h3>{mode==='signin'?'Welcome back!':'Account created!'}</h3>
            <p>Redirecting you to your dashboard…</p>
          </div>
        ):(
          <>
            <div className="modal-tabs">
              <button className={mode==='signin'?'mtab active':'mtab'} onClick={()=>setMode('signin')}>Sign in</button>
              <button className={mode==='signup'?'mtab active':'mtab'} onClick={()=>setMode('signup')}>Sign up</button>
            </div>
            <form className="modal-form" onSubmit={submit}>
              {mode==='signup'&&(
                <div className="minput-wrap">
                  <label>Full name</label>
                  <input type="text" placeholder="Seun Nifemi" required/>
                </div>
              )}
              <div className="minput-wrap">
                <label>Email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/>
              </div>
              <div className="minput-wrap">
                <label>Password</label>
                <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" required/>
              </div>
              <button type="submit" className="modal-submit">
                {mode==='signin'?'Sign in →':'Create account →'}
              </button>
              {mode==='signin'&&<button type="button" className="modal-forgot">Forgot password?</button>}
            </form>
            <div className="modal-divider"><span>or continue with</span></div>
            <button className="google-btn">
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [showSignIn, setShowSignIn] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const appRef = useRef(null);

  useEffect(()=>{
    const handler=()=>setScrolled(window.scrollY>40);
    window.addEventListener('scroll',handler);
    return ()=>window.removeEventListener('scroll',handler);
  },[]);

  const scrollTo=(id)=>{
    document.getElementById(id)?.scrollIntoView({behavior:'smooth'});
    setNavOpen(false);
  };

  const goToApp=()=>{
    appRef.current?.scrollIntoView({behavior:'smooth'});
  };

  return (
    <>
      <Head>
        <title>VoiceLog — Voice-Powered Spending Tracker</title>
        <meta name="description" content="Log your spending by voice. Syncs to Google Sheets and Power BI instantly."/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true"/>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>
      </Head>

      {showSignIn&&<SignInModal onClose={()=>setShowSignIn(false)}/>}

      {/* ── Nav ── */}
      <nav className={`nav ${scrolled?'nav-scrolled':''}`}>
        <div className="nav-inner">
          <div className="nav-logo" onClick={()=>scrollTo('hero')}>
            <span className="ndot"/><span>VoiceLog</span>
          </div>
          <div className={`nav-links ${navOpen?'open':''}`}>
            <button onClick={()=>scrollTo('how')}>How it works</button>
            <button onClick={()=>scrollTo('features')}>Features</button>
            <button onClick={()=>scrollTo('about')}>About</button>
            <button className="nav-signin" onClick={()=>{setShowSignIn(true);setNavOpen(false);}}>Sign in</button>
            <button className="nav-cta" onClick={goToApp}>Start free →</button>
          </div>
          <button className="hamburger" onClick={()=>setNavOpen(v=>!v)}>
            <span/><span/><span/>
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="hero" className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">
            <span className="ebadge">🇳🇬 Built for Nigeria</span>
            <span className="esep">·</span>
            <span className="efree">100% Free to use</span>
          </div>
          <h1 className="hero-title">
            Your voice is<br/>
            <span className="hero-accent">your budget tracker.</span>
          </h1>
          <p className="hero-sub">
            Say what you spent. VoiceLog extracts the details and logs it straight to your Google Sheet — no forms, no typing, no friction.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={goToApp}>Start tracking free →</button>
            <button className="btn-ghost" onClick={()=>scrollTo('how')}>See how it works</button>
          </div>
          <div className="hero-social">
            <span>Works in Chrome & Edge</span>
            <span className="sep">·</span>
            <span>Google Sheets sync</span>
            <span className="sep">·</span>
            <span>Power BI ready</span>
          </div>
        </div>
        <WaveformTicker/>
      </section>

      {/* ── Stats strip ── */}
      <div className="stats-strip">
        {[
          {v:'0s',l:'Setup time'},
          {v:'₦0',l:'Monthly cost'},
          {v:'10+',l:'Categories'},
          {v:'Live',l:'Sheet sync'},
        ].map(s=>(
          <div key={s.l} className="stat">
            <span className="stat-v">{s.v}</span>
            <span className="stat-l">{s.l}</span>
          </div>
        ))}
      </div>

      {/* ── How it works ── */}
      <section id="how" className="section how-section">
        <div className="section-inner">
          <div className="section-hdr">
            <span className="section-tag">How it works</span>
            <h2 className="section-title">Three steps.<br/>Zero friction.</h2>
          </div>
          <div className="steps">
            {STEPS.map(s=>(
              <div key={s.n} className="step">
                <div className="step-num">{s.n}</div>
                <div className="step-icon">{s.icon}</div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-body">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="demo-box">
            <span className="demo-label">Try saying</span>
            <div className="demo-phrases">
              {['"I bought fuel for ₦20,000"','"Paid 5k for groceries yesterday"','"Electricity bill 15,000 last Friday"','"Uber ride 3,500 naira"'].map(p=>(
                <span key={p} className="demo-phrase">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="section feat-section">
        <div className="section-inner">
          <div className="section-hdr">
            <span className="section-tag">Features</span>
            <h2 className="section-title">Everything you need.<br/>Nothing you don't.</h2>
          </div>
          <div className="features-grid">
            {FEATURES.map(f=>(
              <div key={f.title} className="feat-card">
                <span className="feat-icon">{f.icon}</span>
                <h3 className="feat-title">{f.title}</h3>
                <p className="feat-body">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard preview ── */}
      <section className="section dash-section">
        <div className="section-inner">
          <div className="dash-content">
            <div className="dash-text">
              <span className="section-tag">Power BI Integration</span>
              <h2 className="section-title">Your spending,<br/>visualised live.</h2>
              <p className="dash-body">Every voice entry feeds your Google Sheet in real time. Connect once to Power BI and get live charts, category breakdowns, and monthly trends — automatically.</p>
              <button className="btn-primary" onClick={goToApp}>Start logging →</button>
            </div>
            <div className="dash-mock">
              <div className="dash-card">
                <div className="dc-label">Total this month</div>
                <div className="dc-value">₦847,500</div>
                <div className="dc-bar-wrap">
                  {[{c:'Transport',w:62,col:'#f59e0b'},{c:'Food',w:48,col:'#10b981'},{c:'Utilities',w:35,col:'#3b82f6'},{c:'Health',w:20,col:'#ef4444'},{c:'Other',w:15,col:'#6b7280'}].map(b=>(
                    <div key={b.c} className="dc-bar-row">
                      <span className="dc-bar-lbl">{b.c}</span>
                      <div className="dc-bar-track"><div className="dc-bar-fill" style={{width:`${b.w}%`,background:b.col}}/></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dash-card dash-card-sm">
                <div className="dc-label">Today</div>
                <div className="dc-value sm">₦12,400</div>
                <div className="dc-entries">
                  {[{icon:'🚗',d:'Fuel',a:'₦8,000'},{icon:'🍽️',d:'Lunch',a:'₦2,400'},{icon:'💡',d:'Airtime',a:'₦2,000'}].map(e=>(
                    <div key={e.d} className="dc-entry">
                      <span>{e.icon} {e.d}</span><span className="dc-ea">{e.a}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="section about-section">
        <div className="section-inner">
          <div className="about-grid">
            <div className="about-text">
              <span className="section-tag">About VoiceLog</span>
              <h2 className="section-title">Tracking spending<br/>should feel effortless.</h2>
              <p className="about-body">VoiceLog was built out of a simple frustration: every budgeting app requires too much manual effort. Opening an app, navigating menus, typing in numbers — by the time you're done, you've forgotten half your transactions.</p>
              <p className="about-body">We believe the fastest interface is your voice. VoiceLog removes every barrier between a transaction happening and it being recorded — so your data stays accurate, and your habits stay visible.</p>
              <p className="about-body">Built with open web standards, it runs entirely in your browser. Your data goes directly to your own Google Sheet — we never see it.</p>
            </div>
            <div className="about-aside">
              <div className="about-card">
                <div className="about-tag">Open source</div>
                <p>Built on Web Speech API, Next.js, and Google Sheets. No proprietary black boxes.</p>
              </div>
              <div className="about-card">
                <div className="about-tag">Privacy first</div>
                <p>Zero data retention on our servers. Your transactions belong to you.</p>
              </div>
              <div className="about-card">
                <div className="about-tag">Made in Nigeria</div>
                <p>Designed for the way Nigerians talk about money — including Naira, local merchants, and everyday phrases.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="cta-banner">
        <div className="section-inner">
          <div className="cta-inner">
            <h2 className="cta-title">Ready to stop forgetting<br/>what you spent?</h2>
            <p className="cta-sub">Open in Chrome, tap mic, speak. That's it.</p>
            <button className="btn-primary btn-lg" onClick={goToApp}>Start tracking free →</button>
          </div>
        </div>
      </section>

      {/* ── App ── */}
      <section ref={appRef} id="app" className="section app-section">
        <div className="section-inner">
          <div className="section-hdr">
            <span className="section-tag">The App</span>
            <h2 className="section-title">Start logging<br/>right now.</h2>
            <p className="app-note">Works in Chrome and Edge. Allow microphone access when prompted.</p>
          </div>
          <AppSection/>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="section-inner">
          <div className="footer-inner">
            <div className="footer-brand">
              <div className="nav-logo"><span className="ndot"/><span>VoiceLog</span></div>
              <p>Voice-powered spending tracker for Nigeria.</p>
            </div>
            <div className="footer-links">
              <button onClick={()=>scrollTo('how')}>How it works</button>
              <button onClick={()=>scrollTo('features')}>Features</button>
              <button onClick={()=>scrollTo('about')}>About</button>
              <button onClick={()=>setShowSignIn(true)}>Sign in</button>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 VoiceLog · Free & open source · Built with Web Speech API + Google Sheets</span>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0c0c0e;
          --surface: #141417;
          --surface2: #1c1c21;
          --border: #26262e;
          --text: #f0ece3;
          --muted: #6a6775;
          --muted2: #3a3845;
          --accent: #c8f135;
          --accent-dim: #a8d020;
          --red: #ff4d4d;
          --green: #3dffa0;
          --font: 'Space Grotesk', sans-serif;
          --mono: 'JetBrains Mono', monospace;
          --max: 1120px;
          --radius: 16px;
        }
        html { scroll-behavior: smooth; }
        html, body { min-height: 100%; background: var(--bg); color: var(--text); }
        body { font-family: var(--font); -webkit-font-smoothing: antialiased; }
        button { font-family: var(--font); cursor: pointer; border: none; background: none; color: inherit; }
        input, select { font-family: var(--mono); }
        ::selection { background: var(--accent); color: #000; }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; } }
      `}</style>

      <style jsx>{`
        /* ── Nav ── */
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 24px; transition: background 0.3s, border-color 0.3s; border-bottom: 1px solid transparent; }
        .nav-scrolled { background: rgba(12,12,14,0.92); backdrop-filter: blur(12px); border-bottom-color: var(--border); }
        .nav-inner { max-width: var(--max); margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 64px; }
        .nav-logo { display: flex; align-items: center; gap: 8px; font-size: 1rem; font-weight: 700; letter-spacing: -0.02em; cursor: pointer; }
        .ndot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); display: inline-block; flex-shrink: 0; }
        .nav-links { display: flex; align-items: center; gap: 8px; }
        .nav-links button { font-size: 0.875rem; color: var(--muted); padding: 6px 12px; border-radius: 8px; transition: color 0.2s; }
        .nav-links button:hover { color: var(--text); }
        .nav-signin { border: 1px solid var(--border) !important; color: var(--text) !important; }
        .nav-signin:hover { border-color: var(--muted) !important; }
        .nav-cta { background: var(--accent) !important; color: #000 !important; font-weight: 600 !important; padding: 8px 16px !important; border-radius: 8px !important; }
        .nav-cta:hover { opacity: 0.88; }
        .hamburger { display: none; flex-direction: column; gap: 5px; padding: 4px; }
        .hamburger span { display: block; width: 22px; height: 2px; background: var(--text); border-radius: 2px; }
        @media (max-width: 700px) {
          .hamburger { display: flex; }
          .nav-links { display: none; position: absolute; top: 64px; left: 0; right: 0; background: var(--surface); border-bottom: 1px solid var(--border); flex-direction: column; padding: 16px; gap: 4px; }
          .nav-links.open { display: flex; }
          .nav-links button { width: 100%; text-align: left; padding: 10px 12px; }
        }

        /* ── Buttons ── */
        .btn-primary { background: var(--accent); color: #000; font-weight: 700; font-size: 0.95rem; padding: 12px 24px; border-radius: 10px; transition: opacity 0.2s, transform 0.15s; letter-spacing: -0.01em; }
        .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn-primary.btn-lg { padding: 16px 32px; font-size: 1.05rem; border-radius: 12px; }
        .btn-ghost { color: var(--muted); font-size: 0.9rem; padding: 12px 20px; border: 1px solid var(--border); border-radius: 10px; transition: color 0.2s, border-color 0.2s; }
        .btn-ghost:hover { color: var(--text); border-color: var(--muted); }

        /* ── Hero ── */
        .hero { padding: 140px 24px 0; }
        .hero-inner { max-width: var(--max); margin: 0 auto; padding-bottom: 80px; }
        .hero-eyebrow { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
        .ebadge { font-family: var(--mono); font-size: 0.75rem; background: rgba(200,241,53,0.1); color: var(--accent); padding: 5px 12px; border-radius: 100px; border: 1px solid rgba(200,241,53,0.2); }
        .esep { color: var(--muted2); }
        .efree { font-family: var(--mono); font-size: 0.75rem; color: var(--muted); }
        .hero-title { font-size: clamp(2.8rem, 7vw, 5.2rem); font-weight: 700; line-height: 1.04; letter-spacing: -0.04em; margin-bottom: 24px; }
        .hero-accent { color: var(--accent); }
        .hero-sub { font-size: clamp(1rem, 2vw, 1.2rem); color: var(--muted); line-height: 1.65; max-width: 520px; margin-bottom: 36px; font-weight: 300; }
        .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 32px; }
        .hero-social { display: flex; align-items: center; gap: 10px; font-family: var(--mono); font-size: 0.72rem; color: var(--muted); flex-wrap: wrap; }
        .sep { color: var(--muted2); }

        /* ── Waveform ticker ── */
        .ticker-wrap { overflow: hidden; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--surface); }
        .ticker { display: flex; align-items: center; gap: 3px; padding: 16px 0; width: max-content; animation: ticker-scroll 8s linear infinite; }
        .ticker-bar { width: 4px; border-radius: 4px; background: var(--accent); opacity: 0.5; animation: bar-pulse 2s ease-in-out infinite; flex-shrink: 0; }
        @keyframes ticker-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes bar-pulse { 0%,100%{opacity:0.25;transform:scaleY(0.7)} 50%{opacity:0.7;transform:scaleY(1)} }

        /* ── Stats strip ── */
        .stats-strip { max-width: var(--max); margin: 0 auto; padding: 40px 24px; display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
        .stat { background: var(--surface); padding: 28px 24px; display: flex; flex-direction: column; gap: 4px; }
        .stat-v { font-size: 2rem; font-weight: 700; letter-spacing: -0.04em; color: var(--accent); }
        .stat-l { font-family: var(--mono); font-size: 0.72rem; color: var(--muted); letter-spacing: 0.04em; text-transform: uppercase; }
        @media (max-width: 600px) { .stats-strip { grid-template-columns: repeat(2,1fr); } }

        /* ── Sections ── */
        .section { padding: 100px 24px; }
        .section-inner { max-width: var(--max); margin: 0 auto; }
        .section-hdr { margin-bottom: 56px; }
        .section-tag { font-family: var(--mono); font-size: 0.72rem; color: var(--accent); letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-bottom: 14px; }
        .section-title { font-size: clamp(2rem, 4vw, 3rem); font-weight: 700; letter-spacing: -0.04em; line-height: 1.1; }

        /* ── How it works ── */
        .how-section { background: var(--surface); }
        .steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 2px; background: var(--border); border-radius: var(--radius); overflow: hidden; margin-bottom: 48px; }
        .step { background: var(--surface); padding: 36px 28px; }
        .step-num { font-family: var(--mono); font-size: 0.72rem; color: var(--accent); letter-spacing: 0.1em; margin-bottom: 20px; }
        .step-icon { font-size: 2rem; margin-bottom: 16px; display: block; }
        .step-title { font-size: 1.15rem; font-weight: 600; margin-bottom: 10px; letter-spacing: -0.02em; }
        .step-body { font-size: 0.9rem; color: var(--muted); line-height: 1.65; font-weight: 300; }
        @media (max-width: 700px) { .steps { grid-template-columns: 1fr; } }
        .demo-box { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); padding: 28px; }
        .demo-label { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 16px; }
        .demo-phrases { display: flex; flex-wrap: wrap; gap: 10px; }
        .demo-phrase { font-family: var(--mono); font-size: 0.84rem; color: var(--text); background: var(--surface); border: 1px solid var(--border); padding: 8px 14px; border-radius: 8px; }

        /* ── Features ── */
        .features-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 2px; background: var(--border); border-radius: var(--radius); overflow: hidden; }
        .feat-card { background: var(--bg); padding: 32px 28px; transition: background 0.2s; }
        .feat-card:hover { background: var(--surface); }
        .feat-icon { font-size: 1.8rem; display: block; margin-bottom: 14px; }
        .feat-title { font-size: 1rem; font-weight: 600; margin-bottom: 8px; letter-spacing: -0.02em; }
        .feat-body { font-size: 0.875rem; color: var(--muted); line-height: 1.65; font-weight: 300; }
        @media (max-width: 800px) { .features-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 500px) { .features-grid { grid-template-columns: 1fr; } }

        /* ── Dashboard ── */
        .dash-section { background: var(--surface); }
        .dash-content { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
        .dash-body { font-size: 0.95rem; color: var(--muted); line-height: 1.7; margin: 20px 0 32px; font-weight: 300; }
        .dash-mock { display: flex; flex-direction: column; gap: 12px; }
        .dash-card { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; }
        .dash-card-sm { padding: 20px 24px; }
        .dc-label { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .dc-value { font-size: 1.8rem; font-weight: 700; letter-spacing: -0.04em; color: var(--accent); margin-bottom: 20px; }
        .dc-value.sm { font-size: 1.4rem; margin-bottom: 14px; }
        .dc-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .dc-bar-lbl { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); width: 80px; flex-shrink: 0; }
        .dc-bar-track { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
        .dc-bar-fill { height: 100%; border-radius: 3px; }
        .dc-entry { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 0.8rem; padding: 6px 0; border-bottom: 1px solid var(--border); color: var(--muted); }
        .dc-entry:last-child { border-bottom: none; }
        .dc-ea { color: var(--text); }
        @media (max-width: 800px) { .dash-content { grid-template-columns: 1fr; } }

        /* ── About ── */
        .about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start; }
        .about-body { font-size: 0.95rem; color: var(--muted); line-height: 1.75; margin-bottom: 16px; font-weight: 300; }
        .about-aside { display: flex; flex-direction: column; gap: 12px; padding-top: 56px; }
        .about-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 22px; }
        .about-tag { font-family: var(--mono); font-size: 0.68rem; color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
        .about-card p { font-size: 0.875rem; color: var(--muted); line-height: 1.6; font-weight: 300; }
        @media (max-width: 800px) { .about-grid { grid-template-columns: 1fr; } .about-aside { padding-top: 0; } }

        /* ── CTA banner ── */
        .cta-banner { padding: 80px 24px; background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .cta-inner { text-align: center; }
        .cta-title { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 700; letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 16px; }
        .cta-sub { color: var(--muted); font-size: 1rem; margin-bottom: 36px; font-weight: 300; }

        /* ── App section ── */
        .app-section { background: var(--surface); }
        .app-note { font-family: var(--mono); font-size: 0.75rem; color: var(--muted); margin-top: 8px; }
        .app-shell { max-width: 580px; }
        .app-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .app-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.95rem; letter-spacing: -0.02em; }
        .app-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); display: inline-block; }
        .app-total { font-family: var(--mono); font-size: 0.78rem; color: var(--accent); }
        .app-card { background: var(--bg); border: 1px solid var(--border); border-radius: 18px; padding: 24px; margin-bottom: 12px; }

        /* mic card */
        .mic-card { display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 28px 22px; position: relative; }
        .bubble { width: 100%; min-height: 60px; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 13px 15px; font-family: var(--mono); font-size: 0.88rem; line-height: 1.55; display: flex; align-items: center; transition: border-color 0.2s; }
        .bubble.has-text { border-color: rgba(200,241,53,0.3); }
        .bubble.interim { opacity: 0.65; }
        .ph { color: var(--muted); font-style: italic; }
        .status-row { font-family: var(--mono); font-size: 0.72rem; color: var(--muted); display: flex; align-items: center; gap: 6px; text-align: center; }
        .ok { color: var(--green); }
        .err { color: var(--red); }
        .rdot { width: 6px; height: 6px; border-radius: 50%; background: var(--red); flex-shrink: 0; animation: blink 1s infinite; }
        .spinn { width: 12px; height: 12px; border: 2px solid var(--accent); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; flex-shrink: 0; }
        .spin-c { animation: spin 1s linear infinite; transform-origin: center; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .mic-btn { width: 66px; height: 66px; border-radius: 50%; background: var(--accent); color: #000; display: flex; align-items: center; justify-content: center; transition: transform 0.15s, box-shadow 0.2s; z-index: 1; }
        .mic-btn:hover:not(:disabled) { transform: scale(1.06); box-shadow: 0 0 0 14px rgba(200,241,53,0.07); }
        .mic-btn:active:not(:disabled) { transform: scale(0.95); }
        .mic-active { background: var(--red) !important; color: #fff !important; }
        .mic-loading { background: var(--border) !important; color: var(--muted) !important; cursor: default !important; }
        .rings { position: absolute; bottom: 28px; pointer-events: none; }
        .rings span { position: absolute; width: 66px; height: 66px; border-radius: 50%; border: 2px solid var(--red); opacity: 0; animation: ring 2s ease-out infinite; }
        .rings span:nth-child(2) { animation-delay: 0.5s; }
        .rings span:nth-child(3) { animation-delay: 1s; }
        @keyframes ring { 0%{transform:scale(1);opacity:0.5} 100%{transform:scale(2.2);opacity:0} }

        /* review */
        .review-card { padding: 22px; }
        .review-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .rlabel { font-family: var(--mono); font-size: 0.66rem; color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em; }
        .rpill { font-family: var(--mono); font-size: 0.66rem; padding: 3px 10px; border-radius: 100px; }
        .rgreen { color: var(--green); background: rgba(61,255,160,0.08); border: 1px solid rgba(61,255,160,0.18); }
        .rgray { color: var(--muted); }
        .rred { color: var(--red); }
        .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
        .fld { display: flex; flex-direction: column; gap: 4px; }
        .fld label { font-family: var(--mono); font-size: 0.6rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .fld input, .fld select { background: var(--surface2); border: 1px solid var(--border); border-radius: 9px; color: var(--text); padding: 9px 10px; font-size: 0.82rem; outline: none; transition: border-color 0.2s; -webkit-appearance: none; }
        .fld input:focus, .fld select:focus { border-color: var(--accent); }
        .fld select { cursor: pointer; }
        .save-btn { width: 100%; padding: 11px; background: var(--accent); color: #000; border-radius: 10px; font-weight: 700; font-size: 0.88rem; transition: opacity 0.2s, transform 0.15s; }
        .save-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .save-btn:disabled { opacity: 0.45; cursor: default; }
        .no-parse { font-family: var(--mono); font-size: 0.8rem; color: var(--muted); line-height: 1.5; padding: 4px 0; }
        .no-parse em { color: var(--text); }

        /* history */
        .hist-card { padding: 18px 20px; }
        .hist-hdr { display: flex; justify-content: space-between; align-items: center; font-family: var(--mono); font-size: 0.64rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
        .hist-hdr button { font-family: var(--mono); font-size: 0.64rem; color: var(--muted); transition: color 0.2s; }
        .hist-hdr button:hover { color: var(--red); }
        .hitem { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .hitem:last-child { border-bottom: none; padding-bottom: 0; }
        .hitem:first-child { padding-top: 0; }
        .hicon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0; opacity: 0.85; }
        .hbody { flex: 1; min-width: 0; }
        .htop { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; margin-bottom: 2px; }
        .hdesc { font-size: 0.84rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hamt { font-family: var(--mono); font-size: 0.84rem; color: var(--accent); flex-shrink: 0; }
        .hmeta { font-family: var(--mono); font-size: 0.62rem; color: var(--muted); }
        .stag { color: var(--green); }

        /* ── Modal ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 36px; width: 100%; max-width: 400px; position: relative; }
        .modal-close { position: absolute; top: 16px; right: 16px; color: var(--muted); font-size: 1rem; transition: color 0.2s; }
        .modal-close:hover { color: var(--text); }
        .modal-logo { display: flex; align-items: center; gap: 7px; font-weight: 700; font-size: 1rem; margin-bottom: 24px; }
        .mdot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); display: inline-block; }
        .modal-tabs { display: flex; gap: 2px; background: var(--surface2); border-radius: 10px; padding: 3px; margin-bottom: 24px; }
        .mtab { flex: 1; padding: 8px; border-radius: 8px; font-size: 0.875rem; color: var(--muted); transition: background 0.2s, color 0.2s; }
        .mtab.active { background: var(--bg); color: var(--text); font-weight: 600; }
        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .minput-wrap { display: flex; flex-direction: column; gap: 5px; }
        .minput-wrap label { font-family: var(--mono); font-size: 0.64rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .minput-wrap input { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; color: var(--text); padding: 10px 12px; font-size: 0.88rem; outline: none; transition: border-color 0.2s; font-family: var(--font); }
        .minput-wrap input:focus { border-color: var(--accent); }
        .modal-submit { background: var(--accent); color: #000; font-weight: 700; padding: 12px; border-radius: 10px; font-size: 0.9rem; transition: opacity 0.2s; margin-top: 4px; }
        .modal-submit:hover { opacity: 0.88; }
        .modal-forgot { font-family: var(--mono); font-size: 0.72rem; color: var(--muted); text-align: center; transition: color 0.2s; }
        .modal-forgot:hover { color: var(--text); }
        .modal-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
        .modal-divider::before, .modal-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
        .modal-divider span { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); white-space: nowrap; }
        .google-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; border: 1px solid var(--border); border-radius: 10px; padding: 11px; font-size: 0.875rem; transition: border-color 0.2s, background 0.2s; }
        .google-btn:hover { background: var(--surface2); border-color: var(--muted); }
        .modal-success { text-align: center; padding: 20px 0; }
        .success-icon { width: 56px; height: 56px; border-radius: 50%; background: rgba(61,255,160,0.1); border: 2px solid var(--green); color: var(--green); font-size: 1.4rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .modal-success h3 { font-size: 1.2rem; font-weight: 600; margin-bottom: 8px; }
        .modal-success p { font-family: var(--mono); font-size: 0.78rem; color: var(--muted); }

        /* ── Footer ── */
        .footer { padding: 48px 24px 32px; border-top: 1px solid var(--border); }
        .footer-inner { max-width: var(--max); margin: 0 auto; display: flex; justify-content: space-between; align-items: flex-start; gap: 40px; margin-bottom: 32px; flex-wrap: wrap; }
        .footer-brand p { font-size: 0.85rem; color: var(--muted); margin-top: 10px; max-width: 240px; font-weight: 300; }
        .footer-links { display: flex; gap: 6px; flex-wrap: wrap; }
        .footer-links button { font-size: 0.85rem; color: var(--muted); padding: 6px 10px; border-radius: 6px; transition: color 0.2s; }
        .footer-links button:hover { color: var(--text); }
        .footer-bottom { max-width: var(--max); margin: 0 auto; padding-top: 24px; border-top: 1px solid var(--border); }
        .footer-bottom span { font-family: var(--mono); font-size: 0.65rem; color: var(--muted); }
      `}</style>
    </>
  );
}
