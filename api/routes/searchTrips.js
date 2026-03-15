const { getDestinations } = require('../services/knowledgeBase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { budget = 0, budgetPer = 'total', days = 7, travelers = 2, tripType = 'cultural', lang = 'es' } = req.body;

  const destinations = getDestinations();
  if (!destinations.length) return res.status(500).json({ error: 'Knowledge base not found' });

  const budgetPerPersonPerDay = budgetPer === 'total'
    ? budget / Math.max(travelers, 1) / Math.max(days, 1)
    : budget / Math.max(days, 1);

  const affordable = destinations.filter(d =>
    !budget || (d.avgCostPerDay || 120) <= budgetPerPersonPerDay * 1.4
  );

  function score(dest) {
    return (dest.tripTypes || []).includes(tripType) ? 2 : 1;
  }

  const nearby    = affordable.filter(d => d.proximity === 'nearby' && d.type !== 'roadtrip');
  const far       = affordable.filter(d => d.proximity === 'far');
  const roadtrips = affordable.filter(d => d.type === 'roadtrip');

  function pick(list, fallback) {
    const pool = list.length ? list : fallback;
    return pool.sort((a, b) => score(b) - score(a))[0] || null;
  }

  const proposals = [
    pick(nearby,    affordable),
    pick(far,       affordable),
    pick(roadtrips, affordable),
  ].filter(Boolean).map(d => ({
    slug:               d.slug,
    name:               d.name,
    country:            d.country,
    region:             d.region,
    proximity:          d.type === 'roadtrip' ? 'roadtrip' : d.proximity,
    estimatedCostTotal: Math.round((d.avgCostPerDay || 120) * days * travelers),
    tags:               d.tripTypes || [],
    highlight:          d.highlight || '',
  }));

  return res.json({ proposals });
};
