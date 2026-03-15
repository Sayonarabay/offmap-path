const { getDestinations, getActivities, getCities, getTripTypes } = require('./knowledgeBase');

// ─────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────
function buildTrip({ destination, days, tripType, travelers, budget, lang }) {
  const destinations = getDestinations();
  const dest = destinations.find(d => d.slug === destination);
  if (!dest) { console.error('[KB] destination not found:', destination); return null; }

  const activities = getActivities(destination);
  const cities     = getCities(destination);
  const tripRules  = getTripTypes()[tripType] || getTripTypes()['cultural'];

  console.log(`[KB] ${destination}: ${activities.length} activities, ${cities.length} cities, tripType=${tripType}`);

  if (!activities.length) { console.error('[KB] No activities found for:', destination); return null; }

  const isRoadtrip = dest.type === 'roadtrip';

  // Build itinerary
  const itinerary = isRoadtrip
    ? buildRoadtripItinerary({ cities, activities, days, tripRules, lang })
    : buildCityItinerary({ activities, days, tripRules, lang, destName: dest.name });

  if (!itinerary?.length) return null;

  const cpd = dest.avgCostPerDay || 120;
  return {
    destination:   dest.name,
    slug:          dest.slug,
    country:       dest.country,
    region:        dest.region,
    tripType, days, travelers, lang,
    transport:     dest.transport     || null,
    accommodation: dest.accommodation || [],
    cities:        cities.map(c => ({ id: c.id, name: c.name, nights: c.nights })),
    itinerary,
    tags:          tripRules.preferred_tags.slice(0, 4),
    estimatedCost: {
      budget:  Math.round(cpd * 0.75 * days * travelers),
      mid:     Math.round(cpd        * days * travelers),
      luxury:  Math.round(cpd * 1.8  * days * travelers),
    },
    title: null, introduction: null, tips: [],
  };
}

// ─────────────────────────────────────
// ROADTRIP: distribute cities across days
// ─────────────────────────────────────
function buildRoadtripItinerary({ cities, activities, days, tripRules, lang }) {
  if (!cities.length) return [];

  // Scale city nights proportionally to requested days
  const totalNights = cities.reduce((s, c) => s + (c.nights || 1), 0);
  const scale       = days / totalNights;
  const scaled      = cities.map(c => ({
    ...c,
    actualNights: Math.max(1, Math.round((c.nights || 1) * scale)),
  }));

  // Fix rounding so total === days
  const diff = days - scaled.reduce((s, c) => s + c.actualNights, 0);
  if (diff !== 0) scaled[scaled.length - 1].actualNights += diff;

  const itinerary = [];
  let dayNum = 1;

  scaled.forEach(city => {
    const cityActs = activities.filter(a => a.city === city.id);
    const pool     = scoreAndSort(cityActs, tripRules);
    const used     = new Set();

    for (let n = 0; n < city.actualNights; n++) {
      const isFirst = n === 0;
      const isLast  = n === city.actualNights - 1;
      const dayActs = pickActivities({ pool, used, isFirst, isLast, lang });

      const cityName = typeof city.name === 'object'
        ? (city.name[lang] || city.name.en || city.name.es)
        : city.name;

      itinerary.push({
        day:       dayNum++,
        city:      city.id,
        title:     buildDayTitle(cityName, dayActs, n, lang),
        theme:     dayTheme(dayActs, lang),
        morning:   formatActivity(dayActs[0], lang),
        afternoon: formatActivity(dayActs[1], lang),
        evening:   formatActivity(dayActs[2], lang),
        gem:       pickGem(pool, used, lang),
        activities: dayActs.filter(Boolean).map(a => a.id),
      });
    }
  });

  return itinerary;
}

// ─────────────────────────────────────
// CITY TRIP: distribute activities across days
// ─────────────────────────────────────
function buildCityItinerary({ activities, days, tripRules, lang, destName }) {
  const pool = scoreAndSort(activities, tripRules);
  const used = new Set();
  const itinerary = [];

  for (let d = 0; d < days; d++) {
    const isFirst = d === 0;
    const isLast  = d === days - 1;
    const dayActs = pickActivities({ pool, used, isFirst, isLast, lang });

    itinerary.push({
      day:       d + 1,
      title:     buildDayTitle(destName, dayActs, d, lang),
      theme:     dayTheme(dayActs, lang),
      morning:   formatActivity(dayActs[0], lang),
      afternoon: formatActivity(dayActs[1], lang),
      evening:   formatActivity(dayActs[2], lang),
      gem:       pickGem(pool, used, lang),
      activities: dayActs.filter(Boolean).map(a => a.id),
    });
  }

  return itinerary;
}

