const { buildTrip, mergeAI } = require('./services/tripBuilder');
const { personalize }        = require('./services/aiPersonalization');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { destination, days=7, travelers=2, tripType='cultural', budget=0, lang='es', origin='' } = req.body;
  if (!destination) return res.status(400).json({ error: 'destination required' });

  const trip = buildTrip({ destination, days, tripType, travelers, budget, lang });

  if (!trip) return res.status(404).json({
    error: `No itinerary found for "${destination}" (${days}d, ${tripType})`
  });

  try {
    const ai = await personalize({ trip, lang });
    return res.json(mergeAI(trip, ai));
  } catch(e) {
    console.warn('AI failed:', e.message);
    return res.json({ ...trip, title: trip.destination, introduction: '', tips: [] });
  }
};
