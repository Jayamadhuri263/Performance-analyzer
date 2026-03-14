const historyStore = require('../store/historyStore');

/**
 * GET /history - Returns list of past analyses (reportId, url, createdAt, score, grade).
 */
function getHistory(req, res) {
  const list = historyStore.getAll();
  return res.json(list);
}

module.exports = {
  getHistory,
};
