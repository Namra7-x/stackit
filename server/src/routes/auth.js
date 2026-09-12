const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, authRequired } = require('../middleware/auth');
const { ok, fail } = require('../middleware/response');
const { valRegister } = require('../utils/validate');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username = '', email = '', password = '' } = req.body || {};
    const errors = valRegister({ username, email, password });
    if (Object.keys(errors).length) return fail(res, 400, 'VALIDATION_ERROR', 'Please fix the highlighted fields', errors);
    const u = String(username).trim(), e = String(email).trim().toLowerCase();
    if (await db.findUserByUsername(u)) return fail(res, 409, 'DUPLICATE', 'Username is already taken');
    if (await db.findUserByEmail(e)) return fail(res, 409, 'DUPLICATE', 'Email is already registered');
    const password_hash = await bcrypt.hash(String(password), 10);
    // first user becomes admin if no admin exists? Keep simple: role user unless ADMIN_EMAILS contains email
    const adminEmails = String(process.env.ADMIN_EMAILS || 'admin@stackit.local').split(',').map((x) => x.trim().toLowerCase());
    const role = adminEmails.includes(e) ? 'admin' : 'user';
    const user = await db.createUser({ username: u, email: e, password_hash, role });
    const token = signToken(user.id ? { id: user.id, role: user.role } : user);
    // createUser returns stripped user; fetch full for id
    const full = await db.findUserByUsername(u);
    const t = signToken({ id: full.id, role: full.role });
    return ok(res, { token: t, user: db.stripPassword(full) }, 'Account created');
  } catch (e) {
    console.error(e);
    return fail(res, 500, 'SERVER_ERROR', 'Registration failed. Try again.');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier = '', password = '' } = req.body || {};
    if (!identifier || !password) return fail(res, 400, 'VALIDATION_ERROR', 'Email/username and password are required');
    const id = String(identifier).trim();
    let user = await db.findUserByEmail(id.toLowerCase());
    if (!user) user = await db.findUserByUsername(id);
    if (!user) return fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    const match = await bcrypt.compare(String(password), user.password_hash);
    if (!match) return fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    const token = signToken({ id: user.id, role: user.role });
    return ok(res, { token, user: db.stripPassword(user) }, 'Welcome back');
  } catch (e) {
    console.error(e);
    return fail(res, 500, 'SERVER_ERROR', 'Login failed. Try again.');
  }
});

router.get('/me', authRequired, async (req, res) => {
  const user = await db.findUserById(req.user.id);
  return ok(res, { user: db.stripPassword(user) });
});

router.post('/logout', (_req, res) => ok(res, {}, 'Logged out'));

module.exports = router;
