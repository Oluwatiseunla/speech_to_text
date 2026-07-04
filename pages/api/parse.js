export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: 'No transcript provided' });
  return res.status(200).json({ parsed: parseTransaction(transcript) });
}

function parseTransaction(text) {
  const lower = text.toLowerCase().trim();
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
  for (const p of amountPatterns) {
    const m = lower.match(p);
    if (m) {
      const k = /k\b/i.test(m[0]);
      amount = parseFloat(m[1].replace(/,/g, ''));
      if (k) amount *= 1000;
      break;
    }
  }
  let currency = 'NGN';
  if (/\$|dollar|usd/i.test(text)) currency = 'USD';
  else if (/£|pound|gbp/i.test(text)) currency = 'GBP';

  const today = new Date();
  let date = fmt(today);
  if (/yesterday/i.test(lower)) { const d=new Date(today);d.setDate(d.getDate()-1);date=fmt(d); }
  else if (/\blast\s+monday\b/i.test(lower)) date=fmt(lwd(today,1));
  else if (/\blast\s+tuesday\b/i.test(lower)) date=fmt(lwd(today,2));
  else if (/\blast\s+wednesday\b/i.test(lower)) date=fmt(lwd(today,3));
  else if (/\blast\s+thursday\b/i.test(lower)) date=fmt(lwd(today,4));
  else if (/\blast\s+friday\b/i.test(lower)) date=fmt(lwd(today,5));
  else if (/\blast\s+saturday\b/i.test(lower)) date=fmt(lwd(today,6));
  else if (/\blast\s+sunday\b/i.test(lower)) date=fmt(lwd(today,0));
  else if (/\bmonday\b/i.test(lower)) date=fmt(lwd(today,1));
  else if (/\btuesday\b/i.test(lower)) date=fmt(lwd(today,2));
  else if (/\bwednesday\b/i.test(lower)) date=fmt(lwd(today,3));
  else if (/\bthursday\b/i.test(lower)) date=fmt(lwd(today,4));
  else if (/\bfriday\b/i.test(lower)) date=fmt(lwd(today,5));
  else if (/\bsaturday\b/i.test(lower)) date=fmt(lwd(today,6));
  else if (/\bsunday\b/i.test(lower)) date=fmt(lwd(today,0));

  const cats = [
    {cat:'Transport',kw:['fuel','petrol','diesel','gas station','uber','bolt','taxi','bus','transport','ride','fare','keke','okada','tyre','tire','car wash','parking','toll']},
    {cat:'Food',kw:['food','eat','lunch','dinner','breakfast','snack','restaurant','suya','rice','chicken','pizza','burger','groceries','grocery','market','vegetable','fruit','bread','drink','water','juice','coffee','tea','buka','pepper soup']},
    {cat:'Utilities',kw:['electricity','nepa','phcn','light bill','power','water bill','internet','wifi','data','airtime','recharge','cable','dstv','gotv','startimes','cooking gas','gas cylinder']},
    {cat:'Health',kw:['hospital','clinic','doctor','pharmacy','drug','medicine','medical','health','lab test','checkup','dentist','chemist']},
    {cat:'Entertainment',kw:['cinema','movie','film','concert','event','ticket','outing','club','bar','lounge','netflix','spotify','subscription']},
    {cat:'Shopping',kw:['clothes','clothing','shoe','bag','shirt','trouser','dress','shopping','jumia','konga','fashion','accessories','watch','phone','laptop','gadget']},
    {cat:'Education',kw:['school','tuition','school fees','book','stationery','course','training','lesson','tutorial','exam','waec','jamb']},
    {cat:'Housing',kw:['rent','house rent','apartment','landlord','agent','repair','plumber','electrician','furniture','appliance','cleaning']},
    {cat:'Savings',kw:['save','savings','invest','investment','piggyvest','cowrywise','deposit']},
  ];
  let category = 'Other', description = '';
  for (const {cat,kw} of cats) {
    const mk = kw.find(k => lower.includes(k));
    if (mk) { category=cat; description=mk.charAt(0).toUpperCase()+mk.slice(1); break; }
  }
  const dps = [
    /(?:bought|buy|purchased?)\s+(?:some\s+)?([a-z\s]{2,25})(?:\s+for|\s+at|\s+worth|$)/i,
    /(?:paid\s+for|payment\s+for|spent\s+on)\s+([a-z\s]{2,25})(?:\s+for|\s+at|$)/i,
  ];
  for (const p of dps) {
    const m = text.match(p);
    if (m && m[1] && m[1].trim().length > 1) { description=m[1].trim().replace(/\b\w/g,c=>c.toUpperCase()); break; }
  }
  if (!description) {
    const sw = new Set(['i','a','the','some','my','for','of','on','at','to','and','or','in','just','got','get','was','were','have','had','did','do','bought','paid','spent','used']);
    const ws = text.replace(/[^a-z\s]/gi,'').split(/\s+/).filter(w=>w.length>2&&!sw.has(w.toLowerCase()));
    if (ws.length>0) description=ws[0].charAt(0).toUpperCase()+ws[0].slice(1).toLowerCase();
  }
  if (!description) description = 'Transaction';
  if (amount===null && description==='Transaction') return null;
  return { date, description, amount, currency, category };
}
function fmt(d) { return d.toISOString().split('T')[0]; }
function lwd(from, target) { const d=new Date(from); const diff=(d.getDay()-target+7)%7||7; d.setDate(d.getDate()-diff); return d; }
