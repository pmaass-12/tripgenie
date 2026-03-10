# TripGenie — Supabase Auth Implementation

Three things need to land together. Do them in this order.

---

## Part 1 — Add the supabase-js script tag

**This is the root cause of everything not working.** The library is never loaded,
so `typeof supabase === 'undefined'` is always true, and `_initSbClient()` always
returns `null`.

Add this `<script>` tag **in `<head>`, before the closing `</head>` tag**, alongside
the other CDN scripts:

```html
<!-- supabase-js v2 — must load before any script that calls supabase.createClient() -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Place it right after the existing `exifr` script line (line 16), like this:

```html
<script src="https://unpkg.com/exifr@7.1.3/dist/lite.umd.js" ...></script>

<!-- ADD THIS: -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

**Why this CDN?** The `@supabase/supabase-js` package on jsDelivr is the official build.
It exposes a global `supabase` object with `supabase.createClient()`, which is exactly
what `_initSbClient()` already expects.

---

## Part 2 — Wire up `onAuthStateChange`

Replace `_tryAutoLogin()` with a Supabase-native auth listener. This solves page-reload
sessions, token refresh, and cross-tab logout automatically — with no localStorage
management needed.

### 2a. The new `_initAuth()` function

This replaces the `if (!_tryAutoLogin())` call at the bottom of the page-load IIFE.
Insert this function near `_initSbClient()`, around line 5688:

```javascript
/* ── AUTH BOOTSTRAP — call once at page load ─────────────────────
   Initializes the Supabase client and subscribes to auth state.
   Fires immediately with the current session (INITIAL_SESSION event)
   so the page-reload case is handled identically to a fresh login.    */
function _initAuth() {
  var client = _initSbClient();
  if (!client) {
    // supabase-js not loaded (offline / CDN blocked) — fall through to legacy
    _tryAutoLogin();
    return;
  }

  client.auth.onAuthStateChange(function(event, session) {

    /* ── Session present (login, page reload, token refresh) ── */
    if (session && session.user) {
      _sbUser = session.user;

      // Hide the login screen if it's still showing
      var loginEl = document.getElementById('login-screen');
      var loginOv = document.getElementById('login-overlay');
      if (loginEl && !loginEl.classList.contains('hidden')) {
        // We have a session on page load (INITIAL_SESSION) —
        // go straight to the profile check, skip the login form
        _showProfilePicker();
      }
      // If we're already in the app (token refresh), do nothing visible
      return;
    }

    /* ── No session (sign-out, expired token, first visit) ── */
    _sbUser         = null;
    _currentTripId  = null;
    _authed         = false;
    _userName       = '';

    // Only redirect to login if the app is currently showing
    var appEl = document.getElementById('app');
    if (appEl && !appEl.classList.contains('hidden')) {
      appEl.classList.add('hidden');
      var ls = document.getElementById('login-screen');
      if (ls) ls.classList.remove('hidden');
    }
  });
}
```

### 2b. Update the page-load IIFE

Find the block starting at line ~7066 that reads:

```javascript
if (!_tryAutoLogin()) {
  setTimeout(function() {
    var e = document.getElementById('email-input');
    if (e) e.focus();
  }, 120);
}
```

Replace it with:

```javascript
// NEW: Supabase auth handles session restore; _tryAutoLogin() is the legacy fallback
// inside _initAuth() when supabase-js isn't available.
_initAuth();

// Focus the email field only if we're still on the login screen after a short
// delay — gives onAuthStateChange time to fire for returning users.
setTimeout(function() {
  var ls = document.getElementById('login-screen');
  if (ls && !ls.classList.contains('hidden')) {
    var e = document.getElementById('email-input');
    if (e) e.focus();
  }
}, 300);
```

### 2c. Update `_showProfilePicker()` to handle the "already has a profile" fast path

When `onAuthStateChange` fires `INITIAL_SESSION` on page reload, `_showProfilePicker()`
runs. It currently reads from localStorage. Update it to also check Supabase:

