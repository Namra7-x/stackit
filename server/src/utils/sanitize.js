const sanitizeHtml = require('sanitize-html');

const allowed = {
  allowedTags: ['b', 'i', 'em', 'strong', 's', 'strike', 'del', 'u', 'p', 'br', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'span', 'div'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['style', 'class'],
    p: ['style'], div: ['style'], span: ['style']
  },
  allowedStyles: { '*': { 'text-align': [/^left$/, /^center$/, /^right$/, /^justify$/] } },
  allowedSchemes: ['http', 'https', 'data'],
  allowProtocolRelative: false
};

function cleanRich(html) {
  if (!html) return '';
  const out = sanitizeHtml(String(html), {
    ...allowed,
    transformTags: { a: (tag, attribs) => ({ tagName: 'a', attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' } }) }
  });
  return out;
}

function textOf(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractMentions(text) {
  const set = new Set();
  const re = /@([A-Za-z0-9_]{3,20})/g;
  let m;
  const plain = String(text || '');
  while ((m = re.exec(plain))) set.add(m[1]);
  return [...set];
}

module.exports = { cleanRich, textOf, extractMentions };
