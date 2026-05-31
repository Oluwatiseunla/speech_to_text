import { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';

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

function formatAmount(amount, currency) {
  if (amount===null||amount===undefined||amount==='') return '—';
  const sym = currency==='NGN'?'₦':currency==='USD'?'$':currency==='GBP'?'£':(currency+' ');
  return sym+Number(amount).toLocaleString();
}
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try { return new Date(dateStr+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }
  catch { return dateStr; }
}

export default function Home() {
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
    const recognition = new SR();
    recognition.lang='en-NG';
    recognition.interimResults=true;
    recognition.maxAlternatives=1;
    recognition.continuous=false;
    finalRef.current='';
    setTranscript(''); setInterimText(''); setError('');
    setParsed(null); setEditingParsed(null); setSheetStatus(null);

    recognition.onstart=()=>setStatus('listening');
    recognition.onresult=(e)=>{
      let interim='',final='';
      for (let i=e.resultIndex;i<e.results.length;i++){
        const t=e.results[i][0].transcript;
        if(e.results[i].isFinal) final+=t; else interim+=t;
      }
      if(final) finalRef.current+=final;
      setInterimText(interim);
      if(finalRef.current) setTranscript(finalRef.current);
    };
    recognition.onerror=(e)=>{
      if(e.error==='no-speech') setError('No speech detected. Please try again.');
      else if(e.error==='not-allowed') setError('Microphone access denied. Please allow it in your browser settings.');
      else setError('Speech error: '+e.error);
      setStatus('error');
    };
    recognition.onend=()=>{
      setInterimText('');
      const text=finalRef.current.trim();
      if(text){ setTranscript(text); parseTransaction(text); }
      else if(status!=='error'){ setError('Nothing captured. Please try again.'); setStatus('error'); }
    };
    recognitionRef.current=recognition;
    recognition.start();
  };

  const stopListening=()=>recognitionRef.current?.stop();

  const parseTransaction=async(text)=>{
    setStatus('parsing');
    try {
      const res=await fetch('/api/parse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({transcript:text})});
      const data=await res.json();
      if(!res.ok){setError(data.error||'Parsing failed.');setStatus('error');return;}
      const p=data.parsed;
      setParsed(p); setEditingParsed(p?{...p}:null); setStatus('done');
      if(text) setHistory(prev=>[{id:Date.now(),transcript:text,parsed:p,time:new Date().toLocaleTimeString(),sheetStatus:null},...prev]);
    } catch(err){setError('Network error. Please try again.');setStatus('error');}
  };

  const saveToSheet=async(data,transcriptText)=>{
    setSheetStatus('saving');
    try {
      const res=await fetch('/api/save-transaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,transcript:transcriptText})});
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
    <>
      <Head>
        <title>VoiceLog — Spending Tracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div className="page">
        <header className="header">
          <div className="logo"><span className="dot"/>VoiceLog</div>
          <div className="hdr-right">
            {history.length>0&&<span className="total">₦{totalSpend.toLocaleString()}</span>}
            <span className="badge">Free · Browser STT</span>
          </div>
        </header>
        <main className="main">
          <div className="hero">
            <h1 className="title">Log spending<br/>by voice.</h1>
            <p className="sub">Say what you spent — details are extracted automatically and saved to your Google Sheet.</p>
          </div>

          <div className="card mic-card">
            <div className={`bubble ${displayText?'has-text':''} ${interimText&&!transcript?'interim':''}`}>
              {displayText
                ?<span>{displayText}</span>
                :<span className="placeholder">
                  {isListening?'Listening…':isParsing?'Processing…':'Your words appear here'}
                </span>}
            </div>
            <div className="status-row">
              {status==='idle'&&<span>Tap the mic and speak</span>}
              {isListening&&<><span className="rec-dot"/><span>Speak now — tap mic to finish</span></>}
              {isParsing&&<><span className="spin"/><span>Extracting transaction details…</span></>}
              {isDone&&<span className="ok">✓ Review and save below</span>}
              {isError&&<span className="err">⚠ {error}</span>}
              {status==='unsupported'&&<span className="err">⚠ Use Chrome or Edge for speech recognition</span>}
            </div>
            <button
              className={`mic-btn ${isListening?'active':''} ${isParsing?'loading':''}`}
              onClick={isListening?stopListening:isParsing?undefined:(isDone||isError)?reset:startListening}
              disabled={isParsing}
            >
              {isParsing?(
                <svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50" strokeDashoffset="15" className="spin-ring"/></svg>
              ):isListening?(
                <svg width="26" height="26" viewBox="0 0 26 26" fill="currentColor"><rect x="6" y="6" width="14" height="14" rx="2.5"/></svg>
              ):(isDone||isError)?(
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14a7 7 0 1 1-1.5-4.5"/><polyline points="20 7 20 13 14 13"/></svg>
              ):(
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="2" width="8" height="14" rx="4" fill="currentColor" stroke="none"/>
                  <path d="M4 13c0 4.97 4.03 9 9 9s9-4.03 9-9"/>
                  <line x1="13" y1="22" x2="13" y2="26"/>
                  <line x1="9" y1="26" x2="17" y2="26"/>
                </svg>
              )}
            </button>
            {isListening&&<div className="rings"><span/><span/><span/></div>}
          </div>

          {isDone&&transcript&&(
            <div className="card review-card">
              <div className="review-top">
                <span className="label">Review Transaction</span>
                {sheetStatus==='saved'&&<span className="pill green">✓ Saved to Sheet</span>}
                {sheetStatus==='saving'&&<span className="pill muted">Saving…</span>}
                {sheetStatus==='error'&&<span className="pill red">Save failed</span>}
              </div>
              {editingParsed?(
                <>
                  <div className="grid">
                    <div className="field"><label>Date</label>
                      <input type="date" value={editingParsed.date||''} onChange={e=>setEditingParsed({...editingParsed,date:e.target.value})}/>
                    </div>
                    <div className="field"><label>Amount ({editingParsed.currency||'NGN'})</label>
                      <input type="number" value={editingParsed.amount??''} placeholder="e.g. 20000"
                        onChange={e=>setEditingParsed({...editingParsed,amount:e.target.value?Number(e.target.value):null})}/>
                    </div>
                    <div className="field"><label>Description</label>
                      <input type="text" value={editingParsed.description||''} onChange={e=>setEditingParsed({...editingParsed,description:e.target.value})}/>
                    </div>
                    <div className="field"><label>Category</label>
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
                <div className="no-parse">
                  <p>Could not detect a transaction. Try: <em>"I bought fuel for ₦20,000"</em></p>
                </div>
              )}
            </div>
          )}

          {history.length>0&&(
            <div className="history">
              <div className="hist-hdr">
                <span>{history.length} {history.length===1?'entry':'entries'} this session</span>
                <button onClick={()=>setHistory([])}>Clear</button>
              </div>
              {history.map(item=>(
                <div key={item.id} className="h-item">
                  <div className="h-icon" style={{background:CATEGORY_COLORS[item.parsed?.category]||'#6b7280'}}>
                    {CATEGORY_ICONS[item.parsed?.category]||'📝'}
                  </div>
                  <div className="h-body">
                    <div className="h-top">
                      <span className="h-desc">{item.parsed?.description||item.transcript.slice(0,38)}</span>
                      <span className="h-amt">{formatAmount(item.parsed?.amount,item.parsed?.currency)}</span>
                    </div>
                    <div className="h-meta">
                      {formatDate(item.parsed?.date)} · {item.parsed?.category||'Other'}
                      {item.sheetStatus==='saved'&&<span className="saved-tag"> · ✓ Sheet</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        <footer className="footer">100% Free · Web Speech API · Google Sheets · Vercel</footer>
      </div>

      <style jsx global>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#09090b;--surface:#111114;--surface2:#18181c;--border:#222228;
          --text:#f2efe9;--muted:#64616b;--accent:#d4ff47;--red:#ff4d4d;--green:#3dffa0;
          --font:'Syne',sans-serif;--mono:'DM Mono',monospace;
        }
        html,body{height:100%}
        body{background:var(--bg);color:var(--text);font-family:var(--font);-webkit-font-smoothing:antialiased}
        button{font-family:var(--font);cursor:pointer;border:none;background:none}
        input,select{font-family:var(--mono)}
        ::selection{background:var(--accent);color:#000}
      `}</style>
      <style jsx>{`
        .page{min-height:100vh;display:flex;flex-direction:column;max-width:580px;margin:0 auto;padding:0 20px}
        .header{display:flex;align-items:center;justify-content:space-between;padding:26px 0 18px}
        .logo{display:flex;align-items:center;gap:8px;font-size:1rem;font-weight:700;letter-spacing:-0.02em}
        .dot{width:8px;height:8px;border-radius:50%;background:var(--accent);display:inline-block}
        .hdr-right{display:flex;align-items:center;gap:10px}
        .total{font-family:var(--mono);font-size:0.8rem;color:var(--accent)}
        .badge{font-family:var(--mono);font-size:0.62rem;color:var(--muted);background:var(--surface2);border:1px solid var(--border);padding:3px 8px;border-radius:100px}
        .main{flex:1;padding-bottom:60px}
        .hero{padding:34px 0 28px}
        .title{font-size:clamp(2.4rem,8vw,3.4rem);font-weight:800;line-height:1.05;letter-spacing:-0.04em;margin-bottom:12px}
        .sub{font-size:0.88rem;color:var(--muted);line-height:1.65;max-width:380px}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:28px;margin-bottom:14px}
        .mic-card{display:flex;flex-direction:column;align-items:center;gap:20px;padding:30px 24px;position:relative}
        .bubble{width:100%;min-height:64px;background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:14px 16px;font-family:var(--mono);font-size:0.9rem;line-height:1.55;display:flex;align-items:center;transition:border-color 0.2s}
        .bubble.has-text{border-color:rgba(212,255,71,0.3)}
        .bubble.interim{opacity:0.6}
        .placeholder{color:var(--muted);font-style:italic}
        .status-row{font-family:var(--mono);font-size:0.73rem;color:var(--muted);display:flex;align-items:center;gap:7px;text-align:center}
        .ok{color:var(--green)}
        .err{color:var(--red)}
        .rec-dot{width:7px;height:7px;border-radius:50%;background:var(--red);flex-shrink:0;animation:blink 1s infinite}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .spin{width:13px;height:13px;border:2px solid var(--accent);border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block;flex-shrink:0}
        .spin-ring{animation:spin 1s linear infinite;transform-origin:center}
        @keyframes spin{to{transform:rotate(360deg)}}
        .mic-btn{width:70px;height:70px;border-radius:50%;background:var(--accent);color:#000;display:flex;align-items:center;justify-content:center;transition:transform 0.15s,box-shadow 0.2s;z-index:1}
        .mic-btn:hover:not(:disabled){transform:scale(1.06);box-shadow:0 0 0 14px rgba(212,255,71,0.07)}
        .mic-btn:active:not(:disabled){transform:scale(0.95)}
        .mic-btn.active{background:var(--red);color:#fff}
        .mic-btn.loading{background:var(--border);color:var(--muted);cursor:default}
        .rings{position:absolute;bottom:30px;pointer-events:none}
        .rings span{position:absolute;width:70px;height:70px;border-radius:50%;border:2px solid var(--red);opacity:0;animation:ring 2s ease-out infinite}
        .rings span:nth-child(2){animation-delay:0.5s}
        .rings span:nth-child(3){animation-delay:1s}
        @keyframes ring{0%{transform:scale(1);opacity:0.5}100%{transform:scale(2.2);opacity:0}}
        .review-card{padding:22px}
        .review-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .label{font-family:var(--mono);font-size:0.68rem;color:var(--accent);letter-spacing:0.08em;text-transform:uppercase}
        .pill{font-family:var(--mono);font-size:0.68rem;padding:3px 10px;border-radius:100px}
        .pill.green{color:var(--green);background:rgba(61,255,160,0.1);border:1px solid rgba(61,255,160,0.2)}
        .pill.muted{color:var(--muted)}
        .pill.red{color:var(--red)}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}
        .field{display:flex;flex-direction:column;gap:5px}
        .field label{font-family:var(--mono);font-size:0.62rem;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase}
        .field input,.field select{background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--text);padding:9px 11px;font-size:0.84rem;outline:none;transition:border-color 0.2s;-webkit-appearance:none}
        .field input:focus,.field select:focus{border-color:var(--accent)}
        .field select{cursor:pointer}
        .save-btn{width:100%;padding:12px;background:var(--accent);color:#000;border-radius:11px;font-weight:700;font-size:0.88rem;transition:opacity 0.2s,transform 0.15s}
        .save-btn:hover:not(:disabled){opacity:0.88;transform:translateY(-1px)}
        .save-btn:disabled{opacity:0.45;cursor:default}
        .no-parse{padding:6px 0 2px}
        .no-parse p{font-family:var(--mono);font-size:0.8rem;color:var(--muted);line-height:1.55}
        .no-parse em{color:var(--text)}
        .history{margin-top:4px}
        .hist-hdr{display:flex;justify-content:space-between;align-items:center;font-family:var(--mono);font-size:0.66rem;color:var(--muted);letter-spacing:0.05em;text-transform:uppercase;margin-bottom:10px}
        .hist-hdr button{font-family:var(--mono);font-size:0.66rem;color:var(--muted);transition:color 0.2s}
        .hist-hdr button:hover{color:var(--red)}
        .h-item{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:11px 14px;display:flex;align-items:center;gap:11px;margin-bottom:7px}
        .h-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;opacity:0.88}
        .h-body{flex:1;min-width:0}
        .h-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:3px}
        .h-desc{font-size:0.86rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .h-amt{font-family:var(--mono);font-size:0.86rem;color:var(--accent);flex-shrink:0}
        .h-meta{font-family:var(--mono);font-size:0.63rem;color:var(--muted)}
        .saved-tag{color:var(--green)}
        .footer{padding:16px 0 24px;text-align:center;font-family:var(--mono);font-size:0.62rem;color:var(--muted);border-top:1px solid var(--border);letter-spacing:0.04em}
      `}</style>
    </>
  );
}
