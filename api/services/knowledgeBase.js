const fs   = require('fs');
const path = require('path');

const KB = path.join(__dirname, '..', '..', 'kb');

function load(rel) {
  const p = path.join(KB, rel);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function getDestinations() { return load('destinations.json') || []; }

function getActivities(destinationSlug) {
  // Try new flat activities.json first
  const all = load('activities.json');
  if (all) return all.filter(a => a.destination === destinationSlug);
  return [];
}

function getCities(destinationSlug) {
  const all = load('cities.json') || [];
  return all.filter(c => c.destination === destinationSlug)
            .sort((a, b) => (a.order||0) - (b.order||0));
}

function getTripTypes() {
  return load('trip-types.json') || {};
}

// Legacy: static itinerary templates (kept for destinations without activities yet)
function getItinerary(slug, days, tripType) {
  let itin = load(`itineraries/${slug}-${days}day-${tripType}.json`);
  if (itin) return itin;
  const dir = path.join(KB, 'itineraries');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.startsWith(slug));
  if (!files.length) return null;
  const sorted = files
    .map(f => { const m = f.match(/-(\d+)day-/); return { f, d: m ? parseInt(m[1]) : 999 }; })
    .sort((a, b) => Math.abs(a.d - days) - Math.abs(b.d - days));
  return load(`itineraries/${sorted[0].f}`);
}

module.exports = { getDestinations, getActivities, getCities, getTripTypes, getItinerary };
