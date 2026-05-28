export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: 'No transcript provided' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' });

  const today = new Date().toISOString().split('T')[0];

  try {
    const parseRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Extract spending transaction details from this voice note. Today is ${today}.

Voice note: "${transcript}"

Reply ONLY with a JSON object, no markdown, no explanation.
Example: {"date":"2024-01-15","description":"Fuel","amount":20000,"category":"Transport","currency":"NGN"}

Rules:
- date: use today (${today}) unless the note says "yesterday", a day name, or a date. Format: YYYY-MM-DD
- description: short label e.g. "Fuel", "Groceries", "Electricity bill"
- amount: number only (no commas/symbols). null if not mentioned
- category: one of Transport, Food, Utilities, Health, Entertainment, Shopping, Education, Housing, Savings, Other
- currency: infer from context (naira/₦ = NGN, dollar = USD, pound = GBP), default NGN
- If not a spending transaction, return: {"error":"not_a_transaction"}`,
        }],
      }),
    });

    if (!parseRes.ok) {
      const errText = await parseRes.text();
      return res.status(parseRes.status).json({ error: 'Claude API error: ' + errText });
    }

    const data = await parseRes.json();
    const text = data?.content?.[0]?.text || '{}';

    let parsed = null;
    try {
      const json = JSON.parse(text.replace(/```json|```/g, '').trim());
      if (!json.error) parsed = json;
    } catch { parsed = null; }

    return res.status(200).json({ parsed });
  } catch (err) {
    return res.status(500).json({ error: 'Parse failed: ' + err.message });
  }
}
