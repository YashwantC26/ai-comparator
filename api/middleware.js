// Security middleware for all serverless API functions

const ALLOWED_ORIGINS = [
  'https://ai-comparator-gules.vercel.app',
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1',
];

const MAX_BODY_BYTES = 2 * 1024; // 2KB
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const REQUEST_TIMEOUT_MS = 10 * 1000; // 10 seconds

// In-memory rate limit store: { ip -> { count, windowStart } }
const rateLimitStore = new Map();

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

function checkOrigin(req) {
  const origin = req.headers['origin'] || '';
  const referer = req.headers['referer'] || '';

  // Allow if no origin/referer (e.g. server-to-server or direct curl in dev)
  if (!origin && !referer) {
    return true;
  }

  const check = (value) =>
    ALLOWED_ORIGINS.some((allowed) => value === allowed || value.startsWith(allowed + '/'));

  return check(origin) || check(referer);
}

function checkRequestSize(req) {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return false;
  }
  // Also check actual body string length if already parsed
  if (req.body) {
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(bodyStr, 'utf8') > MAX_BODY_BYTES) {
      return false;
    }
  }
  return true;
}

function sanitizeInput(value) {
  if (typeof value !== 'string') return '';
  return value
    // Remove script tags and their content
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove HTML entities that could be used for injection
    .replace(/&(?:lt|gt|amp|quot|apos|#\d+|#x[\da-f]+);/gi, '')
    // Strip null bytes
    .replace(/\0/g, '')
    // Trim whitespace
    .trim();
}

function setCORSHeaders(req, res) {
  const origin = req.headers['origin'] || '';
  const isAllowed = ALLOWED_ORIGINS.some(
    (allowed) => origin === allowed || origin.startsWith(allowed + '/')
  );

  res.setHeader(
    'Access-Control-Allow-Origin',
    isAllowed ? origin : 'https://ai-comparator-gules.vercel.app'
  );
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
}

/**
 * Wraps a promise with a timeout. Rejects with a timeout error if ms elapses first.
 */
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Apply all security middleware checks.
 * Returns true if all checks pass (request may proceed).
 * Returns false and sends an error response if any check fails.
 */
function applyMiddleware(req, res) {
  // Handle CORS preflight
  setCORSHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }

  // 1. Origin validation
  if (!checkOrigin(req)) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }

  // 2. Rate limiting
  const ip = getClientIP(req);
  if (!checkRateLimit(ip)) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Too Many Requests' });
    return false;
  }

  // 3. Request size limiting
  if (!checkRequestSize(req)) {
    res.status(413).json({ error: 'Request Entity Too Large' });
    return false;
  }

  // 4. Input sanitization — mutate req.body.task in place if present
  if (req.body && typeof req.body.task === 'string') {
    req.body.task = sanitizeInput(req.body.task);
  }

  return true;
}

module.exports = { applyMiddleware, withTimeout, REQUEST_TIMEOUT_MS };
