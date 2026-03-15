const fs   = require('fs');
const path = require('path');

const KB = path.join(__dirname, '..', '..', 'kb');

function load(rel) {
  const p = path.join(KB, rel);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function getDestinations() { return load('destinations.json') || []; }

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

module.exports = { getDestinations, getItinerary };
