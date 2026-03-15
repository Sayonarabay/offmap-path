// LOCAL DEV ONLY — Vercel uses api/routes/*.js directly
require('dotenv').config();
const express = require('express');
const path    = require('path');
const app     = express();

app.use(require('cors')());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/search-trips',  require('./api/routes/searchTrips'));
app.post('/api/generate-trip', require('./api/routes/generateTrip'));
app.post('/api/email',         require('./api/routes/sendEmail'));
app.post('/api/trip',          require('./api/routes/trip'));
app.get('/api/trip',           require('./api/routes/trip'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(process.env.PORT || 3000, () =>
  console.log('Offsite → http://localhost:' + (process.env.PORT || 3000))
);