```javascript
async function _showProfilePicker() {
  if (!_sbUser) {
    // ── Legacy / guest path ─────────────────────────────────────────
    var _sp = null;
    try { _sp = JSON.parse(localStorage.getItem('rv_profile_guest')); } catch(e) {}
    if (_sp && _sp.name) { _applyProfile(_sp.name, _sp.color || '#2C5F8A'); return; }
    var ov = document.getElementById('profile-picker-overlay');
    if (ov) ov.style.display = 'flex';
    return;
  }

  // ── Supabase path: check profiles table for saved name/color ───────
  var client = _initSbClient();
  if (!client) { /* fall back to overlay */ }
  else {
    var { data } = await client
      .from('profiles')
      .select('display_name, avatar_color')
      .eq('id', _sbUser.id)
      .maybeSingle();   // null (not error) when row doesn't exist yet

    if (data && data.display_name) {
      // Returning user — apply immediately, skip picker overlay
      _applyProfile(data.display_name, data.avatar_color || '#2C5F8A');
      return;
    }
  }

  // First-time user (no profile row yet) — show the picker
  var ov = document.getElementById('profile-picker-overlay');
  if (ov) ov.style.display = 'flex';
}
```

### 2d. Update the logout handlers

Both logout paths need to call `client.auth.signOut()`. `onAuthStateChange` then fires
`SIGNED_OUT` and handles the UI automatically — no manual DOM manipulation needed.

```javascript
// Replace the logout-btn click listener (around line 6883):
document.getElementById('logout-btn').addEventListener('click', async function() {
  var client = _initSbClient();
  if (client && _sbUser) {
    await client.auth.signOut();
    // onAuthStateChange(SIGNED_OUT) handles the rest
  } else {
    // Legacy path
    _authed = false;
    localStorage.removeItem('rv_session');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('password-input').value = '';
  }
});

// Replace _sbSignOut() (around line 6636):
async function _sbSignOut() {
  var client = _initSbClient();
  if (client) await client.auth.signOut();
  // onAuthStateChange fires SIGNED_OUT → clears _sbUser, resets UI
  // No need to touch localStorage or call window.location.reload()
}
```

---

## Part 3 — Row Level Security (RLS) and user-scoped queries

### 3a. Run this SQL in the Supabase Dashboard → SQL Editor

This is the complete RLS setup for every table the app touches. Run it once.

```sql
-- ════════════════════════════════════════════════════════
--  TripGenie RLS Setup
--  Run in: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════

-- ── profiles ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  avatar_color  TEXT NOT NULL DEFAULT '#2C5F8A',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Each user can only see and modify their own profile
CREATE POLICY "profiles_owner" ON profiles
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── trips ─────────────────────────────────────────────────
-- (table already exists; just add RLS if not present)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
-- Users see only their own trips
CREATE POLICY "trips_owner" ON trips
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- Allow unauthenticated reads for the ?guest= share link
CREATE POLICY "trips_public_read" ON trips
  FOR SELECT USING (true);

-- ── trip_state (legacy shared KV table) ───────────────────
-- This is the SUPA_TABLE used by loadFromCloud/saveToCloud.
-- It's a shared row (id = 'maass_family'), so keep it open.
-- No RLS change needed for this table unless you want to
-- lock it down to specific users later.

-- ── trip_suggestions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_suggestions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     TEXT,
  stop_id     TEXT,
  stop_name   TEXT,
  first_name  TEXT,
  last_name   TEXT,
  suggestion  TEXT,
  source      TEXT NOT NULL DEFAULT 'guest'
                CHECK (source IN ('family', 'guest')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE trip_suggestions ENABLE ROW LEVEL SECURITY;
-- Anyone can submit a suggestion (guest link)
CREATE POLICY "suggestions_public_insert" ON trip_suggestions
  FOR INSERT WITH CHECK (true);
-- Anyone can read suggestions (family members see friend tips)
CREATE POLICY "suggestions_public_read" ON trip_suggestions
  FOR SELECT USING (true);
-- Only authenticated users can delete (family cleaning up spam)
CREATE POLICY "suggestions_auth_delete" ON trip_suggestions
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ════════════════════════════════════════════════════════
--  Verify policies were created:
-- ════════════════════════════════════════════════════════
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('profiles', 'trips', 'trip_suggestions')
ORDER BY tablename, cmd;
```

### 3b. Fix `_showMyTrips()` — add belt-and-suspenders `user_id` filter

RLS handles isolation at the database level, but it's good practice to also filter in
the query so that the intent is explicit and logs are readable.

Find `_showMyTrips()` around line 6260:

