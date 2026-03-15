const Anthropic = require('@anthropic-ai/sdk');

async function personalize({ trip, lang }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const langLabel = { es:'Spanish', fr:'French', en:'English' }[lang] || 'English';

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You are a travel writer for Offsite, a premium travel app.
Write in ${langLabel} for a ${trip.days}-day ${trip.tripType} trip to ${trip.destination}, ${trip.country}.
Respond ONLY with valid JSON, no markdown:
{"title":"(max 6 words)","introduction":"(2-3 sentences)","tips":["tip1","tip2","tip3"]}`
    }]
  });

  const raw = msg.content[0].text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(raw);
}

module.exports = { personalize };
