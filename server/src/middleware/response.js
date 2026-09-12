function ok(res, data, message) {
  return res.json({ success: true, data, message });
}
function fail(res, status, code, message, details) {
  return res.status(status).json({ success: false, error: { code, message, details } });
}
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  console.error('[api-error]', err);
  if (res.headersSent) return;
  const status = err.status || 500;
  res.status(status).json({ success: false, error: { code: err.code || 'SERVER_ERROR', message: err.message || 'Something went wrong' } });
}
module.exports = { ok, fail, errorHandler };
