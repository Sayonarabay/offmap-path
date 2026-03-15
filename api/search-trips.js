const { getDestinations } = require('./services/knowledgeBase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { budget=0, budgetPer='total', days=7, travelers=2, tripType='cultural' } = req.body;

  const all = getDestinations();
  if (!all.length) return res.status(500).json({ error: 'KB not found' });

  const bppd = budgetPer === 'total'
    ? budget / Math.max(travelers,1) / Math.max(days,1)
    : budget / Math.max(days,1);

  const affordable = all.filter(d => !budget || (d.avgCostPerDay||120) <= bppd * 1.5);
  const score = d => (d.tripTypes||[]).includes(tripType) ? 2 : 1;
  const pick  = (list, fb) => [...(list.length ? list : fb)].sort((a,b)=>score(b)-score(a))[0] || null;

  const nearby    = affordable.filter(d => d.proximity==='nearby' && d.type!=='roadtrip');
  const far       = affordable.filter(d => d.proximity==='far');
  const roadtrips = affordable.filter(d => d.type==='roadtrip');

  const proposals = [pick(nearby,affordable), pick(far,affordable), pick(roadtrips,affordable)]
    .filter(Boolean)
    .map(d => ({
      slug: d.slug, name: d.name, country: d.country, region: d.region,
      proximity: d.type==='roadtrip' ? 'roadtrip' : d.proximity,
      estimatedCostTotal: Math.round((d.avgCostPerDay||120)*days*travelers),
      tags: d.tripTypes||[], highlight: d.highlight||'',
    }));

  res.json({ proposals });
};
