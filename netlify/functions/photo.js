/**
 * Netlify function: photo blob storage proxy
 *
 * Stores photos in Netlify Blob Storage so they're accessible from
 * any device — not just the one where they were uploaded.
 *
 * Endpoints
 * ─────────
 * POST /.netlify/functions/photo
 *   { action: 'upload', id, data, isThumb, meta }
 *   data     — data URL: "data:image/jpeg;base64,..."
 *   isThumb  — true for 200px thumbnail, false/omitted for full-res
 *   meta     — { fileName, timestamp, stopId, exif }
 *   → { ok: true, url: '/.netlify/functions/photo?id=xxx' }
 *
 * GET /.netlify/functions/photo?id=xxx
 *   → serves the blob with aggressive cache headers
 *
 * POST /.netlify/functions/photo
 *   { action: 'delete', id }
 *   → { ok: true }
 *
 * Security
 * ────────
 * • ALLOWED_ORIGINS env var limits which sites may call the function
 * • PHOTO_UPLOAD_TOKEN env var — if set, all write requests must include
 *   a matching `token` field.  Leave unset to allow all origins defined
 *   in ALLOWED_ORIGINS (safe for a private family app).
 */

const { getStore } = require('@netlify/blobs');

const MAX_UPLOAD_BYTES = 12_000_000;   // 12 MB raw body ceiling

/* getStore must be called INSIDE the handler, not at module load time.
   The Netlify Blobs context (site ID + token) is injected via environment
   variables that are only available during function execution, not at cold-start. */

/* ── CORS helpers (mirrors gemini.js pattern) ─────────────────── */
function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

function isOriginAllowed(event) {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return true;
  const origin = (event.headers.origin || event.headers.referer || '').toLowerCase();
  return allowed.some(a => origin.startsWith(a));
}

function corsHeaders(event) {
  const allowed = getAllowedOrigins();
  const origin  = (event.headers.origin || '').toLowerCase();
  const useOrigin = (allowed.length === 0 || allowed.some(a => origin.startsWith(a)))
    ? (event.headers.origin || '*')
    : 'null';
  return {
    'Access-Control-Allow-Origin':  useOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

/* ── Main handler ─────────────────────────────────────────────── */
exports.handler = async function (event, context) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(event), body: '' };
  }

  /* ── GET ?action=health  — diagnostic endpoint (no origin check) ── */
  if (event.httpMethod === 'GET' && (event.queryStringParameters || {}).action === 'health') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(event) },
      body: JSON.stringify({
        ok: true,
        hasBlobsContext: !!process.env.NETLIFY_BLOBS_CONTEXT,
        hasSiteId:       !!process.env.SITE_ID,
        nodeVersion:     process.version,
        blobsPkg:        (() => { try { return require('@netlify/blobs/package.json').version; } catch(e) { return 'MISSING: ' + e.message; } })(),
      }),
    };
  }

  if (!isOriginAllowed(event)) {
    return { statusCode: 403, headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ error: 'Forbidden' }) };
  }

  /* Instantiate store inside the handler so Netlify's blobs context is available.
     Calling getStore at module level causes 502 on cold-start because the
     NETLIFY_BLOBS_CONTEXT env is only injected during handler execution.
     Pass siteID explicitly as some Netlify environments require it.          */
  let store;
  try {
    const _storeOpts = { name: 'tripgenie-photos' };
    if (process.env.SITE_ID) _storeOpts.siteID = process.env.SITE_ID;
    store = getStore(_storeOpts);
  } catch (e) {
    console.error('getStore failed:', e.message);
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(event) },
      body: JSON.stringify({ error: 'Blob storage unavailable: ' + e.message }),
    };
  }

  /* ── GET: serve a stored photo ──────────────────────────────── */
  if (event.httpMethod === 'GET') {
    const id = (event.queryStringParameters || {}).id;
    if (!id || id.length > 200) {
      return { statusCode: 400, headers: corsHeaders(event), body: 'Missing or invalid id' };
    }

    try {
      const { data, metadata } = await store.getWithMetadata(id, { type: 'arrayBuffer' });
      if (!data) {
        return { statusCode: 404, headers: corsHeaders(event), body: 'Not found' };
      }

      const mime = (metadata && metadata.mime) || 'image/jpeg';
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders(event),
          'Content-Type':  mime,
          // Long cache — photos are immutable once uploaded
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body:            Buffer.from(data).toString('base64'),
        isBase64Encoded: true,
      };
    } catch (e) {
      return { statusCode: 404, headers: corsHeaders(event), body: 'Not found' };
    }
  }

  /* ── POST: upload or delete ─────────────────────────────────── */
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Body size guard (base64 is ~33% larger than binary)
  const bodyLen = event.isBase64Encoded
    ? Math.round((event.body || '').length * 0.75)
    : (event.body || '').length;
  if (bodyLen > MAX_UPLOAD_BYTES) {
    return {
      statusCode: 413,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(event) },
      body: JSON.stringify({ error: 'Photo too large — max 12 MB' }),
    };
  }

  let payload;
  try { payload = JSON.parse(event.body); }
  catch (e) {
    return { statusCode: 400, headers: corsHeaders(event),
             body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // Upload token check — skip if env var is not set
  const uploadToken = process.env.PHOTO_UPLOAD_TOKEN;
  if (uploadToken && payload.token !== uploadToken) {
    return { statusCode: 401, headers: corsHeaders(event),
             body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  /* ── action: upload ─────────────────────────────────────────── */
  if (payload.action === 'upload') {
    const { id, data, isThumb, meta } = payload;
    if (!id || !data || typeof id !== 'string' || id.length > 200) {
      return { statusCode: 400, headers: corsHeaders(event),
               body: JSON.stringify({ error: 'Missing or invalid id / data' }) };
    }

    // Parse data URL  →  Buffer
    const match = data.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return { statusCode: 400, headers: corsHeaders(event),
               body: JSON.stringify({ error: 'data must be a base64 data URL' }) };
    }
    const mimeType = match[1];
    const buffer   = Buffer.from(match[2], 'base64');

    // Key: "{id}" for full-res, "{id}-t" for thumbnail
    const key = isThumb ? (id + '-t') : id;

    await store.set(key, buffer, {
      metadata: {
        mime:      mimeType,
        fileName:  (meta && meta.fileName)  || '',
        timestamp: (meta && meta.timestamp) || '',
        stopId:    (meta && meta.stopId != null) ? String(meta.stopId) : '',
      },
    });

    const url = '/.netlify/functions/photo?id=' + encodeURIComponent(key);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(event) },
      body: JSON.stringify({ ok: true, url }),
    };
  }

  /* ── action: delete ─────────────────────────────────────────── */
  if (payload.action === 'delete') {
    const { id } = payload;
    if (!id) {
      return { statusCode: 400, headers: corsHeaders(event),
               body: JSON.stringify({ error: 'Missing id' }) };
    }
    // Delete both full-res and thumbnail entries (ignore 404)
    try { await store.delete(id); }       catch (e) {}
    try { await store.delete(id + '-t'); } catch (e) {}

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(event) },
      body: JSON.stringify({ ok: true }),
    };
  }

  return {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(event) },
    body: JSON.stringify({ error: 'Unknown action' }),
  };
};
