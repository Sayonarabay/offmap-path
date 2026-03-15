const { getDestinations } = require('./services/knowledgeBase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const {
    budget=0, budgetPer='total', days=7,
    travelers=2, tripType='cultural', lang='es', origin=''
  } = req.body;

  const all = getDestinations();
  if (!all.length) return res.status(500).json({ error: 'KB not found' });

  // Budget per person per day
  const totalBudget = budgetPer === 'person' ? budget * travelers : budget;
  const bppd = totalBudget / Math.max(travelers,1) / Math.max(days,1);

  // ── Score every destination ──
  const scored = all.map(dest => {
    const cpd = dest.avgCostPerDay || 120;
    let score = 0;

    // 1. Budget fit (0–30 pts)
    if (bppd === 0) {
      score += 15; // no budget specified → neutral
    } else {
      const ratio = bppd / cpd;
      if (ratio >= 1.2)      score += 30; // comfortably within budget
      else if (ratio >= 0.9) score += 20; // tight but doable
      else if (ratio >= 0.7) score += 8;  // over budget but close
      else                   score += 0;  // too expensive
    }

    // 2. Trip type match (0–25 pts)
    const tags = dest.tripTypes || [];
    if (tags.includes(tripType))           score += 25;
    else if (tags.some(t => relatedTypes(tripType).includes(t))) score += 12;

    // 3. Duration fit (0–20 pts)
    const idealDays = dest.idealDays || [5, 10];
    if (days >= idealDays[0] && days <= idealDays[1]) score += 20;
    else if (days >= idealDays[0] - 1)                score += 10;

    // 4. Randomness — ensures different proposals each time (0–15 pts)
    score += Math.random() * 15;

    // 5. Small bonus for variety (proximity diversity)
    score += dest.proximityScore || 0;

    return { ...dest, _score: score, _cpd: cpd };
  });

  // Sort by score descending
  scored.sort((a, b) => b._score - a._score);

  // Pick top 3 ensuring variety: try to have 1 nearby, 1 far, 1 roadtrip
  // but if not possible, just take top 3
  const proposals = pickDiverseTop3(scored, days, travelers);

  return res.json({
    proposals: proposals.map(d => ({
      slug:               d.slug,
      name:               d.name,
      country:            d.country,
      region:             d.region,
      proximity:          d.type === 'roadtrip' ? 'roadtrip' : d.proximity,
      estimatedCostTotal: Math.round(d._cpd * days * travelers),
      tags:               d.tripTypes || [],
      highlight:          d.highlight || '',
      score:              Math.round(d._score),
    }))
  });
};

// Pick 3 diverse destinations: ideally 1 nearby city, 1 far city, 1 roadtrip
// Falls back to top 3 if not enough variety
function pickDiverseTop3(scored, days, travelers) {
  const nearby    = scored.filter(d => d.proximity === 'nearby' && d.type !== 'roadtrip');
  const far       = scored.filter(d => d.proximity === 'far'    && d.type !== 'roadtrip');
  const roadtrips = scored.filter(d => d.type === 'roadtrip');

  const result = [];

  // Take best from each category
  if (nearby.length)    result.push(nearby[0]);
  if (far.length)       result.push(far[0]);
  if (roadtrips.length) result.push(roadtrips[0]);

  // If we have fewer than 3 (e.g. no roadtrips), fill with next best overall
  if (result.length < 3) {
    for (const d of scored) {
      if (result.length >= 3) break;
      if (!result.find(r => r.slug === d.slug)) result.push(d);
    }
  }

  return result.slice(0, 3);
}

function relatedTypes(tripType) {
  const map = {
    cultural:  ['history','art','architecture'],
    relaxed:   ['nature','wellness','relax'],
    adventure: ['nature','sport','hiking'],
    food:      ['cultural','local','nightlife'],
    nature:    ['adventure','relaxed','hiking'],
    nightlife: ['food','cultural','urban'],
  };
  return map[tripType] || [];
}
