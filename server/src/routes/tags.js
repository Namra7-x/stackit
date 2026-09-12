const express = require('express');
const db = require('../db');
const { ok, fail } = require('../middleware/response');
const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const tags = await db.listTags();
    return ok(res, { tags });
  } catch (e) {
    return fail(res, 500, 'SERVER_ERROR', 'Could not load tags');
  }
});
module.exports = router;
