const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic();

/**
 * Calls Claude to generate ONLY:
 * - A short trip title
 * - A 2–3 sentence introduction
 * - 3–4 practical travel tips
 * The itinerary itself is NOT touched.
 */
async function personalize({ trip, lang }) {
  const langLabel = { es: 'Spanish', fr: 'French', en: 'English' }[lang] || 'English';

  const prompt = `You are a travel writer for a premium travel planning app called Offsite.

Given this trip data, write in ${langLabel}:
- A short evocative title (max 6 words)
- A 2–3 sentence introduction that captures why this destination is special for this trip type
- Exactly 3 practical traveler tips (transport, money, culture, or timing)

Trip details:
- Destination: ${trip.destination}, ${trip.country}
- Duration: ${trip.days} days
- Type: ${trip.tripType}
- Travelers: ${trip.travelers}
- Tags: ${trip.tags.join(', ')}

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "title": "...",
  "introduction": "...",
  "tips": ["...", "...", "..."]
}`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text.trim();
  // Strip accidental markdown fences
  const clean = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(clean);
}

module.exports = { personalize };
