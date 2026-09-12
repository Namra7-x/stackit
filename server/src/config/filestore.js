const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const emptyDB = () => ({
  counters: { users: 0, questions: 0, answers: 0, tags: 0, votes: 0, notifications: 0, comments: 0 },
  users: [],
  questions: [],
  answers: [],
  tags: [],
  question_tags: [],
  votes: [],
  notifications: [],
  comments: []
});

let cache = null;

function load() {
  if (cache) return cache;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      cache = { ...emptyDB(), ...JSON.parse(raw || '{}') };
      // ensure arrays exist
      for (const k of Object.keys(emptyDB())) if (!cache[k]) cache[k] = emptyDB()[k];
      return cache;
    }
  } catch (e) {
    console.warn('[store] failed to load file db, using memory:', e.message);
  }
  cache = emptyDB();
  return cache;
}

function persist() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) {
    console.warn('[store] persist failed:', e.message);
  }
}

function nextId(table) {
  const db = load();
  db.counters[table] = (db.counters[table] || 0) + 1;
  persist();
  return db.counters[table];
}

function nowISO() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function uid(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

module.exports = { load, persist, nextId, nowISO, uid, DATA_FILE };
