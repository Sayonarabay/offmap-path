const { buildTrip, mergeAI } = require('../services/tripBuilder');
const { personalize }        = require('../services/aiPersonalization');

/**
 * POST /api/generate-trip
 * Body: { destination, days, travelers, tripType, budget, lang }
 * Returns: full trip object ready for the frontend
 */
async function generateTrip(req, res) {
  const {
    destination,
    days       = 7,
    travelers  = 2,
    tripType   = 'cultural',
    budget     = 0,
    lang       = 'es',
  } = req.body;

  if (!destination) {
    return res.status(400).json({ error: 'destination is required' });
  }

  // 1. Assemble from knowledge base
  const trip = buildTrip({ destination, days, tripType, travelers, budget, lang });

  if (!trip) {
    return res.status(404).json({
      error: `No itinerary found for "${destination}" (${days} days, ${tripType})`,
    });
  }

  // 2. AI personalization (intro + tips only)
  let finalTrip = trip;
  try {
    const aiResult = await personalize({ trip, lang });
    finalTrip = mergeAI(trip, aiResult);
  } catch (err) {
    console.warn('AI personalization failed, using KB data only:', err.message);
    finalTrip.title = trip.destination;
    finalTrip.introduction = '';
    finalTrip.tips = [];
  }

  return res.json(finalTrip);
}

module.exports = { generateTrip };
