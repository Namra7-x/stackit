require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initDatabase, useMySQL, getPool } = require('../config/db');
const db = require('../db');
const { cleanRich } = require('../utils/sanitize');

async function seedFile() {
  const file = require('../config/filestore');
  const store = file.load();
  if (store.users.length) { console.log('[seed] file DB already has data, skipping.'); return; }

  const pw = await bcrypt.hash('password123', 10);
  const adminPw = await bcrypt.hash('admin123', 10);
  const mkUser = (username, email, hash, role) => {
    const id = file.nextId('users');
    const now = new Date().toISOString();
    const u = { id, username, email, password_hash: hash, role, created_at: now, updated_at: now };
    store.users.push(u);
    return u;
  };
  const admin = mkUser('admin', 'admin@stackit.local', adminPw, 'admin');
  const alice = mkUser('alice', 'alice@example.com', pw, 'user');
  const bob = mkUser('bob_dev', 'bob@example.com', pw, 'user');
  const cara = mkUser('cara', 'cara@example.com', pw, 'user');

  const mkTag = (name) => {
    const id = file.nextId('tags');
    const t = { id, name, created_at: new Date().toISOString() };
    store.tags.push(t);
    return t;
  };
  const tReact = mkTag('react'); const tJwt = mkTag('jwt'); const tJs = mkTag('javascript'); const tNode = mkTag('node.js'); const tSql = mkTag('sql');

  const mkQ = (user, title, desc, tags) => {
    const id = file.nextId('questions');
    const now = new Date(Date.now() - Math.random() * 5 * 864e5).toISOString();
    store.questions.push({ id, user_id: user.id, title, description: desc, accepted_answer_id: null, created_at: now, updated_at: now });
    for (const t of tags) store.question_tags.push({ question_id: id, tag_id: t.id });
    return id;
  };
  const q1 = mkQ(alice, 'How to join 2 columns in a data set to make a separate column in SQL?',
    '<p>I do not know the code for it as I am a beginner. As an example what I need to do is like there is a column 1 containing <strong>First name</strong>, and column 2 consists of <em>last name</em>. I want a column to combine them.</p><pre><code>SELECT first_name, last_name FROM users;</code></pre>', [tSql, tJs]);
  const q2 = mkQ(bob, 'How does JWT authentication work in a React + Express app?',
    '<p>I am building a <strong>React</strong> frontend with an <strong>Express</strong> backend. Where should I store the JWT and how do I send it with each request?</p><ul><li>localStorage vs cookies?</li><li>How to handle expiry?</li></ul>', [tReact, tJwt, tNode]);
  const q3 = mkQ(cara, 'React useEffect runs twice in development — is this a bug?',
    '<p>My <code>useEffect</code> fetches data twice in dev but once in production. Why does this happen with <strong>StrictMode</strong>?</p>', [tReact, tJs]);

  const mkA = (qid, user, html, accepted = false) => {
    const id = file.nextId('answers');
    const now = new Date().toISOString();
    store.answers.push({ id, question_id: qid, user_id: user.id, content: html, is_accepted: accepted ? 1 : 0, created_at: now, updated_at: now });
    if (accepted) { const q = store.questions.find((x) => x.id === qid); if (q) q.accepted_answer_id = id; }
    return id;
  };
  const a1 = mkA(q1, bob, '<p><strong>The || Operator</strong> (Postgres/Oracle):</p><pre><code>SELECT first_name || \' \' || last_name AS full_name FROM users;</code></pre><p><strong>The CONCAT function</strong> (MySQL):</p><pre><code>SELECT CONCAT(first_name, \' \', last_name) AS full_name FROM users;</code></pre>', true);
  mkA(q1, cara, '<p><strong>The + Operator</strong> (SQL Server):</p><pre><code>SELECT first_name + \' \' + last_name AS full_name FROM users;</code></pre>', false);
  mkA(q2, alice, '<p>Store the token in memory or <code>localStorage</code>, send it as <code>Authorization: Bearer &lt;token&gt;</code>. Verify it in Express middleware on every protected route. Use short expiry + refresh flow for production.</p>', false);

  store.votes.push({ id: file.nextId('votes'), answer_id: a1, user_id: alice.id, vote_type: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  store.comments.push({ id: file.nextId('comments'), answer_id: a1, user_id: alice.id, content: 'Thanks @bob_dev, CONCAT worked for me!', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  store.notifications.push({ id: file.nextId('notifications'), recipient_user_id: alice.id, actor_user_id: bob.id, type: 'ANSWER_POSTED', message: 'bob_dev answered your question: "How to join 2 columns..."', related_question_id: q1, related_answer_id: a1, related_comment_id: null, is_read: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  file.persist();
  console.log('[seed] file DB seeded. admin@stackit.local / admin123, alice@example.com / password123');
}

async function seedMySQL() {
  const pool = getPool();
  const [[c]] = await pool.query('SELECT COUNT(*) as n FROM users');
  if (c.n > 0) { console.log('[seed] MySQL already has users, skipping.'); process.exit(0); }
  const pw = await bcrypt.hash('password123', 10);
  const adminPw = await bcrypt.hash('admin123', 10);
  const [a1] = await pool.execute('INSERT INTO users (username,email,password_hash,role) VALUES (?,?,?,?)', ['admin', 'admin@stackit.local', adminPw, 'admin']);
  const [a2] = await pool.execute('INSERT INTO users (username,email,password_hash,role) VALUES (?,?,?,?)', ['alice', 'alice@example.com', pw, 'user']);
  const [a3] = await pool.execute('INSERT INTO users (username,email,password_hash,role) VALUES (?,?,?,?)', ['bob_dev', 'bob@example.com', pw, 'user']);
  for (const t of ['react', 'jwt', 'javascript', 'node.js', 'sql']) await pool.execute('INSERT IGNORE INTO tags (name) VALUES (?)', [t]);
  const [q1] = await pool.execute('INSERT INTO questions (user_id,title,description) VALUES (?,?,?)', [a2.insertId, 'How to join 2 columns in a data set to make a separate column in SQL?', '<p>Combine <strong>first_name</strong> and <strong>last_name</strong> into full_name.</p>']);
  const [q2] = await pool.execute('INSERT INTO questions (user_id,title,description) VALUES (?,?,?)', [a3.insertId, 'How does JWT authentication work in a React + Express app?', '<p>Where should I store the JWT?</p>']);
  const [[sqlTag]] = await pool.query("SELECT id FROM tags WHERE name='sql'");
  const [[jsTag]] = await pool.query("SELECT id FROM tags WHERE name='javascript'");
  await pool.execute('INSERT IGNORE INTO question_tags VALUES (?,?)', [q1.insertId, sqlTag.id]);
  await pool.execute('INSERT IGNORE INTO question_tags VALUES (?,?)', [q1.insertId, jsTag.id]);
  await pool.execute('INSERT INTO answers (question_id,user_id,content,is_accepted) VALUES (?,?,?,1)', [q1.insertId, a3.insertId, '<p>Use <code>CONCAT(first_name, " ", last_name)</code> in MySQL.</p>']);
  await pool.execute('UPDATE questions SET accepted_answer_id=LAST_INSERT_ID() WHERE id=?', [q1.insertId]);
  console.log('[seed] MySQL seeded.');
  process.exit(0);
}

(async () => {
  await initDatabase();
  if (useMySQL()) await seedMySQL();
  else { await seedFile(); }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