```javascript
// BEFORE (line 6270):
var { data, error } = await client.from('trips')
  .select('id,name,start_date,end_date,updated_at')
  .order('updated_at', { ascending: false });

// AFTER — explicit user_id filter in addition to RLS:
var { data, error } = await client.from('trips')
  .select('id,name,start_date,end_date,updated_at')
  .eq('user_id', _sbUser.id)          // <── add this line
  .order('updated_at', { ascending: false });
```

### 3c. Fix `_syncToSupabaseTrips()` — add `user_id` guard on update

Find `_syncToSupabaseTrips()` around line 6626:

```javascript
// BEFORE:
await client.from('trips').update({
  trip_data:  state,
  name:       ...,
  updated_at: ...
}).eq('id', _currentTripId);

// AFTER — add user_id to the filter so a stale _currentTripId can never
// accidentally overwrite another user's trip (belt-and-suspenders):
await client.from('trips').update({
  trip_data:  state,
  name:       ...,
  updated_at: ...
})
.eq('id', _currentTripId)
.eq('user_id', _sbUser.id);   // <── add this line
```

### 3d. Fix `_openTrip()` — add `user_id` guard on select

Find `_openTrip()` around line 6313:

```javascript
// BEFORE:
var { data, error } = await client.from('trips')
  .select('trip_data,name')
  .eq('id', tripId)
  .single();

// AFTER:
var { data, error } = await client.from('trips')
  .select('trip_data,name')
  .eq('id', tripId)
  .eq('user_id', _sbUser.id)   // <── add this line
  .single();
```

### 3e. Fix `_deleteTrip()` — already has no user_id guard

Find `_deleteTrip()` around line 6332:

```javascript
// BEFORE:
var { error } = await client.from('trips').delete().eq('id', tripId);

// AFTER:
var { error } = await client.from('trips')
  .delete()
  .eq('id', tripId)
  .eq('user_id', _sbUser.id);   // <── add this line
```

---

## How `_sbUser.id` flows through every query

Once Parts 1–3 are in place, this is the complete data-isolation chain for a logged-in user:

```
user logs in
  └─ client.auth.signInWithPassword()
       └─ Supabase issues JWT containing { sub: "<user_uuid>" }
            └─ onAuthStateChange fires
                 └─ _sbUser = session.user   (contains .id = user UUID)
                      ├─ profiles query:     .eq('id', _sbUser.id)
                      ├─ trips INSERT:       user_id: _sbUser.id
                      ├─ trips SELECT:       .eq('user_id', _sbUser.id)
                      ├─ trips UPDATE:       .eq('user_id', _sbUser.id)
                      ├─ trips DELETE:       .eq('user_id', _sbUser.id)
                      └─ RLS (server-side):  auth.uid() = user_id  ← enforced even
                                             if JS filter is missing
```

The JWT (`_sbUser.id`) is automatically attached to every request by the supabase-js
client as a Bearer token. The server-side RLS policy reads `auth.uid()` from that token
and rejects any row whose `user_id` doesn't match — even if a bug in the JS code
forgets to add `.eq('user_id', ...)`.

---

## Quick verification checklist

After deploying all three parts, test this sequence:

1. **Hard-reload the page** → should stay logged in (Supabase session restored via
   `onAuthStateChange` with `INITIAL_SESSION`)
2. **Open a second browser tab** → log out in one tab → the other tab should also
   redirect to login (Supabase broadcasts `SIGNED_OUT` cross-tab automatically)
3. **In Supabase Dashboard → Authentication → Users**, create a second test user →
   log in as that user → "My Trips" should show zero trips (RLS is working)
4. **In SQL Editor**, run:
   ```sql
   SELECT id, user_id, name FROM trips ORDER BY updated_at DESC LIMIT 10;
   ```
   Every row's `user_id` should match your Supabase user UUID.

---

## What stays as legacy (no change needed yet)

- `_tryAutoLogin()` and `_saveSession()` — kept as the fallback path inside
  `_initAuth()` for when supabase-js fails to load (offline / CDN blocked)
- `loadFromCloud()` / `_doCloudSave()` — these use the shared `trip_state` table
  via raw `fetch()` and don't need user isolation (it's the Maass family's shared row)
- `SUPA_KEY` (anon key) — this is public and safe to leave in the source. It's the
  *service role key* that must never be in browser code; the anon key is designed to be
  visible and is controlled entirely by RLS policies.
