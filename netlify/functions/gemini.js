/**
 * Netlify serverless function: Gemini API proxy
 *
 * Keeps the GEMINI_KEY out of the browser/repo.
 * Set GEMINI_KEY in Netlify → Site Settings → Environment Variables.
 *
 * Frontend calls:  POST /.netlify/functions/gemini
 *                  Body: same JSON body as the Gemini API expects
 * This function:   Forwards to Gemini, returns the response.
 */

exports.handler = async function (event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const key = process.env.GEMINI_KEY;
  if (!key) {
    return {
      statusCode: 500,
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
      headers: { 'Content-Type': 'application/json' },
      body: data,
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Proxy error: ' + err.message }),
    };
  }
};
