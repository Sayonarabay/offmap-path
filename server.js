require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const { searchTrips }  = require('./api/routes/searchTrips');
const { generateTrip } = require('./api/routes/generateTrip');
const { sendEmail }    = require('./api/routes/sendEmail');
const { saveTrip, loadTrip } = require('./api/routes/trip');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API routes ──
app.post('/api/search-trips',  searchTrips);
app.post('/api/generate-trip', generateTrip);
app.post('/api/email',         sendEmail);
app.post('/api/trip',          saveTrip);
app.get('/api/trip',           loadTrip);

// ── SPA fallback ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Offsite running on http://localhost:${PORT}`);
});

module.exports = app;
