import { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

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

function fmt(amount, currency) {
  if (amount === null || amount === undefined || amount === '') return '—';
  const s = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : (currency + ' ');
  return s + Number(amount).toLocaleString();
}
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

export default function App() {
  const router = useRouter();
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [parsed, setParsed] = useState(null);
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [sheetSt, setSheetSt] = useState(null);
  const recRef = useRef(null);
  const finalRef = useRef('');

  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const listen = () => {
    if (!supported) { setStatus('unsupported'); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = 'en-NG'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
    finalRef.current = '';
    setTranscript(''); setInterim(''); setError(''); setParsed(null); setEditing(null); setSheetSt(null);
    r.onstart = () => setStatus('listening');
    r.onresult = (e) => {
      let fin = '', intr = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t; else intr += t;
      }
      if (fin) finalRef.current += fin;
      setInterim(intr);
      if (finalRef.current) setTranscript(finalRef.current);
    };
    r.onerror = (e) => {
      setError(e.error === 'no-speech' ? 'No speech detected.' : e.error === 'not-allowed' ? 'Microphone denied.' : 'Error: ' + e.error);
      setStatus('error');
    };
    r.onend = () => {
      setInterim('');
      const t = finalRef.current.trim();
      if (t) { setTranscript(t); parse(t); }
      else if (status !== 'error') { setError('Nothing captured. Try again.'); setStatus('error'); }
    };
    recRef.current = r;
    r.start();
  };

  const stop = () => recRef.current?.stop();

  const parse = async (text) => {
    setStatus('parsing');
    try {
      const res = await fetch('/api/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: text }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Parse failed.'); setStatus('error'); return; }
      const p = data.parsed;
      setParsed(p); setEditing(p ? { ...p } : null); setStatus('done');
      if (text) setHistory(prev => [{ id: Date.now(), transcript: text, parsed: p, time: new Date().toLocaleTimeString(), sheetSt: null }, ...prev]);
    } catch { setError('Network error.'); setStatus('error'); }
  };

  const save = async (data, tx) => {
    setSheetSt('saving');
    try {
      const res = await fetch('/api/save-transaction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, transcript: tx }) });
      const result = await res.json();
      if (!res.ok) { setSheetSt('error'); setError(result.error || 'Save failed.'); }
      else { setSheetSt('saved'); setHistory(prev => prev.map((h, i) => i === 0 ? { ...h, sheetSt: 'saved' } : h)); }
    } catch { setSheetSt('error'); setError('Save failed.'); }
  };

  const reset = () => {
    recRef.current?.abort();
    setStatus('idle'); setTranscript(''); setInterim(''); setParsed(null); setEditing(null); setError(''); setSheetSt(null);
  };

  useEffect(() => () => recRef.current?.abort(), []);

  const isL = status === 'listening', isP = status === 'parsing', isDone = status === 'done', isE = status === 'error';
  const total = history.filter(h => h.parsed?.amount).reduce((s, h) => s + Number(h.parsed.amount), 0);
  const display = transcript || interim;

  return (
    <>
      <Head>
        <title>VoiceLog App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <div className="page">
        {/* Topbar */}
        <header className="topbar">
          <button className="back" onClick={() => router.push('/')}>← Back</button>
          <div className="tlogo"><span className="tdot" />VoiceLog</div>
          {history.length > 0 && <span className="ttotal">₦{total.toLocaleString()}</span>}
        </header>

        <main className="main">
          <div className="heading">
            <h1>Log a transaction</h1>
            <p>Tap the mic and speak naturally. Works in Chrome & Edge.</p>
          </div>

          {/* Mic card */}
          <div className="card mic-card">
            <div className={`bubble ${display ? 'has' : ''} ${interim && !transcript ? 'dim' : ''}`}>
              {display
                ? <span>{display}</span>
                : <span className="ph">{isL ? 'Listening…' : isP ? 'Processing…' : 'Your words appear here'}</span>}
            </div>

            <div className="srow">
              {status === 'idle' && <span>Tap mic to start</span>}
              {isL && <><span className="rdot" /><span>Speak now — tap to stop</span></>}
              {isP && <><span className="spn" /><span>Extracting details…</span></>}
              {isDone && <span className="ok">✓ Review and save below</span>}
              {(isE || status === 'unsupported') && <span className="er">⚠ {error || 'Use Chrome or Edge'}</span>}
            </div>

            <button
              className={`mbtn ${isL ? 'mred' : ''} ${isP ? 'mgray' : ''}`}
              onClick={isL ? stop : isP ? undefined : (isDone || isE) ? reset : listen}
              disabled={isP}
            >
              {isP ? (
                <svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50" strokeDashoffset="14" className="sc" /></svg>
              ) : isL ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
              ) : (isDone || isE) ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13a6 6 0 1 1-1.4-3.9" /><polyline points="18 6 18 12 12 12" /></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
                  <path d="M3 11c0 5 3.58 8 9 8s9-3 9-8" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
            {isL && <div className="rings"><span /><span /><span /></div>}
          </div>

          {/* Review */}
          {isDone && transcript && (
            <div className="card rev-card">
              <div className="rev-top">
                <span className="rlbl">Review Transaction</span>
                {sheetSt === 'saved' && <span className="rpill rg">✓ Saved</span>}
                {sheetSt === 'saving' && <span className="rpill rm">Saving…</span>}
                {sheetSt === 'error' && <span className="rpill rr">Failed</span>}
              </div>
              {editing ? (
                <>
                  <div className="fgrid">
                    <div className="fl"><label>Date</label><input type="date" value={editing.date || ''} onChange={e => setEditing({ ...editing, date: e.target.value })} /></div>
                    <div className="fl"><label>Amount ({editing.currency || 'NGN'})</label><input type="number" value={editing.amount ?? ''} placeholder="e.g. 20000" onChange={e => setEditing({ ...editing, amount: e.target.value ? Number(e.target.value) : null })} /></div>
                    <div className="fl"><label>Description</label><input type="text" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
                    <div className="fl"><label>Category</label>
                      <select value={editing.category || 'Other'} onChange={e => setEditing({ ...editing, category: e.target.value })}>
                        {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
                      </select>
                    </div>
                  </div>
                  <button className="sbtn" onClick={() => save(editing, transcript)} disabled={sheetSt === 'saving' || sheetSt === 'saved'}>
                    {sheetSt === 'saved' ? '✓ Saved to Google Sheets' : sheetSt === 'saving' ? 'Saving…' : '↗ Save to Google Sheets'}
                  </button>
                </>
              ) : (
                <p className="noparse">Could not detect a transaction. Try: <em>"I bought fuel for ₦20,000"</em></p>
              )}
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="card hist-card">
              <div className="hhdr">
                <span>{history.length} {history.length === 1 ? 'entry' : 'entries'} this session</span>
                <button onClick={() => setHistory([])}>Clear</button>
              </div>
              {history.map(item => (
                <div key={item.id} className="hrow">
                  <div className="hico" style={{ background: CATEGORY_COLORS[item.parsed?.category] || '#6b7280' }}>
                    {CATEGORY_ICONS[item.parsed?.category] || '📝'}
                  </div>
                  <div className="hbody">
                    <div className="htop">
                      <span className="hdesc">{item.parsed?.description || item.transcript.slice(0, 36)}</span>
                      <span className="hamt">{fmt(item.parsed?.amount, item.parsed?.currency)}</span>
                    </div>
                    <div className="hmeta">{fmtDate(item.parsed?.date)} · {item.parsed?.category || 'Other'}{item.sheetSt === 'saved' && <span className="stag"> · ✓ Sheet</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <footer className="appfooter">VoiceLog · Web Speech API · Google Sheets</footer>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0c0c0e; --surf: #131316; --surf2: #1b1b1f; --bdr: #252528;
          --tx: #f0ece3; --mt: #67646e; --ac: #5eead4; --red: #f87171; --grn: #34d399;
          --font: 'Space Grotesk', sans-serif; --mono: 'JetBrains Mono', monospace;
        }
        html, body { min-height: 100%; background: var(--bg); color: var(--tx); }
        body { font-family: var(--font); -webkit-font-smoothing: antialiased; }
        button { font-family: var(--font); cursor: pointer; border: none; background: none; color: inherit; }
        input, select { font-family: var(--mono); }
        ::selection { background: var(--ac); color: #000; }
      `}</style>

      <style jsx>{`
        .page { min-height: 100vh; display: flex; flex-direction: column; max-width: 560px; margin: 0 auto; padding: 0 20px; }

        .topbar { display: flex; align-items: center; padding: 18px 0 12px; gap: 12px; }
        .back { font-family: var(--mono); font-size: 0.75rem; color: var(--mt); transition: color 0.18s; padding: 4px 0; }
        .back:hover { color: var(--ac); }
        .tlogo { display: flex; align-items: center; gap: 7px; font-size: 0.95rem; font-weight: 700; letter-spacing: -0.02em; flex: 1; justify-content: center; }
        .tdot { width: 7px; height: 7px; border-radius: 50%; background: var(--ac); display: inline-block; }
        .ttotal { font-family: var(--mono); font-size: 0.75rem; color: var(--ac); }

        .main { flex: 1; padding-bottom: 48px; }
        .heading { padding: 20px 0 20px; }
        .heading h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 4px; }
        .heading p { font-family: var(--mono); font-size: 0.72rem; color: var(--mt); }

        .card { background: var(--surf); border: 1px solid var(--bdr); border-radius: 16px; margin-bottom: 10px; }

        /* mic */
        .mic-card { padding: 24px 20px; display: flex; flex-direction: column; align-items: center; gap: 16px; position: relative; }
        .bubble { width: 100%; min-height: 58px; background: var(--surf2); border: 1px solid var(--bdr); border-radius: 11px; padding: 12px 14px; font-family: var(--mono); font-size: 0.88rem; line-height: 1.55; display: flex; align-items: center; transition: border-color 0.2s; }
        .bubble.has { border-color: rgba(94,234,212,0.3); }
        .bubble.dim { opacity: 0.6; }
        .ph { color: var(--mt); font-style: italic; }
        .srow { font-family: var(--mono); font-size: 0.7rem; color: var(--mt); display: flex; align-items: center; gap: 6px; }
        .ok { color: var(--grn); }
        .er { color: var(--red); }
        .rdot { width: 6px; height: 6px; border-radius: 50%; background: var(--red); flex-shrink: 0; animation: bl 1s infinite; }
        .spn { width: 12px; height: 12px; border: 2px solid var(--ac); border-top-color: transparent; border-radius: 50%; animation: sp 0.8s linear infinite; display: inline-block; flex-shrink: 0; }
        .sc { animation: sp 1s linear infinite; transform-origin: center; }
        @keyframes bl { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes sp { to { transform: rotate(360deg); } }
        .mbtn { width: 64px; height: 64px; border-radius: 50%; background: var(--ac); color: #000; display: flex; align-items: center; justify-content: center; transition: transform 0.15s, box-shadow 0.2s; }
        .mbtn:hover:not(:disabled) { transform: scale(1.06); box-shadow: 0 0 0 12px rgba(94,234,212,0.08); }
        .mbtn:active:not(:disabled) { transform: scale(0.95); }
        .mred { background: var(--red) !important; color: #fff !important; }
        .mgray { background: var(--bdr) !important; color: var(--mt) !important; cursor: default !important; }
        .rings { position: absolute; bottom: 24px; pointer-events: none; }
        .rings span { position: absolute; width: 64px; height: 64px; border-radius: 50%; border: 2px solid var(--red); opacity: 0; animation: rng 2s ease-out infinite; }
        .rings span:nth-child(2) { animation-delay: 0.5s; }
        .rings span:nth-child(3) { animation-delay: 1s; }
        @keyframes rng { 0%{transform:scale(1);opacity:0.5} 100%{transform:scale(2.2);opacity:0} }

        /* review */
        .rev-card { padding: 20px; }
        .rev-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .rlbl { font-family: var(--mono); font-size: 0.64rem; color: var(--ac); text-transform: uppercase; letter-spacing: 0.08em; }
        .rpill { font-family: var(--mono); font-size: 0.64rem; padding: 3px 10px; border-radius: 100px; }
        .rg { color: var(--grn); background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); }
        .rm { color: var(--mt); }
        .rr { color: var(--red); }
        .fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        .fl { display: flex; flex-direction: column; gap: 4px; }
        .fl label { font-family: var(--mono); font-size: 0.58rem; color: var(--mt); text-transform: uppercase; letter-spacing: 0.06em; }
        .fl input, .fl select { background: var(--surf2); border: 1px solid var(--bdr); border-radius: 8px; color: var(--tx); padding: 8px 10px; font-size: 0.82rem; outline: none; transition: border-color 0.18s; -webkit-appearance: none; }
        .fl input:focus, .fl select:focus { border-color: var(--ac); }
        .fl select { cursor: pointer; }
        .sbtn { width: 100%; padding: 11px; background: var(--ac); color: #000; border-radius: 9px; font-weight: 700; font-size: 0.87rem; transition: opacity 0.18s; }
        .sbtn:hover:not(:disabled) { opacity: 0.85; }
        .sbtn:disabled { opacity: 0.4; cursor: default; }
        .noparse { font-family: var(--mono); font-size: 0.78rem; color: var(--mt); line-height: 1.5; }
        .noparse em { color: var(--tx); }

        /* history */
        .hist-card { padding: 16px 18px; }
        .hhdr { display: flex; justify-content: space-between; align-items: center; font-family: var(--mono); font-size: 0.62rem; color: var(--mt); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
        .hhdr button { font-family: var(--mono); font-size: 0.62rem; color: var(--mt); transition: color 0.18s; }
        .hhdr button:hover { color: var(--red); }
        .hrow { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--bdr); }
        .hrow:last-child { border: none; padding-bottom: 0; }
        .hrow:first-child { padding-top: 0; }
        .hico { width: 30px; height: 30px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
        .hbody { flex: 1; min-width: 0; }
        .htop { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; margin-bottom: 2px; }
        .hdesc { font-size: 0.83rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hamt { font-family: var(--mono); font-size: 0.83rem; color: var(--ac); flex-shrink: 0; }
        .hmeta { font-family: var(--mono); font-size: 0.6rem; color: var(--mt); }
        .stag { color: var(--grn); }

        .appfooter { padding: 14px 0 20px; text-align: center; font-family: var(--mono); font-size: 0.6rem; color: var(--mt); border-top: 1px solid var(--bdr); }
      `}</style>
    </>
  );
}
