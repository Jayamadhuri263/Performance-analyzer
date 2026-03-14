/**
 * Store for analysis reports. Persists to file so reports survive server restart.
 * Used for shareable links and for loading report by id when user opens from history.
 */
const fs = require('fs');
const path = require('path');

const STORE_FILE = path.join(__dirname, 'reports.json');
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 10;

let reports = new Map();

function loadFromFile() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf8');
      const obj = JSON.parse(data);
      reports = new Map(Object.entries(obj));
    }
  } catch (err) {
    console.error('Failed to load report store:', err.message);
  }
}

function saveToFile() {
  try {
    const obj = Object.fromEntries(reports);
    fs.writeFileSync(STORE_FILE, JSON.stringify(obj), 'utf8');
  } catch (err) {
    console.error('Failed to save report store:', err.message);
  }
}

loadFromFile();

function generateId() {
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return id;
}

function save(report) {
  const id = generateId();
  reports.set(id, { ...report, reportId: id });
  saveToFile();
  return id;
}

function get(id) {
  return reports.get(id) || null;
}

module.exports = {
  save,
  get,
};
