const { getDestinations, getItinerary } = require('./knowledgeBase');

function buildTrip({ destination, days, tripType, travelers, budget, lang }) {
  const dest = getDestinations().find(d => d.slug === destination);
  if (!dest) return null;
  const itin = getItinerary(destination, days, tripType);
  if (!itin) return null;
  const cpd = dest.avgCostPerDay || 120;
  return {
    destination: dest.name,
    slug:        dest.slug,
    country:     dest.country,
    region:      dest.region,
    tripType, days, travelers, lang,
    transport:      dest.transport      || null,
    accommodation:  dest.accommodation  || [],
    itinerary:      itin.days.slice(0, days),
    tags:           itin.tags || [],
    estimatedCost: {
      budget:  Math.round(cpd * 0.75 * days * travelers),
      mid:     Math.round(cpd        * days * travelers),
      luxury:  Math.round(cpd * 1.8  * days * travelers),
    },
    title: null, introduction: null, tips: [],
  };
}

function mergeAI(trip, ai) {
  return { ...trip, title: ai.title || trip.destination, introduction: ai.introduction || '', tips: ai.tips || [] };
}

module.exports = { buildTrip, mergeAI };
