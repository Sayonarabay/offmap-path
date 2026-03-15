const { getDestinations } = require('../services/knowledgeBase');

/**
 * POST /api/search-trips
 * Body: { budget, days, travelers, tripType, origin, lang }
 * Returns: { proposals: [nearby, far, roadtrip] }
 */
async function searchTrips(req, res) {
  const { budget = 0, days = 7, travelers = 2, tripType = 'cultural', origin = '', lang = 'es' } = req.body;

  const destinations = getDestinations();
  if (!destinations.length) {
    return res.status(500).json({ error: 'Knowledge base not found' });
  }

  const budgetPerPersonPerDay = budget / Math.max(travelers, 1) / Math.max(days, 1);

  // Filter destinations that fit budget (rough check)
  const affordable = destinations.filter(d => {
    if (!budget) return true;
    return (d.avgCostPerDay || 120) <= budgetPerPersonPerDay * 1.3;
  });

  // Score destinations by trip type match
  function score(dest, type) {
    const tags = dest.tripTypes || [];
    return tags.includes(type) ? 2 : tags.length ? 1 : 0;
  }

  // Separate by proximity
  const nearby   = affordable.filter(d => d.proximity === 'nearby');
  const far      = affordable.filter(d => d.proximity === 'far');
  const roadtrip = affordable.filter(d => d.type === 'roadtrip');

  function pick(list, fallback) {
    const sorted = (list.length ? list : fallback)
      .sort((a, b) => score(b, tripType) - score(a, tripType));
    return sorted[0] || null;
  }

  const proposals = [
    pick(nearby,   affordable),
    pick(far,      affordable),
    pick(roadtrip, affordable),
  ].filter(Boolean).map(d => ({
    slug:        d.slug,
    name:        d.name,
    country:     d.country,
    region:      d.region,
    proximity:   d.type === 'roadtrip' ? 'roadtrip' : d.proximity,
    estimatedCostTotal: Math.round((d.avgCostPerDay || 120) * days * travelers),
    tags:        d.tripTypes || [],
    highlight:   d.highlight || '',
  }));

  return res.json({ proposals });
}

module.exports = { searchTrips };
