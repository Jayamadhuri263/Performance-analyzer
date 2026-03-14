const reportStore = require('../store/reportStore');
const historyStore = require('../store/historyStore');

/**
 * GET /report/:id - Returns a previously saved analysis report by id.
 */
function getReport(req, res) {
  const { id } = req.params;
  const report = reportStore.get(id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found', reportId: id });
  }
  return res.json(report);
}

/**
 * POST /report - Save a report and return its shareable id.
 * Use when the client has report data but no reportId (e.g. analyze response missed it).
 */
function saveReport(req, res) {
  try {
    const report = req.body;
    if (!report || typeof report !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid report body' });
    }
    const reportId = reportStore.save(report);
    historyStore.add({
      reportId,
      url: report.url,
      createdAt: new Date().toISOString(),
      score: report.score,
      grade: report.grade,
    });
    return res.status(201).json({ reportId });
  } catch (err) {
    console.error('Save report error:', err);
    return res.status(500).json({ error: 'Failed to save report' });
  }
}

module.exports = {
  getReport,
  saveReport,
};
