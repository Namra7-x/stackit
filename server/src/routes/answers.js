const express = require('express');
const db = require('../db');
const { authRequired, denyAdminWrites } = require('../middleware/auth');
const { ok, fail } = require('../middleware/response');
const { cleanRich, textOf } = require('../utils/sanitize');

const router = express.Router();

router.put('/:id', authRequired, denyAdminWrites, async (req, res) => {
  const a = await db.getAnswerById(req.params.id);
  if (!a) return fail(res, 404, 'NOT_FOUND', 'Answer not found');
  if (String(a.user_id) !== String(req.user.id) && req.user.role !== 'admin')
    return fail(res, 403, 'FORBIDDEN', 'You can only edit your own answer');
  const clean = cleanRich(req.body?.content || '');
  if (!textOf(clean)) return fail(res, 400, 'VALIDATION_ERROR', 'Answer cannot be empty');
  const updated = await db.updateAnswer(a.id, { content: clean });
  return ok(res, { answer: updated }, 'Answer updated');
});

router.delete('/:id', authRequired, async (req, res) => {
  const a = await db.getAnswerById(req.params.id);
  if (!a) return fail(res, 404, 'NOT_FOUND', 'Answer not found');
  if (String(a.user_id) !== String(req.user.id) && req.user.role !== 'admin')
    return fail(res, 403, 'FORBIDDEN', 'You can only delete your own answer');
  await db.deleteAnswer(a.id);
  return ok(res, {}, 'Answer deleted');
});

// Accept: only question owner
router.post('/:id/accept', authRequired, async (req, res) => {
  try {
    const a = await db.getAnswerById(req.params.id);
    if (!a) return fail(res, 404, 'NOT_FOUND', 'Answer not found');
    const q = await db.getQuestionById(a.question_id);
    if (!q) return fail(res, 404, 'NOT_FOUND', 'Question not found');
    if (String(q.user_id) !== String(req.user.id))
      return fail(res, 403, 'FORBIDDEN', 'Only the question owner can accept an answer');
    // toggle: if already accepted, unaccept
    const already = String(q.accepted_answer_id) === String(a.id);
    await db.setAccepted(q.id, already ? null : a.id, req.user.id);
    const updatedQ = await db.getQuestionById(q.id);
    const answers = await db.listAnswersByQuestion(q.id, req.user.id);
    return ok(res, { question: updatedQ, answers }, already ? 'Acceptance removed' : 'Answer accepted');
  } catch (e) {
    console.error(e);
    return fail(res, 500, 'SERVER_ERROR', 'Could not accept answer');
  }
});

// Vote: body { value: 1 | -1 } — toggles off if same vote exists
router.post('/:id/vote', authRequired, denyAdminWrites, async (req, res) => {
  try {
    const a = await db.getAnswerById(req.params.id, req.user.id);
    if (!a) return fail(res, 404, 'NOT_FOUND', 'Answer not found');
    const v = Number(req.body?.value);
    if (![1, -1].includes(v)) return fail(res, 400, 'VALIDATION_ERROR', 'Vote must be 1 or -1');
    const next = a.my_vote === v ? 0 : v; // toggle off
    const result = await db.setVote(a.id, req.user.id, next);
    return ok(res, result, next === 0 ? 'Vote removed' : 'Vote recorded');
  } catch (e) {
    if (e?.code === 'ER_DUP_ENTRY') return fail(res, 409, 'DUPLICATE', 'Duplicate vote');
    console.error(e);
    return fail(res, 500, 'SERVER_ERROR', 'Could not record vote');
  }
});

router.delete('/:id/vote', authRequired, denyAdminWrites, async (req, res) => {
  const a = await db.getAnswerById(req.params.id);
  if (!a) return fail(res, 404, 'NOT_FOUND', 'Answer not found');
  const result = await db.setVote(a.id, req.user.id, 0);
  return ok(res, result, 'Vote removed');
});

module.exports = router;
