/**
 * In-memory list of analysis history for listing and comparison.
 * Each entry: { reportId, url, title?, createdAt, score, grade }.
 */
const MAX_ENTRIES = 100;
const entries = [];

function add(entry) {
  entries.unshift({
    reportId: entry.reportId,
    url: entry.url,
    title: entry.title || '',
    createdAt: entry.createdAt || new Date().toISOString(),
    score: entry.score,
    grade: entry.grade,
  });
  if (entries.length > MAX_ENTRIES) {
    entries.pop();
  }
}

function getAll() {
  return [...entries];
}

module.exports = {
  add,
  getAll,
};
