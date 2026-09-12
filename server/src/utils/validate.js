const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function valRegister({ username, email, password }) {
  const errors = {};
  if (!username || !String(username).trim()) errors.username = 'Username is required';
  else if (!/^[A-Za-z0-9_]{3,20}$/.test(String(username).trim())) errors.username = 'Username must be 3-20 chars (letters, numbers, _)';
  if (!email || !emailRe.test(String(email).trim())) errors.email = 'Valid email is required';
  if (!password || String(password).length < 6) errors.password = 'Password must be at least 6 characters';
  else if (String(password).length > 100) errors.password = 'Password is too long';
  return errors;
}

function valQuestion({ title, description, tags }) {
  const errors = {};
  const t = String(title || '').trim();
  if (!t) errors.title = 'Title is required';
  else if (t.length < 10) errors.title = 'Title must be at least 10 characters';
  else if (t.length > 200) errors.title = 'Title must be under 200 characters';
  const { textOf } = require('./sanitize');
  const plain = textOf(description);
  if (!plain) errors.description = 'Description is required';
  else if (plain.length < 20) errors.description = 'Description must be at least 20 characters';
  else if (plain.length > 20000) errors.description = 'Description is too long';
  if (!Array.isArray(tags) || tags.length === 0) errors.tags = 'Add at least one tag';
  else if (tags.length > 5) errors.tags = 'Maximum 5 tags allowed';
  return errors;
}

module.exports = { valRegister, valQuestion, emailRe };
