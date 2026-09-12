require('dotenv').config();
const mysql = require('mysql2/promise');

let pool = null;
let mode = 'file';
let initError = null;

function wantsMySQL() {
  return Boolean(
    process.env.DATABASE_URL ||
    process.env.DB_HOST ||
    process.env.MYSQL_HOST
  );
}

function buildSsl() {
  // Aiven uses its own CA. Best: download ca.pem from Aiven console
  // (Overview -> Connection information -> Download CA certificate) and set
  // DB_CA_CERT_PATH=./certs/ca.pem (or paste the PEM into DB_CA_CERT).
  // Without it we still use TLS but skip CA verification.
  const fs = require('fs');
  let ca;
  try {
    if (process.env.DB_CA_CERT) ca = process.env.DB_CA_CERT.replace(/\\n/g, '\n');
    else if (process.env.DB_CA_CERT_PATH && fs.existsSync(process.env.DB_CA_CERT_PATH)) {
      ca = fs.readFileSync(process.env.DB_CA_CERT_PATH, 'utf-8');
    }
  } catch {}
  if (ca) return { rejectUnauthorized: true, ca };
  console.warn('[db] No CA certificate configured (DB_CA_CERT_PATH). Using TLS without CA verification.');
  return { rejectUnauthorized: false };
}

function buildConfig() {
  if (process.env.DATABASE_URL) {
    // mysql://user:pass@host:port/db?ssl-mode=REQUIRED
    // mysql2 warns on unknown options like ssl-mode, so strip the query
    // and enforce TLS explicitly (required by Aiven).
    const u = new URL(process.env.DATABASE_URL);
    u.search = '';
    return {
      uri: u.toString(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: process.env.DB_SSL === 'false' ? undefined : buildSsl(),
      timezone: 'Z'
    };
  }
  return {
    host: process.env.DB_HOST || process.env.MYSQL_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Aiven requires TLS. mysql2 enables TLS when ssl object is set.
    ssl: process.env.DB_SSL === 'false' ? undefined : buildSsl(),
    timezone: 'Z',
    dateStrings: false
  };
}

async function initDatabase() {
  if (!wantsMySQL()) {
    mode = 'file';
    require('./filestore').load();
    console.log('[db] Using local file database (no MySQL env configured).');
    return { mode };
  }
  try {
    const cfg = buildConfig();
    pool = typeof cfg === 'string' ? mysql.createPool(cfg) : mysql.createPool(cfg);
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    mode = 'mysql';
    console.log('[db] Connected to MySQL.');
    return { mode };
  } catch (e) {
    initError = e;
    mode = 'file';
    console.warn('[db] MySQL connection failed, falling back to file DB:', e.message);
    require('./filestore').load();
    return { mode, error: e.message };
  }
}

function getPool() {
  return pool;
}
function getMode() {
  return mode;
}
function useMySQL() {
  return mode === 'mysql' && pool;
}

module.exports = { initDatabase, getPool, getMode, useMySQL, wantsMySQL, getInitError: () => initError };
