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
      origin, dest: trip._destData, departureDate, days,
    });
    trip.transport = { ...(trip.transport || {}), options, season, distanceKm };
  }

  // Attach activity data for frontend price display
  trip._activities = getActivities(destination);

  let ai = null;
  try {
    ai = await personalize({ trip, lang });
    console.log('[AI] introduction length:', ai?.introduction?.length || 0);
    console.log('[AI] areas:', ai?.areas?.length || 0, 'experiences:', ai?.experiences?.length || 0);
  } catch(e) {
    console.warn('[AI] personalize failed:', e.message);
  }

  // If AI failed or returned empty intro, build a fallback from KB data
  if (!ai?.introduction) {
    const dest = trip._destData;
    ai = ai || {};
    ai.introduction = dest?.highlight || `${trip.destination} — ${days} días de ${tripType}.`;
    ai.areas        = ai.areas        || [];
    ai.experiences  = ai.experiences  || [];
    ai.local_tips   = ai.local_tips   || [];
    ai.restaurants  = ai.restaurants  || [];
    ai.local_transport = ai.local_transport || (dest?.transport?.description || '');
    ai.title        = ai.title        || trip.destination;
  }

  return res.json(mergeAI(trip, ai));
};
