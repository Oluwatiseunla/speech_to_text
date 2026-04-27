import { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';

const WAVEFORM_BARS = 40;

export default function Home() {
  const [status, setStatus] = useState('idle'); // idle | recording | processing | done | error
  const [transcript, setTranscript] = useState('');
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [waveform, setWaveform] = useState(Array(WAVEFORM_BARS).fill(2));
  const [elapsedTime, setElapsedTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const animateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const step = Math.floor(data.length / WAVEFORM_BARS);
    const bars = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
      const val = data[i * step] / 255;
      return Math.max(4, Math.round(val * 80));
    });
    setWaveform(bars);
    animFrameRef.current = requestAnimationFrame(animateWaveform);
  }, []);

  const startRecording = async () => {
    setError('');
    setTranscript('');
    setElapsedTime(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup analyser for waveform viz
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => handleStop(mimeType);
      recorder.start(100);

      setStatus('recording');
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      animateWaveform();
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permissions.');
      setStatus('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
      cancelAnimationFrame(animFrameRef.current);
      setWaveform(Array(WAVEFORM_BARS).fill(2));
      setStatus('processing');
    }
  };

  const handleStop = async (mimeType) => {
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64, mimeType }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.retry) {
            setError(data.error);
            setStatus('error');
          } else {
            setError(data.error || 'Transcription failed.');
            setStatus('error');
          }
          return;
        }

        const text = data.transcript;
        setTranscript(text);
        setStatus('done');
        if (text) {
          setHistory((prev) => [
            { id: Date.now(), text, time: new Date().toLocaleTimeString() },
            ...prev,
          ]);
        }
      } catch (err) {
        setError('Network error. Please try again.');
        setStatus('error');
      }
    };
    reader.readAsDataURL(blob);
  };

  const reset = () => {
    setStatus('idle');
    setTranscript('');
    setError('');
    setElapsedTime(0);
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => () => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const isRecording = status === 'recording';
  const isProcessing = status === 'processing';
  const isDone = status === 'done';
  const isError = status === 'error';

  return (
    <>
      <Head>
        <title>VoiceLog — Speech to Text</title>
        <meta name="description" content="Open-source speech to text transcription" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="page">
        {/* Header */}
        <header className="header">
          <div className="logo">
            <span className="logo-dot" />
            VoiceLog
          </div>
          <span className="powered">Powered by Whisper large-v3</span>
        </header>

        <main className="main">
          {/* Hero */}
          <div className="hero">
            <h1 className="title">Speak.<br />We'll write it.</h1>
            <p className="subtitle">Record your spending, notes, or anything. Whisper turns your voice into accurate text — instantly.</p>
          </div>

          {/* Recorder Card */}
          <div className="card recorder-card">
            {/* Waveform */}
            <div className={`waveform-area ${isRecording ? 'active' : ''}`}>
              {waveform.map((h, i) => (
                <div
                  key={i}
                  className="bar"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 0.03}s`,
                    opacity: isRecording ? 0.6 + (h / 80) * 0.4 : 0.15,
                  }}
                />
              ))}
            </div>

            {/* Timer */}
            <div className={`timer ${isRecording ? 'visible' : ''}`}>
              <span className="rec-dot" />
              {formatTime(elapsedTime)}
            </div>

            {/* Status message */}
            <div className="status-msg">
              {status === 'idle' && 'Tap the button to start recording'}
              {isRecording && 'Listening... tap again to stop'}
              {isProcessing && (
                <span className="processing">
                  <span className="spin" />
                  Transcribing with Whisper…
                </span>
              )}
              {isDone && !error && 'Transcription complete'}
              {isError && ''}
            </div>

            {/* Mic Button */}
            <button
              className={`mic-btn ${isRecording ? 'recording' : ''} ${isProcessing ? 'disabled' : ''}`}
              onClick={isRecording ? stopRecording : isProcessing ? undefined : reset === status ? reset : startRecording}
              disabled={isProcessing}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isProcessing ? (
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2.5" strokeDasharray="60" strokeDashoffset="20" className="spin-ring" />
                </svg>
              ) : isRecording ? (
                <svg width="28" height="28" viewBox="0 0 28 28" fill="currentColor">
                  <rect x="7" y="7" width="14" height="14" rx="2" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="10" y="3" width="8" height="14" rx="4" fill="currentColor" stroke="none" />
                  <path d="M5 14c0 4.97 4.03 9 9 9s9-4.03 9-9" />
                  <line x1="14" y1="23" x2="14" y2="27" />
                  <line x1="10" y1="27" x2="18" y2="27" />
                </svg>
              )}
            </button>

            {/* Retry/Reset after done/error */}
            {(isDone || isError) && (
              <button className="retry-btn" onClick={reset}>
                ↩ Record again
              </button>
            )}
          </div>

          {/* Error */}
          {isError && error && (
            <div className="error-box">
              <span>⚠</span> {error}
            </div>
          )}

          {/* Transcript Output */}
          {isDone && transcript && (
            <div className="card output-card">
              <div className="output-header">
                <span className="output-label">Transcript</span>
                <button className="copy-btn" onClick={() => copyText(transcript)}>Copy</button>
              </div>
              <p className="transcript-text">{transcript}</p>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="history">
              <div className="history-header">
                <span>Recent</span>
                <button className="clear-btn" onClick={() => setHistory([])}>Clear</button>
              </div>
              <div className="history-list">
                {history.map((item) => (
                  <div key={item.id} className="history-item">
                    <span className="history-time">{item.time}</span>
                    <p className="history-text">{item.text}</p>
                    <button className="copy-small" onClick={() => copyText(item.text)}>Copy</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          <span>Open-source · Whisper large-v3 · Runs on Vercel</span>
        </footer>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0a0a0b;
          --surface: #111113;
          --border: #1e1e22;
          --text: #f0ede8;
          --muted: #6b6870;
          --accent: #e8ff47;
          --accent-dim: #c8de2a;
          --danger: #ff4d4d;
          --green: #4dffb0;
          --font-display: 'Syne', sans-serif;
          --font-mono: 'DM Mono', monospace;
          --radius: 20px;
        }
        html, body { height: 100%; }
        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-display);
          -webkit-font-smoothing: antialiased;
        }
        ::selection { background: var(--accent); color: #000; }
        button { font-family: var(--font-display); cursor: pointer; border: none; background: none; }
      `}</style>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          max-width: 640px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* Header */
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 0 20px;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text);
        }
        .logo-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--accent);
        }
        .powered {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--muted);
          letter-spacing: 0.04em;
        }

        /* Main */
        .main { flex: 1; padding-bottom: 60px; }

        /* Hero */
        .hero { padding: 40px 0 36px; }
        .title {
          font-size: clamp(2.6rem, 8vw, 3.6rem);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -0.04em;
          color: var(--text);
          margin-bottom: 16px;
        }
        .subtitle {
          font-size: 0.95rem;
          color: var(--muted);
          line-height: 1.6;
          max-width: 420px;
        }

        /* Card */
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 28px;
          margin-bottom: 16px;
        }

        /* Recorder Card */
        .recorder-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 36px 28px;
        }

        /* Waveform */
        .waveform-area {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 80px;
          width: 100%;
          justify-content: center;
          transition: opacity 0.3s;
        }
        .bar {
          width: 4px;
          border-radius: 4px;
          background: var(--accent);
          transition: height 0.08s ease, opacity 0.3s;
          min-height: 4px;
        }
        .waveform-area:not(.active) .bar {
          height: 4px !important;
        }

        /* Timer */
        .timer {
          font-family: var(--font-mono);
          font-size: 0.85rem;
          color: var(--danger);
          display: flex;
          align-items: center;
          gap: 6px;
          opacity: 0;
          transition: opacity 0.3s;
          height: 20px;
        }
        .timer.visible { opacity: 1; }
        .rec-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--danger);
          animation: blink 1s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* Status */
        .status-msg {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          color: var(--muted);
          text-align: center;
          min-height: 20px;
          letter-spacing: 0.02em;
        }
        .processing {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--accent);
        }

        /* Mic Button */
        .mic-btn {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: var(--accent);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s, background 0.2s, box-shadow 0.2s;
          box-shadow: 0 0 0 0 rgba(232, 255, 71, 0);
        }
        .mic-btn:hover:not(.disabled) {
          transform: scale(1.06);
          box-shadow: 0 0 0 12px rgba(232, 255, 71, 0.08);
        }
        .mic-btn:active:not(.disabled) { transform: scale(0.96); }
        .mic-btn.recording {
          background: var(--danger);
          color: #fff;
          animation: pulse-ring 1.5s ease infinite;
        }
        .mic-btn.disabled {
          background: var(--border);
          color: var(--muted);
          cursor: default;
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(255, 77, 77, 0.3); }
          70% { box-shadow: 0 0 0 16px rgba(255, 77, 77, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 77, 77, 0); }
        }

        /* Spin */
        .spin { width: 16px; height: 16px; border: 2px solid var(--accent); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
        .spin-ring { animation: spin 1s linear infinite; transform-origin: center; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Retry */
        .retry-btn {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          color: var(--muted);
          padding: 6px 14px;
          border: 1px solid var(--border);
          border-radius: 100px;
          transition: color 0.2s, border-color 0.2s;
        }
        .retry-btn:hover { color: var(--text); border-color: var(--muted); }

        /* Error */
        .error-box {
          background: rgba(255, 77, 77, 0.08);
          border: 1px solid rgba(255, 77, 77, 0.2);
          border-radius: 12px;
          padding: 14px 18px;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--danger);
          margin-bottom: 16px;
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        /* Output */
        .output-card { padding: 24px; }
        .output-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .output-label {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--accent);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .copy-btn {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--muted);
          padding: 4px 12px;
          border: 1px solid var(--border);
          border-radius: 100px;
          transition: color 0.2s, border-color 0.2s;
        }
        .copy-btn:hover { color: var(--text); border-color: var(--muted); }
        .transcript-text {
          font-family: var(--font-mono);
          font-size: 1rem;
          line-height: 1.7;
          color: var(--text);
          font-style: italic;
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* History */
        .history { margin-top: 8px; }
        .history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .clear-btn {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--muted);
          transition: color 0.2s;
        }
        .clear-btn:hover { color: var(--danger); }
        .history-list { display: flex; flex-direction: column; gap: 8px; }
        .history-item {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .history-time {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--muted);
          white-space: nowrap;
          padding-top: 2px;
          flex-shrink: 0;
        }
        .history-text {
          font-family: var(--font-mono);
          font-size: 0.87rem;
          color: var(--text);
          line-height: 1.5;
          flex: 1;
          word-break: break-word;
        }
        .copy-small {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--muted);
          white-space: nowrap;
          padding-top: 2px;
          flex-shrink: 0;
          transition: color 0.2s;
        }
        .copy-small:hover { color: var(--accent); }

        /* Footer */
        .footer {
          padding: 20px 0 28px;
          text-align: center;
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--muted);
          border-top: 1px solid var(--border);
          letter-spacing: 0.04em;
        }
      `}</style>
    </>
  );
}