// ─────────────────────────────────────
// SCORING: rank activities by trip type fit
// ─────────────────────────────────────
function scoreAndSort(activities, tripRules) {
  return activities
    .map(a => ({
      ...a,
      _score: scoreFit(a, tripRules) + (a.iconic ? 5 : 0) + Math.random() * 2,
    }))
    .sort((a, b) => b._score - a._score);
}

function scoreFit(activity, tripRules) {
  const tags    = activity.tags || [];
  const matches = tags.filter(t => tripRules.preferred_tags.includes(t)).length;
  const avoids  = tags.filter(t => tripRules.avoid_tags?.includes(t)).length;
  return matches * 2 - avoids * 3;
}

// ─────────────────────────────────────
// PICK 3 ACTIVITIES FOR A DAY
// Rules: 1 iconic, morning/afternoon/evening spread, no duplicates
// ─────────────────────────────────────
function pickActivities({ pool, used, isFirst, isLast, lang }) {
  const slots  = ['morning', 'afternoon', 'evening'];
  const result = [];
  const needIconic = !isFirst;
  let iconicAdded  = false;

  for (const slot of slots) {
    // First try: activities that specifically list this time slot
    let candidates = pool.filter(a =>
      !used.has(a.id) &&
      !result.includes(a) &&
      (a.time_of_day?.includes(slot))
    );

    // Fallback: any unused activity with no time constraint, or any slot
    if (!candidates.length) {
      candidates = pool.filter(a =>
        !used.has(a.id) &&
        !result.includes(a)
      );
    }

    if (!candidates.length) { result.push(null); continue; }

    let pick = null;
    if (slot === 'afternoon' && needIconic && !iconicAdded) {
      pick = candidates.find(a => a.iconic) || candidates[0];
      if (pick?.iconic) iconicAdded = true;
    } else {
      pick = candidates[0];
    }

    if (pick) { result.push(pick); used.add(pick.id); }
    else result.push(null);
  }

  return result;
}

// ─────────────────────────────────────
// GEM: pick a lesser-known activity not yet used
// ─────────────────────────────────────
function pickGem(pool, used, lang) {
  const gem = pool.find(a => !used.has(a.id) && !a.iconic && (a.price_eur || 0) === 0);
  if (!gem) return null;
  used.add(gem.id);
  const name = typeof gem.name === 'object' ? (gem.name[lang] || gem.name.en) : gem.name;
  const desc = typeof gem.desc === 'object' ? (gem.desc[lang] || gem.desc.en) : (gem.desc || '');
  return `${name}: ${desc}`;
}

// ─────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────
function formatActivity(act, lang) {
  if (!act) return null;
  const name = typeof act.name === 'object' ? (act.name[lang] || act.name.en || act.name.es) : act.name;
  const desc = typeof act.desc === 'object' ? (act.desc[lang] || act.desc.en || act.desc.es) : (act.desc || '');
  const price = act.price_eur > 0 ? ` (€${act.price_eur})` : ' (gratis)';
  return `**${name}**${price} — ${desc}`;
}

function buildDayTitle(place, acts, dayIndex, lang) {
  const iconic = acts.find(a => a?.iconic);
  const L = { es: ['Llegada a','Explorando','Un día en','La esencia de','Último día en'],
               en: ['Arrival in','Exploring','A day in','The soul of','Last day in'],
               fr: ['Arrivée à','Explorer','Une journée à','L\'essence de','Dernier jour à'] };
  const labels = L[lang] || L.en;
  const prefix = labels[Math.min(dayIndex, labels.length - 1)];
  if (iconic) {
    const n = typeof iconic.name === 'object' ? (iconic.name[lang] || iconic.name.en) : iconic.name;
    return `${n}`;
  }
  return `${prefix} ${place}`;
}

function dayTheme(acts, lang) {
  const tags = acts.flatMap(a => a?.tags || []);
  const freq = {};
  tags.forEach(t => freq[t] = (freq[t]||0) + 1);
  const top  = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'culture';
  const themes = {
    culture:   {es:'cultura e historia',en:'culture & history',fr:'culture et histoire'},
    foodie:    {es:'gastronomía local',en:'local gastronomy',fr:'gastronomie locale'},
    nature:    {es:'naturaleza',en:'nature',fr:'nature'},
    nightlife: {es:'vida nocturna',en:'nightlife',fr:'vie nocturne'},
    views:     {es:'vistas y paseos',en:'views & walks',fr:'vues et promenades'},
    adventure: {es:'aventura',en:'adventure',fr:'aventure'},
  };
  return (themes[top] || themes.culture)[lang] || (themes[top] || themes.culture).en;
}

function mergeAI(trip, ai) {
  return { ...trip, title: ai.title || trip.destination, introduction: ai.introduction || '', tips: ai.tips || [] };
}

module.exports = { buildTrip, mergeAI };
