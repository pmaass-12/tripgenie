// supabase-config.js — Returns public Supabase config (URL + anon key) to the client.
// The anon key is safe to expose: it's designed for browser use and RLS policies
// on the trips table ensure users only see their own data.
exports.handler = async () => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600'
  },
  body: JSON.stringify({
    url:     process.env.SUPABASE_URL      || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  })
});
