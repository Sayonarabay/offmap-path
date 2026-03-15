const store = new Map();

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { tripId, data } = req.body;
    if (!tripId) return res.status(400).json({ error: 'tripId required' });
    store.set(tripId, data);
    return res.json({ ok: true });
  }
  if (req.method === 'GET') {
    const trip = store.get(req.query.id);
    return trip ? res.json({ trip }) : res.status(404).json({ error: 'not found' });
  }
  res.status(405).end();
};
