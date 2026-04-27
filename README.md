# VoiceLog — Speech to Text App

A speech-to-text web app powered by **OpenAI Whisper large-v3** (open-source model via Hugging Face), built with Next.js and deployable on Vercel in minutes.

## Features

- 🎙️ One-tap voice recording in the browser
- ⚡ Transcription via Whisper large-v3 (state-of-the-art open-source ASR)
- 📋 Copy-to-clipboard for any transcript
- 🕓 Per-session history of all transcriptions
- 🌐 Fully serverless — runs on Vercel edge/serverless functions
- 🔑 Only requires a free Hugging Face API token

---

## Quickstart (Local)

```bash
# 1. Clone / unzip the project
cd speech-to-text-app

# 2. Install dependencies
npm install

# 3. Set up your environment
cp .env.local.example .env.local
# Edit .env.local and add your Hugging Face token

# 4. Run dev server
npm run dev
# Open http://localhost:3000
```

---

## Get a Free Hugging Face Token

1. Go to [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Click **New token** → name it anything → Role: **Read**
3. Copy the token (starts with `hf_...`)
4. Paste it in `.env.local` as `HUGGINGFACE_API_TOKEN=hf_your_token_here`

> The free tier includes ~30,000 inference requests/month. More than enough for personal use.

---

## Deploy to Vercel

### Option A — Vercel CLI (fastest)

```bash
npm install -g vercel
vercel login
vercel --prod
# When prompted, set environment variable: HUGGINGFACE_API_TOKEN
```

### Option B — Vercel Dashboard (no CLI needed)

1. Push your code to a **GitHub repo**
2. Go to [https://vercel.com/new](https://vercel.com/new)
3. Import your GitHub repo
4. In **Environment Variables**, add:
   - Key: `HUGGINGFACE_API_TOKEN`
   - Value: `hf_your_token_here`
5. Click **Deploy** ✅

Your app will be live at `https://your-project.vercel.app`

---

## Project Structure

```
speech-to-text-app/
├── pages/
│   ├── index.js          # Main UI (recorder, waveform, history)
│   └── api/
│       └── transcribe.js # Serverless API route → Whisper via HF
├── .env.local.example    # Template for env vars
├── next.config.js
└── package.json
```

## How It Works

1. Browser captures audio via `MediaRecorder` API
2. Audio is encoded as base64 and sent to `/api/transcribe`
3. The Next.js serverless function sends it to Hugging Face's Whisper large-v3 inference endpoint
4. Transcript is returned and displayed

## Model Info

| Model | Size | WER |
|---|---|---|
| `openai/whisper-large-v3` | 1.5B params | State of the art |

Supports 99 languages. Great for short-form voice notes like spending entries.

## Notes

- First transcription may take ~20 seconds if the HF model is cold-starting (free tier). After warm-up, responses are fast.
- For production/heavy use, consider upgrading to a HF Inference Endpoint (dedicated) or self-hosting Whisper.
- Audio is never stored — it's sent directly to HF and discarded.
