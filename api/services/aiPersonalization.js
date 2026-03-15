const Anthropic = require('@anthropic-ai/sdk');

async function personalize({ trip, lang }) {
  const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const langLabel = { es:'Spanish', fr:'French', en:'English' }[lang] || 'English';

  const prompt = `You are a travel writer for Offmap, a premium travel discovery app. Your style is Condé Nast Traveller — evocative, specific, never generic.

Write in ${langLabel} for a ${trip.days}-day ${trip.tripType} trip to ${trip.destination}, ${trip.country}.

Generate a JSON response with ALL of these fields:

"title": 5-7 evocative words, not generic
"introduction": 3 sentences. First must hook immediately with a specific detail/sensation/paradox unique to this place. No clichés.
"areas": array of 3-5 neighbourhood/zone objects: [{name, desc}] — where to base yourself and why
"experiences": array of 5-8 must-do experiences: [{name, type (paid|free), desc, approx_price_eur (null if free)}] — mix iconic with local
"local_tips": array of 4 hyper-specific tips: real names, prices, timings. Not "book ahead" but "Book Alhambra Nasrid slot 3 weeks ahead on alhambra-patronato.es — the €19 ticket sells out 3 weeks in advance"
"restaurants": array of 3-5 food spots: [{name, type (restaurant|cafe|market|street), desc, price_range (€|€€|€€€)}]
"local_transport": 2-3 sentences on how to get around once there — specific modes, prices, apps if relevant

Context:
- Destination: ${trip.destination}, ${trip.country}
- Duration: ${trip.days} days
- Type: ${trip.tripType}
- Travelers: ${trip.travelers}
- Tags: ${(trip.tags||[]).join(', ')}

Respond ONLY with valid JSON, no markdown, no extra text.`;

  const message = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages:   [{ role:'user', content: prompt }],
  });

  const raw = message.content[0].text.trim()
    .replace(/^```json\n?/,'').replace(/\n?```$/,'').trim();

  try {
    return JSON.parse(raw);
  } catch(e) {
    console.error('AI JSON parse failed:', raw.slice(0,200));
    return { title: trip.destination, introduction:'', areas:[], experiences:[], local_tips:[], restaurants:[], local_transport:'' };
  }
}

module.exports = { personalize };
