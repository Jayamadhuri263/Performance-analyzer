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

app.use('/analyze', analyzeRoutes);
app.use('/report', reportRoutes);
app.use('/history', historyRoutes);

app.listen(PORT, () => {
  console.log(`Web Performance Analyzer API running on http://localhost:${PORT}`);
});
