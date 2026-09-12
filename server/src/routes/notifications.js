const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { ok, fail } = require('../middleware/response');
const router = express.Router();

router.use(authRequired);

router.get('/', async (req, res) => {
  try {
    const result = await db.listNotifications(req.user.id, { page: req.query.page, limit: req.query.limit });
    return ok(res, result);
  } catch (e) {
    return fail(res, 500, 'SERVER_ERROR', 'Could not load notifications');
  }
});

router.get('/unread-count', async (req, res) => {
  const count = await db.unreadCount(req.user.id);
  return ok(res, { count });
});

router.patch('/read-all', async (req, res) => {
  await db.markAllRead(req.user.id);
  return ok(res, {}, 'All marked as read');
});

router.patch('/:id/read', async (req, res) => {
  await db.markNotificationRead(req.params.id, req.user.id);
  return ok(res, {}, 'Marked as read');
});

module.exports = router;
