const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, tripName, dest, lang = 'es', tripUrl, itinerary } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth:   { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  const subject = { es: `Tu viaje a ${dest} — Offsite`, en: `Your trip to ${dest} — Offsite`, fr: `Votre voyage à ${dest} — Offsite` }[lang] || `Trip to ${dest}`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="font-family:Georgia,serif;background:#FAFAF7;margin:0;padding:0">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">
    <div style="font-size:13px;font-weight:700;letter-spacing:.2em;color:#4A7C59;text-transform:uppercase;margin-bottom:8px">Offsite</div>
    <h1 style="font-size:28px;font-weight:400;color:#1C1C2E;margin:0 0 8px">${tripName || dest}</h1>
    ${itinerary ? `<div style="background:#fff;border:1px solid #E5DFD3;border-radius:12px;padding:24px;margin:24px 0;font-size:14px;color:#1C1C2E;line-height:1.8">${itinerary}</div>` : ''}
    ${tripUrl  ? `<a href="${tripUrl}" style="display:inline-block;background:#1C1C2E;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:700">Ver plan completo →</a>` : ''}
    <p style="font-size:12px;color:#9CA3AF;margin-top:32px">Offsite · viajes con criterio</p>
  </div>
</body></html>`;

  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to: email, subject, html });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Email error:', err.message);
    return res.status(500).json({ error: 'Email send failed' });
  }
};
