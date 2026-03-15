const Anthropic = require('@anthropic-ai/sdk');

async function personalize({ trip, lang }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const langLabel = { es: 'Spanish', fr: 'French', en: 'English' }[lang] || 'English';

  const prompt = `You are a travel writer for Offsite, a premium travel app. Your prose style is Condé Nast Traveller — evocative, specific, never generic.

Write in ${langLabel} for a ${trip.days}-day ${trip.tripType} trip to ${trip.destination}, ${trip.country}.

INTRODUCTION — 3 sentences:
- Sentence 1: Hook immediately. Name a specific detail, sensation or paradox unique to this destination. No clichés. Be specific: a street name, a smell, a contradiction, a surprising fact.
- Sentence 2: Expand on what makes this place special for this type of traveller.
- Sentence 3: Set the tone for the trip ahead.

TIPS — exactly 4, hyper-specific and actionable:
- Not "book in advance" but "Book the Alhambra Nasrid Palaces slot at least 3 weeks ahead on the official website — they sell out and cannot be added on the day"
- Mention real names, times, prices, insider knowledge when relevant
- Cover different angles: timing, money, local custom, transport

Trip context:
- Destination: ${trip.destination}, ${trip.country}
- Duration: ${trip.days} days
- Type: ${trip.tripType}
- Travelers: ${trip.travelers}
- Tags: ${(trip.tags||[]).join(', ')}

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "title": "(5-7 words, evocative, specific — never generic)",
  "introduction": "(3 sentences narrative style)",
  "tips": ["(tip 1)", "(tip 2)", "(tip 3)", "(tip 4)"]
}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text.trim()
    .replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(raw);
}

module.exports = { personalize };
