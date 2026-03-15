const kb = require('./knowledgeBase');

/**
 * Assembles a complete trip object from the knowledge base.
 * AI personalization is injected separately (see aiPersonalization.js).
 */
function buildTrip({ destination, days, tripType, travelers, budget, lang }) {
  const destinations = kb.getDestinations();
  const destData = destinations.find(
    d => d.slug === destination.toLowerCase().replace(/\s+/g, '-')
  );
  if (!destData) return null;

  const itinerary = kb.getItinerary(destination, days, tripType);
  if (!itinerary) return null;

  // Trim or extend days to match user request
  const usedDays = itinerary.days.slice(0, days);

  // Estimate cost
  const costPerDay = destData.avgCostPerDay || 120;
  const estimatedCost = {
    budget: Math.round(costPerDay * 0.75 * days * travelers),
    mid:    Math.round(costPerDay * days * travelers),
    luxury: Math.round(costPerDay * 1.8 * days * travelers),
  };

  return {
    destination: destData.name,
    slug: destData.slug,
    country: destData.country,
    region: destData.region,
    tripType,
    days,
    travelers,
    lang,
    transport: destData.transport || null,
    accommodation: destData.accommodation || [],
    itinerary: usedDays,
    estimatedCost,
    tags: itinerary.tags || [],
    // AI fields — populated later by aiPersonalization.js
    title: null,
    introduction: null,
    tips: [],
  };
}

/**
 * Merge AI-generated fields into an assembled trip.
 */
function mergeAI(trip, aiResult) {
  return {
    ...trip,
    title: aiResult.title || trip.destination,
    introduction: aiResult.introduction || '',
    tips: aiResult.tips || [],
  };
}

module.exports = { buildTrip, mergeAI };
