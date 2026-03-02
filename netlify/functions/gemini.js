/**
 * Netlify serverless function: Gemini API proxy
 *
 * Security hardening:
 *   - Only accepts POST (OPTIONS for preflight)
 *   - Origin check: set ALLOWED_ORIGINS in Netlify env vars to a comma-separated
 *     list of allowed origins, e.g. "https://tripgenie.netlify.app,http://localhost"
 *     If ALLOWED_ORIGINS is not set, all origins are allowed (fallback for dev).
 *   - Request body capped at 200 KB to prevent prompt-stuffing abuse
 *   - GEMINI_KEY is never exposed to the browser — stays in env vars
 *
 * Frontend calls:  POST /.netlify/functions/gemini
 *                  Body: same JSON body as the Gemini API expects
 */

const MAX_BODY_BYTES = 200_000; // 200 KB

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

function isOriginAllowed(event) {
  const allowed = getAllowedOrigins();
  // If no allowlist configured, permit all (backward-compatible during migration)
  if (allowed.length === 0) return true;
  const origin = (event.headers.origin || event.headers.referer || '').toLowerCase();
  return allowed.some(a => origin.startsWith(a));
}

function corsHeaders(event) {
  // Echo back the request's Origin if it's in the allowlist; otherwise omit.
  const allowed = getAllowedOrigins();
  const origin  = (event.headers.origin || '').toLowerCase();
  const useOrigin = (allowed.length === 0 || allowed.some(a => origin.startsWith(a)))
    ? (event.headers.origin || '*')
    : 'null';
  return {
    'Access-Control-Allow-Origin':  useOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

exports.handler = async function (event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(event), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Origin guard
  if (!isOriginAllowed(event)) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Forbidden' }),
    };
  }

  // Body size guard
  if (event.body && event.body.length > MAX_BODY_BYTES) {
    return {
      statusCode: 413,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(event) },
      body: JSON.stringify({ error: 'Request too large' }),
    };
  }

  const key = process.env.GEMINI_KEY;
  if (!key) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(event) },
      body: JSON.stringify({ error: 'GEMINI_KEY environment variable not set on server.' }),
    };
  }

  const GEMINI_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=';

  try {
    const response = await fetch(GEMINI_URL + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body,
    });

    const data = await response.text();

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(event) },
      body: data,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(event) },
      body: JSON.stringify({ error: 'Proxy error: ' + err.message }),
    };
  }
};
