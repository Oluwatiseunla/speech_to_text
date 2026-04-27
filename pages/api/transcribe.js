export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audio, mimeType } = req.body;

  if (!audio) {
    return res.status(400).json({ error: 'No audio data provided' });
  }

  const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN;

  if (!HF_TOKEN) {
    return res.status(500).json({
      error: 'Missing HUGGINGFACE_API_TOKEN environment variable.',
    });
  }

  try {
    // Decode base64 audio
    const audioBuffer = Buffer.from(audio, 'base64');

    // Call Hugging Face Inference API with Whisper large-v3
    const hfRes = await fetch(
      'https://api-inference.huggingface.co/models/openai/whisper-large-v3',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': mimeType || 'audio/webm',
        },
        body: audioBuffer,
      }
    );

    if (!hfRes.ok) {
      const errText = await hfRes.text();
      // Handle model loading (cold start)
      if (hfRes.status === 503) {
        return res.status(503).json({
          error: 'Model is loading. Please wait ~20 seconds and try again.',
          retry: true,
        });
      }
      return res.status(hfRes.status).json({ error: errText });
    }

    const result = await hfRes.json();
    const transcript = result?.text?.trim() || '';

    return res.status(200).json({ transcript });
  } catch (err) {
    console.error('Transcription error:', err);
    return res.status(500).json({ error: 'Transcription failed. ' + err.message });
  }
}
