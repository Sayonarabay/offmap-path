const { buildTrip, mergeAI }    = require('./services/tripBuilder');
const { personalize }           = require('./services/aiPersonalization');
const { buildTransportOptions } = require('./services/transportBuilder');
const { getActivities }         = require('./services/knowledgeBase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const {
    destination, days=7, travelers=2,
    tripType='cultural', budget=0,
    lang='es', origin='', departureDate=''
  } = req.body;
  if (!destination) return res.status(400).json({ error: 'destination required' });

  const trip = buildTrip({ destination, days, tripType, travelers, budget, lang });
  if (!trip) return res.status(404).json({
    error: `No itinerary found for "${destination}" (${days}d, ${tripType})`
  });

  // Build transport dynamically from origin
  if (origin && trip._destData) {
    const { options, season, distanceKm } = buildTransportOptions({
      origin,
      dest: trip._destData,
      departureDate,
      days,
    });
    trip.transport = { ...(trip.transport || {}), options, season, distanceKm };
  }

  // Attach activity data for frontend price display (stripped in mergeAI)
  trip._activities = getActivities(destination);

  try {
    const ai = await personalize({ trip, lang });
    return res.json(mergeAI(trip, ai));
  } catch(e) {
    console.warn('AI failed:', e.message);
    const { _destData, ...clean } = trip;
    return res.json({ ...clean, title: trip.destination, introduction: '', tips: [] });
  }
};
