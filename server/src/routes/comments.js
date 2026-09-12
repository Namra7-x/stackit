const express = require('express');
const db = require('../db');
const { authRequired, authOptional, denyAdminWrites } = require('../middleware/auth');
const { ok, fail } = require('../middleware/response');
const { extractMentions } = require('../utils/sanitize');

const router = express.Router();

router.get('/answers/:answerId/comments', authOptional, async (req, res) => {
  const comments = await db.listCommentsByAnswer(req.params.answerId);
  return ok(res, { comments });
});

router.post('/answers/:answerId/comments', authRequired, denyAdminWrites, async (req, res) => {
  try {
    const answer = await db.getAnswerById(req.params.answerId);
    if (!answer) return fail(res, 404, 'NOT_FOUND', 'Answer not found');
    const content = String(req.body?.content || '').trim();
    if (!content) return fail(res, 400, 'VALIDATION_ERROR', 'Comment cannot be empty', { content: 'Comment cannot be empty' });
    if (content.length > 2000) return fail(res, 400, 'VALIDATION_ERROR', 'Comment is too long (max 2000 chars)');
    const comment = await db.createComment({ answer_id: answer.id, user_id: req.user.id, content });
    // notify answer owner
    await db.createNotification({
      recipient_user_id: answer.user_id, actor_user_id: req.user.id, type: 'ANSWER_COMMENTED',
      message: `${req.user.username} commented on your answer`,
      related_question_id: answer.question_id, related_answer_id: answer.id, related_comment_id: comment.id
    });
    // mentions
    const mentions = extractMentions(content);
    if (mentions.length) {
      const users = await db.findUsersByUsernames(mentions);
      for (const u of users) {
        await db.createNotification({
          recipient_user_id: u.id, actor_user_id: req.user.id, type: 'USER_MENTIONED',
          message: `${req.user.username} mentioned you in a comment: "${content.slice(0, 80)}"`,
          related_question_id: answer.question_id, related_answer_id: answer.id, related_comment_id: comment.id
        });
      }
    }
    return ok(res, { comment }, 'Comment posted', 201);
  } catch (e) {
    console.error(e);
    return fail(res, 500, 'SERVER_ERROR', 'Could not post comment');
  }
});

router.delete('/:id', authRequired, async (req, res) => {
  const c = await db.getCommentById(req.params.id);
  if (!c) return fail(res, 404, 'NOT_FOUND', 'Comment not found');
  if (String(c.user_id) !== String(req.user.id) && req.user.role !== 'admin')
    return fail(res, 403, 'FORBIDDEN', 'You can only delete your own comment');
  await db.deleteComment(c.id);
  return ok(res, {}, 'Comment deleted');
});

module.exports = router;
