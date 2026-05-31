export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: 'No transcript provided' });
  const parsed = parseTransaction(transcript);
  return res.status(200).json({ parsed });
}

function parseTransaction(text) {
  const lower = text.toLowerCase().trim();

  // Amount
  const amountPatterns = [
    /(?:₦|naira|ngn|n|\$|usd|£|gbp)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*k\b/i,
    /(?:₦|naira|ngn|n|\$|usd|£|gbp)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/i,
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:naira|ngn|₦)/i,
    /\bfor\s+(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/i,
    /\bof\s+(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/i,
    /\b(\d{1,3}(?:,\d{3})+(?:\.\d+)?)\b/,
    /\bspent\s+(\d+(?:\.\d+)?)\b/i,
    /\bpaid\s+(\d+(?:\.\d+)?)\b/i,
    /\bcost\s+(\d+(?:\.\d+)?)\b/i,
    /\b(\d{4,}(?:\.\d+)?)\b/,
  ];

  let amount = null;
  for (const pattern of amountPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const isKilo = /k\b/i.test(match[0]);
      amount = parseFloat(match[1].replace(/,/g, ''));
      if (isKilo) amount *= 1000;
      break;
    }
  }

  // Currency
  let currency = 'NGN';
  if (/\$|dollar|usd/i.test(text)) currency = 'USD';
  else if (/£|pound|gbp/i.test(text)) currency = 'GBP';

  // Date
  const today = new Date();
  let date = formatDate(today);
  if (/yesterday/i.test(lower)) { const d = new Date(today); d.setDate(d.getDate() - 1); date = formatDate(d); }
  else if (/\blast\s+monday\b/i.test(lower)) date = formatDate(lastWeekday(today, 1));
  else if (/\blast\s+tuesday\b/i.test(lower)) date = formatDate(lastWeekday(today, 2));
  else if (/\blast\s+wednesday\b/i.test(lower)) date = formatDate(lastWeekday(today, 3));
  else if (/\blast\s+thursday\b/i.test(lower)) date = formatDate(lastWeekday(today, 4));
  else if (/\blast\s+friday\b/i.test(lower)) date = formatDate(lastWeekday(today, 5));
  else if (/\blast\s+saturday\b/i.test(lower)) date = formatDate(lastWeekday(today, 6));
  else if (/\blast\s+sunday\b/i.test(lower)) date = formatDate(lastWeekday(today, 0));
  else if (/\bmonday\b/i.test(lower)) date = formatDate(lastWeekday(today, 1));
  else if (/\btuesday\b/i.test(lower)) date = formatDate(lastWeekday(today, 2));
  else if (/\bwednesday\b/i.test(lower)) date = formatDate(lastWeekday(today, 3));
  else if (/\bthursday\b/i.test(lower)) date = formatDate(lastWeekday(today, 4));
  else if (/\bfriday\b/i.test(lower)) date = formatDate(lastWeekday(today, 5));
  else if (/\bsaturday\b/i.test(lower)) date = formatDate(lastWeekday(today, 6));
  else if (/\bsunday\b/i.test(lower)) date = formatDate(lastWeekday(today, 0));

  // Category + Description
  const categoryMap = [
    { category: 'Transport',     keywords: ['fuel', 'petrol', 'diesel', 'gas station', 'uber', 'bolt', 'taxi', 'bus', 'transport', 'ride', 'fare', 'keke', 'okada', 'tyre', 'tire', 'car wash', 'parking', 'toll'] },
    { category: 'Food',          keywords: ['food', 'eat', 'lunch', 'dinner', 'breakfast', 'snack', 'restaurant', 'suya', 'rice', 'chicken', 'pizza', 'burger', 'groceries', 'grocery', 'market', 'vegetable', 'fruit', 'bread', 'drink', 'water', 'juice', 'coffee', 'tea', 'buka', 'pepper soup'] },
    { category: 'Utilities',     keywords: ['electricity', 'nepa', 'phcn', 'light bill', 'power', 'water bill', 'internet', 'wifi', 'data', 'airtime', 'recharge', 'cable', 'dstv', 'gotv', 'startimes', 'cooking gas', 'gas cylinder'] },
    { category: 'Health',        keywords: ['hospital', 'clinic', 'doctor', 'pharmacy', 'drug', 'medicine', 'medical', 'health', 'lab test', 'checkup', 'dentist', 'chemist'] },
    { category: 'Entertainment', keywords: ['cinema', 'movie', 'film', 'concert', 'event', 'ticket', 'outing', 'club', 'bar', 'lounge', 'netflix', 'spotify', 'subscription'] },
    { category: 'Shopping',      keywords: ['clothes', 'clothing', 'shoe', 'bag', 'shirt', 'trouser', 'dress', 'shopping', 'jumia', 'konga', 'fashion', 'accessories', 'watch', 'phone', 'laptop', 'gadget'] },
    { category: 'Education',     keywords: ['school', 'tuition', 'school fees', 'book', 'stationery', 'course', 'training', 'lesson', 'tutorial', 'exam', 'waec', 'jamb'] },
    { category: 'Housing',       keywords: ['rent', 'house rent', 'apartment', 'landlord', 'agent', 'repair', 'plumber', 'electrician', 'furniture', 'appliance', 'cleaning'] },
    { category: 'Savings',       keywords: ['save', 'savings', 'invest', 'investment', 'piggyvest', 'cowrywise', 'deposit'] },
  ];

  let category = 'Other';
  let description = '';

  for (const { category: cat, keywords } of categoryMap) {
    const matched = keywords.find(k => lower.includes(k));
    if (matched) {
      category = cat;
      description = matched.charAt(0).toUpperCase() + matched.slice(1);
      break;
    }
  }

  // Better description from sentence patterns
  const descPatterns = [
    /(?:bought|buy|purchased?)\s+(?:some\s+)?([a-z\s]{2,25})(?:\s+for|\s+at|\s+worth|$)/i,
    /(?:paid\s+for|payment\s+for|spent\s+on)\s+([a-z\s]{2,25})(?:\s+for|\s+at|$)/i,
    /(?:for)\s+(?:my\s+)?([a-z\s]{2,20})(?:\s+bill|\s+fee|\s+payment|$)/i,
  ];
  for (const p of descPatterns) {
    const m = text.match(p);
    if (m && m[1] && m[1].trim().length > 1) {
      description = m[1].trim().replace(/\b\w/g, c => c.toUpperCase());
      break;
    }
  }

  if (!description) {
    const stopWords = new Set(['i','a','the','some','my','for','of','on','at','to','and','or','in','just','got','get','was','were','have','had','did','do','bought','paid','spent','used']);
    const words = text.replace(/[^a-z\s]/gi,'').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
    if (words.length > 0) description = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
  }

  if (!description) description = 'Transaction';
  if (amount === null && description === 'Transaction') return null;

  return { date, description, amount, currency, category };
}

function formatDate(d) { return d.toISOString().split('T')[0]; }

function lastWeekday(from, targetDay) {
  const d = new Date(from);
  const diff = (d.getDay() - targetDay + 7) % 7 || 7;
  d.setDate(d.getDate() - diff);
  return d;
}
