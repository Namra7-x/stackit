const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = () => process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET(), { expiresIn: '7d' });
}

async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  try {
    const payload = jwt.verify(token, JWT_SECRET());
    const user = await db.findUserById(payload.id);
    if (!user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Session expired. Please login again.' } });
    req.user = { id: user.id, username: user.username, email: user.email, role: user.role };
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Session expired. Please login again.' } });
  }
}

async function authOptional(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET());
      const user = await db.findUserById(payload.id);
      if (user) req.user = { id: user.id, username: user.username, email: user.email, role: user.role };
    } catch { /* guest */ }
  }
  next();
}

function adminRequired(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } });
  next();
}

// Admins are moderation-only: they may read everything and DELETE content
// via moderation paths, but may never author content (questions, answers,
// votes, comments, edits, uploads). Must run AFTER authRequired.
function denyAdminWrites(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return res.status(403).json({ success: false, error: { code: 'MODERATION_ONLY', message: 'Admin accounts can only moderate content, not post it. Use a regular account to participate.' } });
  }
  next();
}

module.exports = { signToken, authRequired, authOptional, adminRequired, denyAdminWrites };
