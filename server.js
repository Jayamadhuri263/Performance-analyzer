require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const analyzeRoutes = require('./routes/analyzeRoutes');
const reportRoutes = require('./routes/reportRoutes');
const historyRoutes = require('./routes/historyRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Root: so GET / returns 200 (health checks, or someone opening the API URL in a browser)
app.get('/', (req, res) => {
  res.json({
    name: 'Web Performance Analyzer API',
    author: 'Jaya Madhuri Ganjikunta',
    version: '1.0',
    description: 'Backend API for the Web Performance Analyzer. Analyzes page load performance, resources, and metrics via headless browser(Browserless).',
    frontendUrl: 'https://web-performance-analyzer-f257b.web.app/',
    contact: 'jayamadhuri263@gmail.com',
    endpoints: { analyze: 'POST /analyze', report: 'GET /report/:id', history: 'GET /history' },
  });
});

app.use('/analyze', analyzeRoutes);
app.use('/report', reportRoutes);
app.use('/history', historyRoutes);

app.listen(PORT, () => {
  console.log(`Web Performance Analyzer API running on http://localhost:${PORT}`);
});
