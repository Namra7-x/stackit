const express = require('express');
const db = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');
const { ok, fail } = require('../middleware/response');
const router = express.Router();

router.use(authRequired, adminRequired);

router.get('/questions', async (req, res) => {
  try {
    const result = await db.adminListQuestions({ page: req.query.page, limit: req.query.limit, search: req.query.search });
    return ok(res, result);
  } catch (e) {
    return fail(res, 500, 'SERVER_ERROR', 'Could not load questions');
  }
});

router.get('/answers', async (req, res) => {
  try {
    const result = await db.adminListAnswers({ page: req.query.page, limit: req.query.limit, search: req.query.search });
    return ok(res, result);
  } catch (e) {
    return fail(res, 500, 'SERVER_ERROR', 'Could not load answers');
  }
});

router.get('/comments', async (req, res) => {
  try {
    const result = await db.adminListComments({ page: req.query.page, limit: req.query.limit, search: req.query.search });
    return ok(res, result);
  } catch (e) {
    return fail(res, 500, 'SERVER_ERROR', 'Could not load comments');
  }
});

router.delete('/questions/:id', async (req, res) => {
  const q = await db.getQuestionById(req.params.id);
  if (!q) return fail(res, 404, 'NOT_FOUND', 'Question not found');
  await db.deleteQuestion(q.id);
  return ok(res, {}, 'Question removed');
});

router.delete('/answers/:id', async (req, res) => {
  const a = await db.getAnswerById(req.params.id);
  if (!a) return fail(res, 404, 'NOT_FOUND', 'Answer not found');
  await db.deleteAnswer(a.id);
  return ok(res, {}, 'Answer removed');
});

router.delete('/comments/:id', async (req, res) => {
  const c = await db.getCommentById(req.params.id);
  if (!c) return fail(res, 404, 'NOT_FOUND', 'Comment not found');
  await db.deleteComment(c.id);
  return ok(res, {}, 'Comment removed');
});

// Read-only database viewer (whitelisted tables only, password hashes stripped)
router.get('/tables', async (_req, res) => {
  try {
    const tables = await db.adminTables();
    return ok(res, { tables });
  } catch (e) {
    return fail(res, 500, 'SERVER_ERROR', 'Could not load tables');
  }
});

router.get('/tables/:name', async (req, res) => {
  try {
    const result = await db.adminTableRows(req.params.name, { page: req.query.page, limit: req.query.limit });
    return ok(res, result);
  } catch (e) {
    if (e.status === 400) return fail(res, 400, 'VALIDATION_ERROR', e.message);
    return fail(res, 500, 'SERVER_ERROR', 'Could not load table rows');
  }
});

module.exports = router;
