const express = require('express');
const db = require('../db');
const { authRequired, authOptional, denyAdminWrites } = require('../middleware/auth');
const { ok, fail } = require('../middleware/response');
const { valQuestion } = require('../utils/validate');
const { cleanRich, textOf, extractMentions } = require('../utils/sanitize');

const router = express.Router();

// List + search + filter + pagination. ?mine=true returns only the
// logged-in user's questions (requires authentication).
router.get('/', authOptional, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sort = 'newest', tag = '', mine = '' } = req.query;
    let author = null;
    if (String(mine).toLowerCase() === 'true') {
      if (!req.user) return fail(res, 401, 'UNAUTHORIZED', 'Login required to view your questions');
      author = req.user.id;
    }
    const result = await db.listQuestions({ page, limit, search, sort, tag, author });
    return ok(res, result);
  } catch (e) {
    console.error(e);
    return fail(res, 500, 'SERVER_ERROR', 'Could not load questions');
  }
});

router.get('/:id', authOptional, async (req, res) => {
  try {
    const q = await db.getQuestionById(req.params.id);
    if (!q) return fail(res, 404, 'NOT_FOUND', 'Question not found');
    const answers = await db.listAnswersByQuestion(q.id, req.user?.id || null);
    return ok(res, { question: q, answers });
  } catch (e) {
    console.error(e);
    return fail(res, 500, 'SERVER_ERROR', 'Could not load question');
  }
});

router.post('/', authRequired, denyAdminWrites, async (req, res) => {
  try {
    const { title = '', description = '', tags = [] } = req.body || {};
    const tagNames = Array.isArray(tags) ? tags.map((t) => (typeof t === 'string' ? t : t.name)).filter(Boolean) : [];
    const errors = valQuestion({ title, description, tags: tagNames });
    if (Object.keys(errors).length) return fail(res, 400, 'VALIDATION_ERROR', 'Please fix the highlighted fields', errors);
    const clean = cleanRich(description);
    if (!textOf(clean)) return fail(res, 400, 'VALIDATION_ERROR', 'Description is required', { description: 'Description is required' });
    const q = await db.createQuestion({ user_id: req.user.id, title: String(title).trim(), description: clean, tagNames });
    // mentions in question description -> notify mentioned users
    try {
      const mentions = extractMentions(`${title} ${textOf(clean)} ${clean}`);
      if (mentions.length) {
        const users = await db.findUsersByUsernames(mentions);
        for (const u of users) {
          await db.createNotification({
            recipient_user_id: u.id, actor_user_id: req.user.id, type: 'USER_MENTIONED',
            message: `${req.user.username} mentioned you in a question: "${String(title).slice(0, 80)}"`,
            related_question_id: q.id
          });
        }
      }
    } catch {}
    return ok(res, { question: q }, 'Question posted', 201);
  } catch (e) {
    console.error(e);
    return fail(res, 500, 'SERVER_ERROR', 'Could not post question');
  }
});

router.put('/:id', authRequired, denyAdminWrites, async (req, res) => {
  try {
    const q = await db.getQuestionById(req.params.id);
    if (!q) return fail(res, 404, 'NOT_FOUND', 'Question not found');
    if (String(q.user_id) !== String(req.user.id) && req.user.role !== 'admin')
      return fail(res, 403, 'FORBIDDEN', 'You can only edit your own question');
    const { title = q.title, description = q.description, tags } = req.body || {};
    const tagNames = Array.isArray(tags) ? tags.map((t) => (typeof t === 'string' ? t : t.name)).filter(Boolean) : undefined;
    const errors = valQuestion({ title, description, tags: tagNames ?? q.tags.map((t) => t.name) });
    if (Object.keys(errors).length) return fail(res, 400, 'VALIDATION_ERROR', 'Please fix the highlighted fields', errors);
    const updated = await db.updateQuestion(q.id, { title: String(title).trim(), description: cleanRich(description), tagNames });
    return ok(res, { question: updated }, 'Question updated');
  } catch (e) {
    console.error(e);
    return fail(res, 500, 'SERVER_ERROR', 'Could not update question');
  }
});

router.delete('/:id', authRequired, async (req, res) => {
  try {
    const q = await db.getQuestionById(req.params.id);
    if (!q) return fail(res, 404, 'NOT_FOUND', 'Question not found');
    if (String(q.user_id) !== String(req.user.id) && req.user.role !== 'admin')
      return fail(res, 403, 'FORBIDDEN', 'You can only delete your own question');
    await db.deleteQuestion(q.id);
    return ok(res, {}, 'Question deleted');
  } catch (e) {
    console.error(e);
    return fail(res, 500, 'SERVER_ERROR', 'Could not delete question');
  }
});

// Answers nested
router.get('/:questionId/answers', authOptional, async (req, res) => {
  try {
    const answers = await db.listAnswersByQuestion(req.params.questionId, req.user?.id || null);
    return ok(res, { answers });
  } catch (e) {
    return fail(res, 500, 'SERVER_ERROR', 'Could not load answers');
  }
});

router.post('/:questionId/answers', authRequired, denyAdminWrites, async (req, res) => {
  try {
    const q = await db.getQuestionById(req.params.questionId);
    if (!q) return fail(res, 404, 'NOT_FOUND', 'Question not found');
    const { content = '' } = req.body || {};
    const clean = cleanRich(content);
    if (!textOf(clean)) return fail(res, 400, 'VALIDATION_ERROR', 'Answer content is required', { content: 'Answer cannot be empty' });
    if (textOf(clean).length > 20000) return fail(res, 400, 'VALIDATION_ERROR', 'Answer is too long');
    const ans = await db.createAnswer({ question_id: q.id, user_id: req.user.id, content: clean });
    // notify question owner
    await db.createNotification({
      recipient_user_id: q.user_id, actor_user_id: req.user.id, type: 'ANSWER_POSTED',
      message: `${req.user.username} answered your question: "${String(q.title).slice(0, 80)}"`,
      related_question_id: q.id, related_answer_id: ans.id
    });
    // mentions
    try {
      const mentions = extractMentions(`${textOf(clean)} ${clean}`);
      if (mentions.length) {
        const users = await db.findUsersByUsernames(mentions);
        const seen = new Set();
        for (const u of users) {
          if (seen.has(String(u.id))) continue;
          seen.add(String(u.id));
          await db.createNotification({
            recipient_user_id: u.id, actor_user_id: req.user.id, type: 'USER_MENTIONED',
            message: `${req.user.username} mentioned you in an answer to "${String(q.title).slice(0, 70)}"`,
            related_question_id: q.id, related_answer_id: ans.id
          });
        }
      }
    } catch {}
    const full = await db.getAnswerById(ans.id, req.user.id);
    return ok(res, { answer: full }, 'Answer posted', 201);
  } catch (e) {
    console.error(e);
    return fail(res, 500, 'SERVER_ERROR', 'Could not post answer');
  }
});

module.exports = router;
