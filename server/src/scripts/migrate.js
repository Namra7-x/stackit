require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initDatabase, getPool, useMySQL } = require('../config/db');

async function run() {
  await initDatabase();
  if (!useMySQL()) {
    console.log('[migrate] File DB needs no migration. Data file auto-created on first write.');
    // ensure file exists
    require('../config/filestore').load();
    require('../config/filestore').persist();
    return;
  }
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf-8');
  // split on semicolons (naive but fine for this schema)
  const statements = sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    for (const stmt of statements) {
      try { await conn.query(stmt); }
      catch (e) {
        // ignore "already exists" for FK that may run twice
        if (/Duplicate|already exists/i.test(e.message)) continue;
        throw e;
      }
    }
    console.log('[migrate] MySQL schema applied.');
  } finally { conn.release(); process.exit(0); }
}

run().catch((e) => { console.error('[migrate] failed:', e); process.exit(1); });
