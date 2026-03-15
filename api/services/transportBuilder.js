// ─────────────────────────────────────
// TRANSPORT BUILDER
// Calculates origin→destination transport based on distance,
// adds rental car if destination needs it,
// and applies seasonal price multipliers.
// ─────────────────────────────────────

const SEASON_MULTIPLIER = {
  high:   1.6,  // jul, aug, dec
  medium: 1.1,  // apr, may, jun, sep, oct
  low:    0.85, // jan, feb, mar, nov
};

function getSeason(dateStr) {
  if (!dateStr) return 'medium';
  const month = new Date(dateStr).getMonth() + 1; // 1-12
  if ([7, 8, 12].includes(month))          return 'high';
  if ([4, 5, 6, 9, 10].includes(month))    return 'medium';
  return 'low';
}

function getMultiplier(dateStr) {
  return SEASON_MULTIPLIER[getSeason(dateStr)];
}

// ─────────────────────────────────────
// MAIN: build transport options for a trip
// ─────────────────────────────────────
function buildTransportOptions({ origin, dest, departureDate, days }) {
  const dist     = dest.distanceKm?.[normalizeOrigin(origin)] || dest.distanceKm?.default || 1500;
  const mult     = getMultiplier(departureDate);
  const season   = getSeason(departureDate);
  const options  = [];

  // ── ORIGIN → DESTINATION ──
  if (dist < 300) {
    // Drive or train — no flight needed
    options.push(buildCar({
      id:      'origin-drive',
      icon:    '🚗',
      label:   { es: `Coche propio — ${origin} → ${dest.name}`, en: `Self drive — ${origin} → ${dest.name}`, fr: `En voiture — ${origin} → ${dest.name}` },
      desc:    { es: `~${dist}km, aproximadamente ${Math.round(dist/90)} horas de conducción.`, en: `~${dist}km, approximately ${Math.round(dist/90)} hours drive.`, fr: `~${dist}km, environ ${Math.round(dist/90)} heures de route.` },
      priceEst: 0,
      url:     '',
    }));
    if (dest.hasTrain) {
      options.push(buildTrain({ dest, origin, dist, mult }));
    }
  } else if (dist < 800) {
    // Train OR flight
    if (dest.hasTrain) {
      options.push(buildTrain({ dest, origin, dist, mult }));
    }
    options.push(buildFlight({ dest, origin, dist, mult }));
  } else {
    // Flight only
    options.push(buildFlight({ dest, origin, dist, mult }));
  }

  // ── RENTAL CAR AT DESTINATION ──
  if (dest.needs_car) {
    const carBase = dest.carPricePerDay || 45;
    const carPrice = Math.round(carBase * days * mult);
    options.push({
      id:       'dest-car',
      icon:     '🚗',
      label:    { es: `Coche de alquiler en ${dest.name}`, en: `Rental car in ${dest.name}`, fr: `Location de voiture à ${dest.name}` },
      desc:     { es: `Imprescindible para moverse. ~€${carBase}/día × ${days} días. Temporada: ${seasonLabel(season,'es')}.`, en: `Essential for getting around. ~€${carBase}/day × ${days} days. Season: ${seasonLabel(season,'en')}.`, fr: `Indispensable pour se déplacer. ~€${carBase}/jour × ${days} jours. Saison: ${seasonLabel(season,'fr')}.` },
      url:      `https://www.rentalcars.com/?destinationName=${encodeURIComponent(dest.name)}`,
      priceEst: carPrice,
    });
  }

  return { options, season, distanceKm: dist };
}

// ─────────────────────────────────────
// HELPERS
// ─────────────────────────────────────
function buildFlight({ dest, origin, dist, mult }) {
  const base   = dist < 800 ? 80 : dist < 3000 ? 200 : 550;
  const price  = Math.round(base * mult);
  const hours  = dist < 800 ? 2 : dist < 3000 ? 3.5 : 11;
  return {
    id:       'origin-flight',
    icon:     '✈️',
    label:    { es: `Vuelo — ${origin} → ${dest.name}`, en: `Flight — ${origin} → ${dest.name}`, fr: `Vol — ${origin} → ${dest.name}` },
    desc:     { es: `~${hours}h de vuelo. Precio orientativo ida y vuelta por persona.`, en: `~${hours}h flight. Indicative return price per person.`, fr: `~${hours}h de vol. Prix indicatif aller-retour par personne.` },
    url:      dest.flightUrl || `https://www.skyscanner.es/vuelos/${encodeURIComponent(dest.name.toLowerCase())}`,
    priceEst: price,
  };
}

function buildTrain({ dest, origin, dist, mult }) {
  const base  = Math.round(dist * 0.12);
  const price = Math.round(base * mult);
  const hours = Math.round(dist / 200 * 10) / 10;
  return {
    id:       'origin-train',
    icon:     '🚂',
    label:    { es: `Tren — ${origin} → ${dest.name}`, en: `Train — ${origin} → ${dest.name}`, fr: `Train — ${origin} → ${dest.name}` },
    desc:     { es: `~${hours}h en tren. Precio orientativo ida y vuelta por persona.`, en: `~${hours}h by train. Indicative return price per person.`, fr: `~${hours}h en train. Prix indicatif aller-retour par personne.` },
    url:      dest.trainUrl || `https://www.thetrainline.com/search?destination=${encodeURIComponent(dest.name)}`,
    priceEst: price,
  };
}

function buildCar({ id, icon, label, desc, priceEst, url }) {
  return { id, icon, label, desc, priceEst, url };
}

function normalizeOrigin(origin) {
  return (origin || '').toLowerCase().trim()
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u')
    .replace(/\s+/g, '-');
}

function seasonLabel(season, lang) {
  const L = {
    high:   { es:'temporada alta',   en:'high season',   fr:'haute saison'   },
    medium: { es:'temporada media',  en:'mid season',    fr:'mi-saison'      },
    low:    { es:'temporada baja',   en:'low season',    fr:'basse saison'   },
  };
  return (L[season] || L.medium)[lang];
}

module.exports = { buildTransportOptions, getSeason };
