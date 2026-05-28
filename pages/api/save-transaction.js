export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { date, description, amount, category, currency, transcript } = req.body;

  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
  const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    return res.status(500).json({ error: 'Missing Google Sheets environment variables.' });
  }

  try {
    // Create JWT for Google API auth
    const token = await getGoogleAccessToken(CLIENT_EMAIL, PRIVATE_KEY);

    // Check if header row exists, if not create it
    const rangeCheck = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A1:G1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const rangeData = await rangeCheck.json();
    const hasHeader = rangeData.values && rangeData.values[0]?.length > 0;

    const rows = [];
    if (!hasHeader) {
      rows.push(['Date', 'Description', 'Amount', 'Currency', 'Category', 'Raw Transcript', 'Logged At']);
    }

    const loggedAt = new Date().toISOString();
    rows.push([
      date || '',
      description || '',
      amount !== null && amount !== undefined ? amount : '',
      currency || 'NGN',
      category || '',
      transcript || '',
      loggedAt,
    ]);

    // Append rows to sheet
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A1:G1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: rows }),
      }
    );

    if (!appendRes.ok) {
      const errText = await appendRes.text();
      return res.status(appendRes.status).json({ error: 'Sheets API error: ' + errText });
    }

    const appendData = await appendRes.json();
    return res.status(200).json({ success: true, updatedRange: appendData.updates?.updatedRange });
  } catch (err) {
    console.error('Sheets error:', err);
    return res.status(500).json({ error: 'Failed to save to Google Sheets: ' + err.message });
  }
}

// Minimal JWT implementation for Google service account auth
async function getGoogleAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const b64 = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const signingInput = `${b64(header)}.${b64(payload)}`;

  // Import the private key
  const keyData = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryKey = Buffer.from(keyData, 'base64');
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await globalThis.crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(signingInput)
  );

  const jwt = `${signingInput}.${Buffer.from(signature).toString('base64url')}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get Google access token: ' + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}
