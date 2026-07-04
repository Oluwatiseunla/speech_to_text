export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { date, description, amount, category, currency, transcript } = req.body;
  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
  const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY)
    return res.status(500).json({ error: 'Missing Google Sheets environment variables.' });
  try {
    const token = await getToken(CLIENT_EMAIL, PRIVATE_KEY);
    const check = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A1:G1`,{headers:{Authorization:`Bearer ${token}`}});
    const cd = await check.json();
    const hasHeader = cd.values && cd.values[0]?.length > 0;
    const rows = [];
    if (!hasHeader) rows.push(['Date','Description','Amount','Currency','Category','Raw Transcript','Logged At']);
    rows.push([date||'',description||'',amount??'',currency||'NGN',category||'',transcript||'',new Date().toISOString()]);
    const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A1:G1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,{
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({values:rows}),
    });
    if (!r.ok) return res.status(r.status).json({ error: 'Sheets API error: '+(await r.text()) });
    const d = await r.json();
    return res.status(200).json({ success:true, updatedRange:d.updates?.updatedRange });
  } catch(err) {
    return res.status(500).json({ error: 'Failed to save: '+err.message });
  }
}

async function getToken(email, key) {
  const now = Math.floor(Date.now()/1000);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const si = `${b64({alg:'RS256',typ:'JWT'})}.${b64({iss:email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',exp:now+3600,iat:now})}`;
  const kd = key.replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\s/g,'');
  const ck = await globalThis.crypto.subtle.importKey('pkcs8',Buffer.from(kd,'base64'),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const sig = await globalThis.crypto.subtle.sign('RSASSA-PKCS1-v1_5',ck,Buffer.from(si));
  const jwt = `${si}.${Buffer.from(sig).toString('base64url')}`;
  const t = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})});
  const td = await t.json();
  if (!td.access_token) throw new Error(JSON.stringify(td));
  return td.access_token;
}
