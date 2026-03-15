// Simple in-memory store — replace with a DB (Redis, Supabase, etc.) for production
const store = new Map();

async function saveTrip(req, res) {
  const { tripId, data } = req.body;
  if (!tripId) return res.status(400).json({ error: 'tripId required' });
  store.set(tripId, { ...data, savedAt: new Date().toISOString() });
  return res.json({ ok: true, tripId });
}

async function loadTrip(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });
  const trip = store.get(id);
  if (!trip) return res.status(404).json({ error: 'not found' });
  return res.json({ trip });
}

module.exports = { saveTrip, loadTrip };
