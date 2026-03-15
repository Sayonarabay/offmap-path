// In-memory store — swap for Redis/Supabase in production
const store = new Map();

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    const { tripId, data } = req.body;
    if (!tripId) return res.status(400).json({ error: 'tripId required' });
    store.set(tripId, { ...data, savedAt: new Date().toISOString() });
    return res.json({ ok: true, tripId });
  }
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    const trip = store.get(id);
    if (!trip) return res.status(404).json({ error: 'not found' });
    return res.json({ trip });
  }
  return res.status(405).end();
};
