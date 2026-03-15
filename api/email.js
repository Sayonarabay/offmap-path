module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, tripName, dest, lang='es', tripUrl, itinerary } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const subject = {
    es: `Tu viaje a ${dest} — Offsite`,
    en: `Your trip to ${dest} — Offsite`,
    fr: `Votre voyage à ${dest} — Offsite`,
  }[lang] || `Trip to ${dest} — Offsite`;

  const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;padding:40px 24px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.2em;color:#4A7C59;text-transform:uppercase;margin-bottom:8px">Offsite</div>
    <h1 style="font-size:26px;font-weight:400;color:#18181B;margin:0 0 16px">${tripName||dest}</h1>
    ${itinerary ? `<div style="background:#fff;border:1px solid #E4DDD3;border-radius:12px;padding:24px;margin-bottom:24px;font-size:14px;line-height:1.8">${itinerary}</div>` : ''}
    ${tripUrl   ? `<a href="${tripUrl}" style="display:inline-block;background:#18181B;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:700">Ver plan completo →</a>` : ''}
    <p style="font-size:11px;color:#A1A1AA;margin-top:32px">Offsite · viajes con criterio</p>
  </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    process.env.EMAIL_FROM || 'Offsite <onboarding@resend.dev>',
        to:      [email],
        subject,
        html,
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error('Resend error:', data);
      return res.status(500).json({ error: data.message || 'send failed' });
    }
    return res.json({ ok: true, id: data.id });
  } catch(e) {
    console.error('Email exception:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
