const express = require('express');
const path    = require('path');
const app     = express();

app.use(express.json());

app.use('/api/search-trips',  require('./api/search-trips'));
app.use('/api/generate-trip', require('./api/generate-trip'));
app.use('/api/email',         require('./api/email'));
app.use('/api/trip',          require('./api/trip'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;
