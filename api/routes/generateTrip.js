const { buildTrip, mergeAI } = require('../services/tripBuilder');
const { personalize }        = require('../services/aiPersonalization');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { destination, days = 7, travelers = 2, tripType = 'cultural', budget = 0, lang = 'es' } = req.body;
  if (!destination) return res.status(400).json({ error: 'destination is required' });

  const trip = buildTrip({ destination, days, tripType, travelers, budget, lang });
  if (!trip) return res.status(404).json({ error: `No itinerary found for "${destination}" (${days} days, ${tripType})` });

  try {
    const aiResult = await personalize({ trip, lang });
    return res.json(mergeAI(trip, aiResult));
  } catch (err) {
    console.warn('AI failed:', err.message);
    return res.json({ ...trip, title: trip.destination, introduction: '', tips: [] });
  }
};
