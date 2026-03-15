const { getDestinations }       = require('./services/knowledgeBase');
const { buildTransportOptions } = require('./services/transportBuilder');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const {
    budget=0, budgetPer='total', days=7,
    travelers=2, tripType='cultural',
    lang='es', origin='', departureDate=''
  } = req.body;

  const all = getDestinations();
  if (!all.length) return res.status(500).json({ error: 'KB not found' });

  // Total budget in absolute euros
  const totalBudget = budget > 0
    ? (budgetPer === 'person' ? budget * Math.max(travelers,1) : budget)
    : 0;

  const originKey = (origin||'').toLowerCase().trim()
    .replace(/[áàâ]/g,'a').replace(/[éèê]/g,'e').replace(/[íì]/g,'i')
    .replace(/[óòô]/g,'o').replace(/[úù]/g,'u').replace(/\s+/g,'-');

  // ── STEP 1: HARD VIABILITY FILTER ──
  // Estimate total trip cost and eliminate unaffordable destinations
  const viable = totalBudget === 0
    ? all  // no budget set → show everything
    : all.filter(dest => {
        const estimatedTotal = estimateTripCost({ dest, originKey, days, travelers, departureDate });
        return estimatedTotal <= totalBudget * 1.1; // 10% tolerance
      });

  if (!viable.length) {
    // Budget too tight — relax to cheapest options
    const cheapest = [...all]
      .sort((a,b) => estimateTripCost({dest:a,originKey,days,travelers,departureDate})
                   - estimateTripCost({dest:b,originKey,days,travelers,departureDate}))
      .slice(0, 6);
    return buildProposals(req, res, cheapest, { originKey, days, travelers, tripType, totalBudget, departureDate, lang });
  }

  return buildProposals(req, res, viable, { originKey, days, travelers, tripType, totalBudget, departureDate, lang });
};

// ─────────────────────────────────────
// ESTIMATE TOTAL TRIP COST
// transport + (daily cost × days × travelers)
// ─────────────────────────────────────
function estimateTripCost({ dest, originKey, days, travelers, departureDate }) {
  const dist      = dest.distanceKm?.[originKey] || dest.distanceKm?.default || 1500;
  const mult      = getSeasonMult(departureDate);
  const transport = estimateTransportCost({ dest, dist, mult, days, travelers });
  const daily     = (dest.avgCostPerDay || 120) * days * Math.max(travelers, 1);
  return transport + daily;
}

function estimateTransportCost({ dest, dist, mult, days, travelers }) {
  let flightBase = 0;
  if (dist < 300)       flightBase = 0;        // drive/own car
  else if (dist < 800)  flightBase = Math.round(dist * 0.12 * mult); // train
  else if (dist < 3000) flightBase = Math.round(200 * mult);          // short-haul flight
  else                  flightBase = Math.round(550 * mult);           // long-haul

  const carCost = dest.needs_car
    ? Math.round((dest.carPricePerDay || 45) * days * mult)
    : 0;

  return (flightBase * Math.max(travelers, 1)) + carCost;
}

function getSeasonMult(dateStr) {
  if (!dateStr) return 1.1;
  const m = new Date(dateStr).getMonth() + 1;
  if ([7,8,12].includes(m)) return 1.6;
  if ([4,5,6,9,10].includes(m)) return 1.1;
  return 0.85;
}

// ─────────────────────────────────────
// STEP 2: SCORE + PICK TOP 3
// ─────────────────────────────────────
function buildProposals(req, res, pool, { originKey, days, travelers, tripType, totalBudget, departureDate, lang }) {
  const scored = pool.map(dest => {
    const estimatedTotal = estimateTripCost({ dest, originKey, days, travelers, departureDate });
    let score = 0;

    // Budget comfort (how much headroom does the user have?)
    if (totalBudget > 0) {
      const ratio = totalBudget / estimatedTotal;
      if (ratio >= 1.3)      score += 30; // comfortable
      else if (ratio >= 1.1) score += 20; // tight but fine
      else                   score += 10; // right at the limit
    } else {
      score += 20;
    }

    // Trip type match
    const tags = dest.tripTypes || [];
    if (tags.includes(tripType))                                    score += 25;
    else if (tags.some(t => relatedTypes(tripType).includes(t)))    score += 12;

    // Duration fit
    const [minD, maxD] = dest.idealDays || [5, 10];
    if (days >= minD && days <= maxD)   score += 20;
    else if (days >= minD - 1)          score += 10;

    // Distance bonus (closer = better, all else equal)
    const dist = dest.distanceKm?.[originKey] || dest.distanceKm?.default || 1500;
    if (dist < 300)       score += 10;
    else if (dist < 800)  score += 5;
    else if (dist < 2000) score += 2;

    // Randomness for variety
    score += Math.random() * 15;

    return { ...dest, _score: score, _estimatedTotal: estimatedTotal };
  });

  scored.sort((a, b) => b._score - a._score);

  const nearby = scored.filter(d => d.proximity === 'nearby');
  const far    = scored.filter(d => d.proximity === 'far');
  const result = [];
  if (nearby.length) result.push(nearby[0]);
  if (far.length)    result.push(far[0]);
  // Fill to 3
  for (const d of scored) {
    if (result.length >= 3) break;
    if (!result.find(r => r.slug === d.slug)) result.push(d);
  }

  return res.json({
    proposals: result.slice(0,3).map(d => ({
      slug:               d.slug,
      name:               d.name,
      country:            d.country,
      region:             d.region,
      proximity:          d.proximity,
      distanceKm:         d.distanceKm?.[originKey] || d.distanceKm?.default || null,
      estimatedCostTotal: Math.round(d._estimatedTotal),
      tags:               d.tripTypes || [],
      highlight:          d.highlight || '',
    }))
  });
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
