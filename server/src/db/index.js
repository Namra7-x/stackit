const { getPool, useMySQL } = require('../config/db');
const file = require('../config/filestore');

function stripPassword(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

function normTag(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, '-').slice(0, 40);
}

/* ---------------- FILE helpers ---------------- */
function fdb() { return file.load(); }
function save() { file.persist(); }

/* ---------------- USERS ---------------- */
async function createUser({ username, email, password_hash, role = 'user' }) {
  if (useMySQL()) {
    const pool = getPool();
    const [r] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?,?,?,?)',
      [username, email, password_hash, role]
    );
    return findUserById(r.insertId);
  }
  const db = fdb();
  const id = file.nextId('users');
  const now = new Date().toISOString();
  const user = { id, username, email, password_hash, role, created_at: now, updated_at: now };
  db.users.push(user);
  save();
  return stripPassword(user);
}

async function findUserByEmail(email) {
  if (useMySQL()) {
    const [rows] = await getPool().execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  }
  return fdb().users.find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}
async function findUserByUsername(username) {
  if (useMySQL()) {
    const [rows] = await getPool().execute('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
    return rows[0] || null;
  }
  return fdb().users.find((u) => u.username.toLowerCase() === String(username).toLowerCase()) || null;
}
async function findUserById(id) {
  if (useMySQL()) {
    const [rows] = await getPool().execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }
  return fdb().users.find((u) => String(u.id) === String(id)) || null;
}
async function findUsersByUsernames(names) {
  if (!names.length) return [];
  if (useMySQL()) {
    const [rows] = await getPool().query(`SELECT * FROM users WHERE username IN (${names.map(() => '?').join(',')})`, names);
    return rows;
  }
  const set = new Set(names.map((n) => n.toLowerCase()));
  return fdb().users.filter((u) => set.has(u.username.toLowerCase()));
}

/* ---------------- TAGS ---------------- */
async function ensureTagIds(tagNames, conn = null) {
  const names = [...new Set(tagNames.map(normTag).filter(Boolean))];
  if (!names.length) return [];
  if (useMySQL()) {
    const pool = getPool();
    const ex = conn || pool;
    const ids = [];
    for (const n of names) {
      await ex.execute('INSERT IGNORE INTO tags (name) VALUES (?)', [n]);
      const [rows] = await ex.execute('SELECT id FROM tags WHERE name = ? LIMIT 1', [n]);
      if (rows[0]) ids.push(rows[0].id);
    }
    return ids;
  }
  const db = fdb();
  const ids = [];
  for (const n of names) {
    let t = db.tags.find((x) => x.name === n);
    if (!t) {
      t = { id: file.nextId('tags'), name: n, created_at: new Date().toISOString() };
      db.tags.push(t);
    }
    ids.push(t.id);
  }
  save();
  return ids;
}

async function listTags() {
  if (useMySQL()) {
    const [rows] = await getPool().query(
      'SELECT t.id, t.name, COUNT(qt.question_id) as question_count FROM tags t LEFT JOIN question_tags qt ON qt.tag_id = t.id GROUP BY t.id, t.name ORDER BY question_count DESC, t.name ASC LIMIT 100'
    );
    return rows;
  }
  const db = fdb();
  return db.tags
    .map((t) => ({ ...t, question_count: db.question_tags.filter((qt) => String(qt.tag_id) === String(t.id)).length }))
    .sort((a, b) => b.question_count - a.question_count || a.name.localeCompare(b.name))
    .slice(0, 100);
}

async function tagsForQuestion(qid) {
  if (useMySQL()) {
    const [rows] = await getPool().execute(
      'SELECT t.id, t.name FROM tags t JOIN question_tags qt ON qt.tag_id = t.id WHERE qt.question_id = ? ORDER BY t.name',
      [qid]
    );
    return rows;
  }
  const db = fdb();
  const ids = new Set(db.question_tags.filter((qt) => String(qt.question_id) === String(qid)).map((qt) => String(qt.tag_id)));
  return db.tags.filter((t) => ids.has(String(t.id)));
}

/* ---------------- QUESTIONS ---------------- */
function toQuestionDTO(q, author, tags, answer_count) {
  return {
    id: q.id,
    title: q.title,
    description: q.description,
    user_id: q.user_id,
    accepted_answer_id: q.accepted_answer_id || null,
    created_at: q.created_at,
    updated_at: q.updated_at,
    author: author ? { id: author.id, username: author.username } : null,
    tags: tags || [],
    answer_count: answer_count ?? 0,
    has_accepted: Boolean(q.accepted_answer_id)
  };
}

async function createQuestion({ user_id, title, description, tagNames }) {
  const names = [...new Set((tagNames || []).map(normTag).filter(Boolean))];
  if (useMySQL()) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.execute('INSERT INTO questions (user_id, title, description) VALUES (?,?,?)', [user_id, title, description]);
      const qid = r.insertId;
      const tagIds = await ensureTagIds(names, conn);
      for (const tid of tagIds) await conn.execute('INSERT IGNORE INTO question_tags (question_id, tag_id) VALUES (?,?)', [qid, tid]);
      await conn.commit();
      return getQuestionById(qid);
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
  const db = fdb();
  const id = file.nextId('questions');
  const now = new Date().toISOString();
  const q = { id, user_id, title, description, accepted_answer_id: null, created_at: now, updated_at: now };
  db.questions.push(q);
  const tagIds = await ensureTagIds(names);
  for (const tid of tagIds) {
    if (!db.question_tags.some((qt) => String(qt.question_id) === String(id) && String(qt.tag_id) === String(tid)))
      db.question_tags.push({ question_id: id, tag_id: tid });
  }
  save();
  return getQuestionById(id);
}

async function getQuestionById(id) {
  if (useMySQL()) {
    const [rows] = await getPool().execute('SELECT * FROM questions WHERE id = ? LIMIT 1', [id]);
    const q = rows[0];
    if (!q) return null;
    const author = await findUserById(q.user_id);
    const tags = await tagsForQuestion(q.id);
    const [[c]] = await getPool().execute('SELECT COUNT(*) as n FROM answers WHERE question_id = ?', [q.id]);
    return toQuestionDTO(q, author ? { id: author.id, username: author.username } : null, tags, c.n);
  }
  const db = fdb();
  const q = db.questions.find((x) => String(x.id) === String(id));
  if (!q) return null;
  const author = db.users.find((u) => String(u.id) === String(q.user_id));
  const tags = await tagsForQuestion(q.id);
  const answer_count = db.answers.filter((a) => String(a.question_id) === String(q.id)).length;
  return toQuestionDTO(q, author ? { id: author.id, username: author.username } : null, tags, answer_count);
}

async function listQuestions({ page = 1, limit = 10, search = '', sort = 'newest', tag = '', author = null }) {
  page = Math.max(1, Number(page) || 1);
  limit = Math.min(50, Math.max(1, Number(limit) || 10));
  const offset = (page - 1) * limit;
  const s = String(search || '').trim().toLowerCase();
  const tagN = normTag(tag);

  if (useMySQL()) {
    const pool = getPool();
    const where = [];
    const params = [];
    if (s) { where.push('(q.title LIKE ? OR q.description LIKE ?)'); params.push(`%${s}%`, `%${s}%`); }
    if (author) { where.push('q.user_id = ?'); params.push(author); }
    if (tagN) { where.push('EXISTS (SELECT 1 FROM question_tags qt JOIN tags t ON t.id=qt.tag_id WHERE qt.question_id=q.id AND t.name=?)'); params.push(tagN); }
    if (sort === 'unanswered') { where.push('NOT EXISTS (SELECT 1 FROM answers a WHERE a.question_id=q.id)'); }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const order = sort === 'oldest' ? 'q.created_at ASC' : 'q.created_at DESC';
    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM questions q ${whereSql}`, params);
    const total = countRows[0].total;
    const [rows] = await pool.query(
      `SELECT q.*, u.username as author_name, (SELECT COUNT(*) FROM answers a WHERE a.question_id=q.id) as answer_count
       FROM questions q LEFT JOIN users u ON u.id=q.user_id ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    // attach tags
    const data = [];
    for (const r of rows) {
      const tags = await tagsForQuestion(r.id);
      data.push({ ...toQuestionDTO(r, { id: r.user_id, username: r.author_name }, tags, r.answer_count) });
    }
    // mostVoted sort in memory fallback: keep newest for mysql (or order by answer_count)
    if (sort === 'popular') data.sort((a, b) => b.answer_count - a.answer_count);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  const db = fdb();
  let items = [...db.questions];
  if (tagN) {
    const tagObj = db.tags.find((t) => t.name === tagN);
    if (!tagObj) items = [];
    else {
      const qids = new Set(db.question_tags.filter((qt) => String(qt.tag_id) === String(tagObj.id)).map((qt) => String(qt.question_id)));
      items = items.filter((q) => qids.has(String(q.id)));
    }
  }
  if (s) items = items.filter((q) => (q.title + ' ' + q.description).toLowerCase().includes(s));
  if (author) items = items.filter((q) => String(q.user_id) === String(author));
  if (sort === 'unanswered') items = items.filter((q) => !db.answers.some((a) => String(a.question_id) === String(q.id)));
  if (sort === 'popular') {
    items.sort((a, b) => db.answers.filter((x) => String(x.question_id) === String(b.id)).length - db.answers.filter((x) => String(x.question_id) === String(a.id)).length);
  } else if (sort === 'oldest') items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  else items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const total = items.length;
  const slice = items.slice(offset, offset + limit);
  const data = [];
  for (const q of slice) {
    const author = db.users.find((u) => String(u.id) === String(q.user_id));
    const tags = await tagsForQuestion(q.id);
    const answer_count = db.answers.filter((a) => String(a.question_id) === String(q.id)).length;
    data.push(toQuestionDTO(q, author ? { id: author.id, username: author.username } : null, tags, answer_count));
  }
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

async function updateQuestion(id, { title, description, tagNames }) {
  if (useMySQL()) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('UPDATE questions SET title=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [title, description, id]);
      if (Array.isArray(tagNames)) {
        const tagIds = await ensureTagIds(tagNames, conn);
        await conn.execute('DELETE FROM question_tags WHERE question_id=?', [id]);
        for (const tid of tagIds) await conn.execute('INSERT INTO question_tags (question_id, tag_id) VALUES (?,?)', [id, tid]);
      }
      await conn.commit();
      return getQuestionById(id);
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  }
  const db = fdb();
  const q = db.questions.find((x) => String(x.id) === String(id));
  if (!q) return null;
  q.title = title; q.description = description; q.updated_at = new Date().toISOString();
  if (Array.isArray(tagNames)) {
    db.question_tags = db.question_tags.filter((qt) => String(qt.question_id) !== String(id));
    const tagIds = await ensureTagIds(tagNames);
    for (const tid of tagIds) db.question_tags.push({ question_id: q.id, tag_id: tid });
  }
  save();
  return getQuestionById(id);
}

async function deleteQuestion(id) {
  if (useMySQL()) {
    await getPool().execute('DELETE FROM questions WHERE id=?', [id]);
    return true;
  }
  const db = fdb();
  const qid = String(id);
  // cascade: answers + votes + comments + notifications + question_tags
  const answerIds = new Set(db.answers.filter((a) => String(a.question_id) === qid).map((a) => String(a.id)));
  db.questions = db.questions.filter((q) => String(q.id) !== qid);
  db.answers = db.answers.filter((a) => String(a.question_id) !== qid);
  db.question_tags = db.question_tags.filter((qt) => String(qt.question_id) !== qid);
  db.votes = db.votes.filter((v) => !answerIds.has(String(v.answer_id)));
  db.comments = db.comments.filter((c) => !answerIds.has(String(c.answer_id)));
  db.notifications = db.notifications.filter((n) => String(n.related_question_id) !== qid);
  save();
  return true;
}

/* ---------------- ANSWERS ---------------- */
async function createAnswer({ question_id, user_id, content }) {
  if (useMySQL()) {
    const [r] = await getPool().execute('INSERT INTO answers (question_id, user_id, content) VALUES (?,?,?)', [question_id, user_id, content]);
    return getAnswerById(r.insertId, user_id);
  }
  const db = fdb();
  const id = file.nextId('answers');
  const now = new Date().toISOString();
  const a = { id, question_id: Number(question_id), user_id, content, is_accepted: 0, created_at: now, updated_at: now };
  db.answers.push(a);
  save();
  return getAnswerById(id, user_id);
}

async function getAnswerById(id, viewerUserId = null) {
  if (useMySQL()) {
    const [rows] = await getPool().execute(
      `SELECT a.*, u.username as author_name,
        (SELECT COALESCE(SUM(v.vote_type),0) FROM votes v WHERE v.answer_id=a.id) as score,
        (SELECT v.vote_type FROM votes v WHERE v.answer_id=a.id AND v.user_id=? LIMIT 1) as my_vote
       FROM answers a LEFT JOIN users u ON u.id=a.user_id WHERE a.id=? LIMIT 1`,
      [viewerUserId || 0, id]
    );
    const a = rows[0];
    if (!a) return null;
    const comments = await listCommentsByAnswer(a.id);
    return {
      id: a.id, question_id: a.question_id, user_id: a.user_id, content: a.content,
      is_accepted: Boolean(a.is_accepted), score: Number(a.score) || 0,
      my_vote: a.my_vote == null ? 0 : Number(a.my_vote),
      created_at: a.created_at, updated_at: a.updated_at,
      author: { id: a.user_id, username: a.author_name },
      comments
    };
  }
  const db = fdb();
  const a = db.answers.find((x) => String(x.id) === String(id));
  if (!a) return null;
  const author = db.users.find((u) => String(u.id) === String(a.user_id));
  const score = db.votes.filter((v) => String(v.answer_id) === String(a.id)).reduce((s, v) => s + Number(v.vote_type), 0);
  const my = viewerUserId ? db.votes.find((v) => String(v.answer_id) === String(a.id) && String(v.user_id) === String(viewerUserId)) : null;
  const comments = await listCommentsByAnswer(a.id);
  return {
    id: a.id, question_id: a.question_id, user_id: a.user_id, content: a.content,
    is_accepted: Boolean(a.is_accepted), score,
    my_vote: my ? Number(my.vote_type) : 0,
    created_at: a.created_at, updated_at: a.updated_at,
    author: author ? { id: author.id, username: author.username } : null,
    comments
  };
}

async function listAnswersByQuestion(questionId, viewerUserId = null) {
  if (useMySQL()) {
    const [rows] = await getPool().execute(
      `SELECT a.*, u.username as author_name,
        (SELECT COALESCE(SUM(v.vote_type),0) FROM votes v WHERE v.answer_id=a.id) as score,
        (SELECT v.vote_type FROM votes v WHERE v.answer_id=a.id AND v.user_id=? LIMIT 1) as my_vote
       FROM answers a LEFT JOIN users u ON u.id=a.user_id WHERE a.question_id=? ORDER BY a.is_accepted DESC, score DESC, a.created_at ASC`,
      [viewerUserId || 0, questionId]
    );
    const out = [];
    for (const a of rows) {
      const comments = await listCommentsByAnswer(a.id);
      out.push({
        id: a.id, question_id: a.question_id, user_id: a.user_id, content: a.content,
        is_accepted: Boolean(a.is_accepted), score: Number(a.score) || 0,
        my_vote: a.my_vote == null ? 0 : Number(a.my_vote),
        created_at: a.created_at, updated_at: a.updated_at,
        author: { id: a.user_id, username: a.author_name }, comments
      });
    }
    return out;
  }
  const db = fdb();
  const list = db.answers.filter((a) => String(a.question_id) === String(questionId));
  const enriched = [];
  for (const a of list) enriched.push(await getAnswerById(a.id, viewerUserId));
  enriched.sort((x, y) => (Number(y.is_accepted) - Number(x.is_accepted)) || (y.score - x.score) || (new Date(x.created_at) - new Date(y.created_at)));
  return enriched;
}

async function updateAnswer(id, { content }) {
  if (useMySQL()) {
    await getPool().execute('UPDATE answers SET content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [content, id]);
    return getAnswerById(id);
  }
  const db = fdb();
  const a = db.answers.find((x) => String(x.id) === String(id));
  if (!a) return null;
  a.content = content; a.updated_at = new Date().toISOString();
  save();
  return getAnswerById(id);
}

async function deleteAnswer(id) {
  const ans = await getAnswerById(id);
  if (!ans) return false;
  if (useMySQL()) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('UPDATE questions SET accepted_answer_id=NULL WHERE accepted_answer_id=?', [id]);
      await conn.execute('DELETE FROM answers WHERE id=?', [id]);
      await conn.commit();
      return true;
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  }
  const db = fdb();
  const sid = String(id);
  const target = db.answers.find((a) => String(a.id) === sid);
  if (target) {
    const q = db.questions.find((qq) => String(qq.id) === String(target.question_id));
    if (q && String(q.accepted_answer_id) === sid) q.accepted_answer_id = null;
  }
  db.answers = db.answers.filter((a) => String(a.id) !== sid);
  db.votes = db.votes.filter((v) => String(v.answer_id) !== sid);
  db.comments = db.comments.filter((c) => String(c.answer_id) !== sid);
  save();
  return true;
}

async function setVote(answerId, userId, vote_type) {
  // vote_type: 1, -1, or 0/null to remove. Toggle handled by route.
  if (useMySQL()) {
    const pool = getPool();
    if (!vote_type) {
      await pool.execute('DELETE FROM votes WHERE answer_id=? AND user_id=?', [answerId, userId]);
    } else {
      await pool.execute(
        'INSERT INTO votes (answer_id, user_id, vote_type) VALUES (?,?,?) ON DUPLICATE KEY UPDATE vote_type=VALUES(vote_type)',
        [answerId, userId, vote_type]
      );
    }
    const [[r]] = await pool.execute('SELECT COALESCE(SUM(vote_type),0) as score FROM votes WHERE answer_id=?', [answerId]);
    return { score: Number(r.score) || 0, my_vote: vote_type || 0 };
  }
  const db = fdb();
  const sid = String(answerId), su = String(userId);
  db.votes = db.votes.filter((v) => !(String(v.answer_id) === sid && String(v.user_id) === su));
  if (vote_type) {
    db.votes.push({ id: file.nextId('votes'), answer_id: Number(answerId), user_id: userId, vote_type, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  save();
  const score = db.votes.filter((v) => String(v.answer_id) === sid).reduce((s, v) => s + Number(v.vote_type), 0);
  return { score, my_vote: vote_type || 0 };
}

async function setAccepted(questionId, answerId, requesterId) {
  // verify ownership outside; here do transactional swap
  if (useMySQL()) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('UPDATE answers SET is_accepted=0 WHERE question_id=?', [questionId]);
      if (answerId) await conn.execute('UPDATE answers SET is_accepted=1 WHERE id=? AND question_id=?', [answerId, questionId]);
      await conn.execute('UPDATE questions SET accepted_answer_id=? WHERE id=?', [answerId || null, questionId]);
      await conn.commit();
      return getQuestionById(questionId);
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  }
  const db = fdb();
  for (const a of db.answers) if (String(a.question_id) === String(questionId)) a.is_accepted = 0;
  const q = db.questions.find((qq) => String(qq.id) === String(questionId));
  if (q) q.accepted_answer_id = answerId ? Number(answerId) : null;
  if (answerId) {
    const a = db.answers.find((x) => String(x.id) === String(answerId));
    if (a) a.is_accepted = 1;
  }
  save();
  return getQuestionById(questionId);
}

/* ---------------- COMMENTS ---------------- */
async function createComment({ answer_id, user_id, content }) {
  if (useMySQL()) {
    const [r] = await getPool().execute('INSERT INTO comments (answer_id, user_id, content) VALUES (?,?,?)', [answer_id, user_id, content]);
    const [rows] = await getPool().execute('SELECT c.*, u.username as author_name FROM comments c LEFT JOIN users u ON u.id=c.user_id WHERE c.id=?', [r.insertId]);
    return rows[0];
  }
  const db = fdb();
  const id = file.nextId('comments');
  const now = new Date().toISOString();
  const c = { id, answer_id: Number(answer_id), user_id, content, created_at: now, updated_at: now };
  db.comments.push(c);
  save();
  const author = db.users.find((u) => String(u.id) === String(user_id));
  return { ...c, author_name: author?.username };
}
async function listCommentsByAnswer(answerId) {
  if (useMySQL()) {
    const [rows] = await getPool().execute('SELECT c.*, u.username as author_name FROM comments c LEFT JOIN users u ON u.id=c.user_id WHERE c.answer_id=? ORDER BY c.created_at ASC', [answerId]);
    return rows.map((c) => ({ id: c.id, answer_id: c.answer_id, user_id: c.user_id, content: c.content, created_at: c.created_at, updated_at: c.updated_at, author: { id: c.user_id, username: c.author_name } }));
  }
  const db = fdb();
  return db.comments.filter((c) => String(c.answer_id) === String(answerId))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((c) => {
      const author = db.users.find((u) => String(u.id) === String(c.user_id));
      return { ...c, author: author ? { id: author.id, username: author.username } : null };
    });
}
async function getCommentById(id) {
  if (useMySQL()) {
    const [rows] = await getPool().execute('SELECT * FROM comments WHERE id=? LIMIT 1', [id]);
    return rows[0] || null;
  }
  return fdb().comments.find((c) => String(c.id) === String(id)) || null;
}
async function deleteComment(id) {
  if (useMySQL()) { await getPool().execute('DELETE FROM comments WHERE id=?', [id]); return true; }
  const db = fdb();
  db.comments = db.comments.filter((c) => String(c.id) !== String(id));
  save();
  return true;
}

/* ---------------- NOTIFICATIONS ---------------- */
async function createNotification({ recipient_user_id, actor_user_id, type, message, related_question_id = null, related_answer_id = null, related_comment_id = null }) {
  if (String(recipient_user_id) === String(actor_user_id)) return null; // no self-notify
  if (useMySQL()) {
    const [r] = await getPool().execute(
      'INSERT INTO notifications (recipient_user_id, actor_user_id, type, message, related_question_id, related_answer_id, related_comment_id) VALUES (?,?,?,?,?,?,?)',
      [recipient_user_id, actor_user_id, type, message, related_question_id, related_answer_id, related_comment_id]
    );
    const [rows] = await getPool().execute('SELECT * FROM notifications WHERE id=?', [r.insertId]);
    return rows[0];
  }
  const db = fdb();
  const id = file.nextId('notifications');
  const now = new Date().toISOString();
  const n = { id, recipient_user_id, actor_user_id, type, message, related_question_id, related_answer_id, related_comment_id, is_read: 0, created_at: now, updated_at: now };
  db.notifications.push(n);
  // actor name join on read; store actor username snapshot for convenience
  save();
  return n;
}

async function enrichNotifications(list) {
  const out = [];
  for (const n of list) {
    const actor = await findUserById(n.actor_user_id);
    out.push({
      ...n,
      is_read: Boolean(n.is_read),
      actor: actor ? { id: actor.id, username: actor.username } : null
    });
  }
  return out;
}

async function listNotifications(userId, { page = 1, limit = 15 } = {}) {
  page = Math.max(1, Number(page) || 1); limit = Math.min(50, Number(limit) || 15);
  const offset = (page - 1) * limit;
  if (useMySQL()) {
    const [[c]] = await getPool().execute('SELECT COUNT(*) as total FROM notifications WHERE recipient_user_id=?', [userId]);
    const [rows] = await getPool().query(
      'SELECT n.*, u.username as actor_name FROM notifications n LEFT JOIN users u ON u.id=n.actor_user_id WHERE n.recipient_user_id=? ORDER BY n.created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );
    const data = rows.map((n) => ({ ...n, is_read: Boolean(n.is_read), actor: { id: n.actor_user_id, username: n.actor_name } }));
    return { data, total: c.total, page, limit, totalPages: Math.ceil(c.total / limit) || 1 };
  }
  const db = fdb();
  const all = db.notifications.filter((n) => String(n.recipient_user_id) === String(userId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const slice = all.slice(offset, offset + limit);
  return { data: await enrichNotifications(slice), total: all.length, page, limit, totalPages: Math.ceil(all.length / limit) || 1 };
}

async function unreadCount(userId) {
  if (useMySQL()) {
    const [[r]] = await getPool().execute('SELECT COUNT(*) as n FROM notifications WHERE recipient_user_id=? AND is_read=0', [userId]);
    return r.n;
  }
  return fdb().notifications.filter((n) => String(n.recipient_user_id) === String(userId) && !n.is_read).length;
}

async function markNotificationRead(id, userId) {
  if (useMySQL()) {
    await getPool().execute('UPDATE notifications SET is_read=1 WHERE id=? AND recipient_user_id=?', [id, userId]);
    return true;
  }
  const db = fdb();
  const n = db.notifications.find((x) => String(x.id) === String(id) && String(x.recipient_user_id) === String(userId));
  if (n) { n.is_read = 1; n.updated_at = new Date().toISOString(); save(); }
  return true;
}
async function markAllRead(userId) {
  if (useMySQL()) { await getPool().execute('UPDATE notifications SET is_read=1 WHERE recipient_user_id=?', [userId]); return true; }
  const db = fdb();
  for (const n of db.notifications) if (String(n.recipient_user_id) === String(userId)) n.is_read = 1;
  save();
  return true;
}

/* ---------------- ADMIN ---------------- */
const ADMIN_TABLES = ['users', 'questions', 'answers', 'tags', 'question_tags', 'votes', 'comments', 'notifications'];

async function adminTables() {
  if (useMySQL()) {
    const out = [];
    for (const t of ADMIN_TABLES) {
      const [[r]] = await getPool().query(`SELECT COUNT(*) AS n FROM \`${t}\``);
      out.push({ name: t, count: r.n });
    }
    return out;
  }
  const db = fdb();
  return ADMIN_TABLES.map((t) => ({ name: t, count: (db[t] || []).length }));
}

async function adminTableRows(name, { page = 1, limit = 20 } = {}) {
  if (!ADMIN_TABLES.includes(name)) {
    const e = new Error('Unknown table');
    e.status = 400;
    throw e;
  }
  page = Math.max(1, Number(page) || 1);
  limit = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (page - 1) * limit;
  const clean = (r) => {
    if (!r || typeof r !== 'object') return r;
    const { password_hash, ...rest } = r;
    const out = {};
    for (const [k, v] of Object.entries(rest)) out[k] = typeof v === 'string' && v.length > 220 ? v.slice(0, 220) + '…' : v;
    return out;
  };
  if (useMySQL()) {
    const [[c]] = await getPool().query(`SELECT COUNT(*) AS total FROM \`${name}\``);
    // integers are sanitized above, safe to interpolate (mysql2 placeholders dislike LIMIT)
    const [rows] = await getPool().query(`SELECT * FROM \`${name}\` ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`);
    const data = rows.map(clean);
    return { data, columns: data.length ? Object.keys(data[0]) : [], total: c.total, page, limit, totalPages: Math.ceil(c.total / limit) || 1 };
  }
  const db = fdb();
  const all = [...(db[name] || [])].reverse();
  const slice = all.slice(offset, offset + limit).map(clean);
  return { data: slice, columns: slice.length ? Object.keys(slice[0]) : [], total: all.length, page, limit, totalPages: Math.ceil(all.length / limit) || 1 };
}
async function adminListQuestions({ page = 1, limit = 20, search = '' }) {
  return listQuestions({ page, limit, search, sort: 'newest' });
}
async function adminListAnswers({ page = 1, limit = 20, search = '' }) {
  page = Math.max(1, Number(page) || 1); limit = Math.min(50, Number(limit) || 20);
  const s = String(search || '').toLowerCase();
  if (useMySQL()) {
    const offset = (page - 1) * limit;
    const where = s ? 'WHERE a.content LIKE ?' : '';
    const params = s ? [`%${s}%`] : [];
    const [[c]] = await getPool().query(`SELECT COUNT(*) as total FROM answers a ${where}`, params);
    const [rows] = await getPool().query(
      `SELECT a.*, u.username as author_name, q.title as question_title FROM answers a LEFT JOIN users u ON u.id=a.user_id LEFT JOIN questions q ON q.id=a.question_id ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { data: rows, total: c.total, page, limit, totalPages: Math.ceil(c.total / limit) || 1 };
  }
  const db = fdb();
  let items = [...db.answers];
  if (s) items = items.filter((a) => String(a.content).toLowerCase().includes(s));
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = items.length;
  const slice = items.slice((page - 1) * limit, (page - 1) * limit + limit).map((a) => {
    const author = db.users.find((u) => String(u.id) === String(a.user_id));
    const q = db.questions.find((qq) => String(qq.id) === String(a.question_id));
    return { ...a, author_name: author?.username, question_title: q?.title };
  });
  return { data: slice, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

async function adminListComments({ page = 1, limit = 20, search = '' }) {
  page = Math.max(1, Number(page) || 1); limit = Math.min(50, Number(limit) || 20);
  const s = String(search || '').toLowerCase();
  if (useMySQL()) {
    const offset = (page - 1) * limit;
    const where = s ? 'WHERE c.content LIKE ?' : '';
    const params = s ? [`%${s}%`] : [];
    const [[c]] = await getPool().query(`SELECT COUNT(*) as total FROM comments c ${where}`, params);
    const [rows] = await getPool().query(
      `SELECT c.*, u.username as author_name, a.question_id, q.title as question_title
       FROM comments c LEFT JOIN users u ON u.id=c.user_id
       LEFT JOIN answers a ON a.id=c.answer_id LEFT JOIN questions q ON q.id=a.question_id
       ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { data: rows, total: c.total, page, limit, totalPages: Math.ceil(c.total / limit) || 1 };
  }
  const db = fdb();
  let items = [...db.comments];
  if (s) items = items.filter((c) => String(c.content).toLowerCase().includes(s));
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = items.length;
  const slice = items.slice((page - 1) * limit, (page - 1) * limit + limit).map((c) => {
    const author = db.users.find((u) => String(u.id) === String(c.user_id));
    const a = db.answers.find((x) => String(x.id) === String(c.answer_id));
    const q = a && db.questions.find((qq) => String(qq.id) === String(a.question_id));
    return { ...c, author_name: author?.username, question_id: a?.question_id, question_title: q?.title };
  });
  return { data: slice, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

module.exports = {
  stripPassword, normTag,
  createUser, findUserByEmail, findUserByUsername, findUserById, findUsersByUsernames,
  ensureTagIds, listTags, tagsForQuestion,
  createQuestion, getQuestionById, listQuestions, updateQuestion, deleteQuestion,
  createAnswer, getAnswerById, listAnswersByQuestion, updateAnswer, deleteAnswer, setVote, setAccepted,
  createComment, listCommentsByAnswer, getCommentById, deleteComment,
  createNotification, listNotifications, unreadCount, markNotificationRead, markAllRead,
  adminListQuestions, adminListAnswers, adminListComments, adminTables, adminTableRows, ADMIN_TABLES
};
