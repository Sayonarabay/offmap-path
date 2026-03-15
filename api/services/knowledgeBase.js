const fs = require('fs');
const path = require('path');

const KB_PATH = path.join(__dirname, '../../kb');

function load(relPath) {
  const full = path.join(KB_PATH, relPath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function getDestinations() {
  return load('destinations.json') || [];
}

function getItinerary(destination, days, tripType) {
  // Try exact match first: paris-7day-cultural.json
  const slug = destination.toLowerCase().replace(/\s+/g, '-');
  const filename = `${slug}-${days}day-${tripType}.json`;
  let itin = load(`itineraries/${filename}`);
  if (itin) return itin;

  // Fallback: same destination any duration
  const dir = path.join(KB_PATH, 'itineraries');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.startsWith(slug));
  if (!files.length) return null;

  // Pick closest duration
  const parsed = files.map(f => {
    const m = f.match(/-(\d+)day-/);
    return { file: f, days: m ? parseInt(m[1]) : 999 };
  }).sort((a, b) => Math.abs(a.days - days) - Math.abs(b.days - days));

  return load(`itineraries/${parsed[0].file}`);
}

function getActivities(category) {
  return load(`activities/${category}.json`) || [];
}

module.exports = { getDestinations, getItinerary, getActivities };
