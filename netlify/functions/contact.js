/**
 * Serverless contact-form handler (Netlify Functions).
 *
 * Everything the browser sends is untrusted, regardless of what the
 * client-side validation already did. This function re-validates,
 * re-sanitizes, rate-limits, and only then would hand the message to a
 * transactional email provider.
 *
 * To wire up real delivery, set EMAIL_PROVIDER_API_KEY and EMAIL_TO in the
 * site's environment variables and call your provider's API where the
 * TODO below is. Until then, the function validates and accepts
 * submissions but does not send email.
 */

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || null; // e.g. "https://blzvisual.com"
const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

// Best-effort only: persists per warm function instance, not globally
// consistent across concurrent instances. For durable rate limiting in
// production, back this with a shared store (e.g. Upstash Redis).
const hits = new Map();

const NAME_RE = /^[\p{L}\p{M}\s'.-]{2,100}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CRLF_RE = /[\r\n]/;

const jsonHeaders = (origin) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
});

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));

const isAllowedOrigin = (origin) => {
  if (!ALLOWED_ORIGIN) return true; // same-origin deployments: no cross-site callers expected
  return origin === ALLOWED_ORIGIN;
};

const getClientIp = (event) =>
  event.headers['x-nf-client-connection-ip'] ||
  (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  'unknown';

const isRateLimited = (ip) => {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    hits.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
};

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || '';

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...jsonHeaders(isAllowedOrigin(origin) ? origin : ''),
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: jsonHeaders(), body: JSON.stringify({ error: 'method_not_allowed' }) };
  }

  if (!isAllowedOrigin(origin)) {
    return { statusCode: 403, headers: jsonHeaders(), body: JSON.stringify({ error: 'origin_not_allowed' }) };
  }

  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
  if (!contentType.includes('application/json')) {
    return { statusCode: 415, headers: jsonHeaders(origin), body: JSON.stringify({ error: 'unsupported_media_type' }) };
  }

  const rawBody = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '';
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return { statusCode: 413, headers: jsonHeaders(origin), body: JSON.stringify({ error: 'payload_too_large' }) };
  }

  const ip = getClientIp(event);
  if (isRateLimited(ip)) {
    return { statusCode: 429, headers: jsonHeaders(origin), body: JSON.stringify({ error: 'rate_limited' }) };
  }

  let data;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, headers: jsonHeaders(origin), body: JSON.stringify({ error: 'invalid_json' }) };
  }

  if (!data || typeof data !== 'object') {
    return { statusCode: 400, headers: jsonHeaders(origin), body: JSON.stringify({ error: 'invalid_body' }) };
  }

  // Honeypot: a bot that fills every field trips this. Never trust the client's own check.
  if (typeof data.company === 'string' && data.company.trim() !== '') {
    return { statusCode: 200, headers: jsonHeaders(origin), body: JSON.stringify({ ok: true }) };
  }

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const message = typeof data.message === 'string' ? data.message.trim() : '';

  const fieldErrors = {};
  if (!NAME_RE.test(name)) fieldErrors.name = 'invalid';
  if (!EMAIL_RE.test(email) || email.length > 254 || CRLF_RE.test(email)) fieldErrors.email = 'invalid';
  if (message.length < 10 || message.length > 2000) fieldErrors.message = 'invalid';

  if (Object.keys(fieldErrors).length > 0) {
    return { statusCode: 422, headers: jsonHeaders(origin), body: JSON.stringify({ error: 'validation_failed', fields: fieldErrors }) };
  }

  const safe = {
    name: escapeHtml(name),
    email: escapeHtml(email),
    message: escapeHtml(message),
  };

  // TODO: send `safe` via a transactional email API (Resend, SendGrid, Postmark, ...)
  // using EMAIL_PROVIDER_API_KEY / EMAIL_TO from environment variables. Do not
  // build raw SMTP "From"/"Subject" headers from user input — use the
  // provider's structured fields to avoid header-injection.
  console.log('contact_form_submission', { ip, name: safe.name, email: safe.email });

  return { statusCode: 200, headers: jsonHeaders(origin), body: JSON.stringify({ ok: true }) };
};
