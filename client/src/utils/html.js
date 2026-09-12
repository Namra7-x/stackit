import DOMPurify from 'dompurify';

export function safeHtml(html) {
  return DOMPurify.sanitize(String(html || ''), {
    ADD_ATTR: ['target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|data:image\/(?:png|gif|jpeg|webp|svg\+xml)):[^ ]*|[^ :]*)$/i
  });
}

export function plainText(html, len = 160) {
  const d = document.createElement('div');
  d.innerHTML = String(html || '');
  return (d.textContent || '').trim().slice(0, len);
}
