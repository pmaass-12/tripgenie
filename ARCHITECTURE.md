# ARCHITECTURE.md — TripGenie System Design
> Read this alongside CONTRACTS.md before touching any of the systems below.
> This file explains HOW the major systems connect and WHERE bugs are likely to hide.
> The "Why it breaks" sections document real bugs that have recurred — read them.

---

## 1. THE DATA FLOW: from user action to all devices

```
User action
    │
    ▼
appState (in-memory JS object — single source of truth at runtime)
    │
    ├─► localStorage 'rv_state'     (offline cache / fast reload)
    │
    ├─► syncToCloud()               (legacy REST path — non-authenticated users only)
    │       └─► trip_state table    (shared, single row 'maass_family')
    │
    └─► _syncToSupabaseTrips()      (primary path — authenticated users)
            └─► trips table         (per-user row, keyed by _currentTripId)
                    │
                    └─► Supabase Realtime ──► all other open devices
                                                    │
                                                    ▼
                                            _startRealtimeSync() handler
                                                    │
                                                    ▼
                                            _smartMergeStates(local, incoming)
                                                    │
                                                    ▼
                                            appState = merged
                                            localStorage updated
                                            _refreshAll(true)
```

**Key timing:** `_syncToSupabaseTrips()` is debounced by **1200ms**. `syncToCloud()` by **1800ms**.
Changes are not instant — there's always a short delay before Supabase gets the write.

---

## 2. SYNC SYSTEM — the three paths and when each fires

### Path A: Legacy REST (non-authenticated / guest)
- `saveState()` → `syncToCloud()` → `_doCloudSave()` → POST to `trip_state` table
- Uses `SUPA_TABLE` / `SUPA_ROW` constants
- No per-user isolation — anyone with the URL can overwrite

### Path B: Supabase Auth (primary)
- `saveState()` → `_syncToSupabaseTrips()` → UPDATE `trips` WHERE `id = _currentTripId`
- Requires `_sbUser` and `_currentTripId` to be set
- `_currentTripId` is set during `_doLegacyInitAfterSbAuth()` after successful login
- **If either is null, the save silently does nothing**

### Path C: Realtime (push to other devices)
- Triggered automatically when Path B writes to Supabase
- `_startRealtimeSync()` subscribes to `postgres_changes` on `trips` WHERE `id = _currentTripId`
- Handler receives `payload.new.trip_data` and merges it into local appState
- **Must be called AFTER `_currentTripId` is set** — `_doLegacyInitAfterSbAuth()` calls it

### What `saveState()` actually does
```js
function saveState(state) {
  state._savedAt  = new Date().toISOString(); // timestamp for merge conflict resolution
  state._savedBy  = _userName;                // display name
  state._deviceId = _deviceId;               // per-session ID for realtime dedup
  localStorage.setItem('rv_state', ...);     // always
  syncToCloud(state);                        // Path A — only does work if !_sbUser
  if (_sbUser) _syncToSupabaseTrips(state);  // Path B — only does work if _sbUser set
}
```

---

## 3. SMART MERGE — what it covers and what it doesn't

`_smartMergeStates(a, b)` is called when two devices have diverged.
It deep-copies the **newer** snapshot (by `_savedAt`) as the base, then
**unions additive data** from the older side.

### Currently merged (additive — both sides contribute)
- `customBookings` — unioned by id
- `bookingConfirmations` — unioned per stopId by booking id *(added in sync fix)*
- `aiSuggestions` — unioned by id
- `photoPool` — unioned by id (full-res dataUrl patched back from local copy)
- `journalEntries` — unioned by id
- `savedPostcards` — unioned by id/created
- `customListItems.todo` / `.pack` — unioned by text
- `bookingStatus` — merged; true wins
- `listChecked` / `listHidden` — merged; true wins

### Currently merged (additive per key — newer side wins on collision)
- `arrivals`, `departures`, `dayNotes`, `drivers`
- `planned`, `weather`, `stopMinVisit`, `customActivities`, `aiActivityIdx`
- `phaseExtraDays`, `removedStops`, `stayType`
- `dayOverrides`, `sleepOverrides`, `stopCityNames`
- `day_*` keys (per-day state objects)
- `profiles` — unioned by name

### NOT merged — newer _savedAt wins entirely
Everything not listed above. This includes: `tripSettings`, `customTripData`,
`drivingPrefs`, `darkMode`, `expenses`, `rvLog`, `games`, and all other scalar prefs.
**Rationale:** these are structural/preference data typically only edited by one person.

### Why this matters for bugs
If two devices both edit `expenses` simultaneously, one set of edits will be lost.
This is a known limitation, not a bug. Only booking/photo/journal/list data is
safely multi-device additive.

---

## 4. THE DOM-WIPE PROBLEM — the #1 source of recurring bugs

**`renderStops()` destroys and rebuilds the entire `#stops-content` DOM on every call.**

This means:
- All `stop-detail-{id}` divs are recreated as `hidden`
- All `stop-events-body-{id}` divs are empty
- All `stop-attractions-body-{id}` divs are empty
- All `stop-restaurants-body-{id}` divs are empty

`renderStops()` is called by `_refreshAll()`, which is called from:
- Any stop add/remove/reorder
- Any plan/unplan action (via planStopEvent, planActivity, etc.)
- Realtime sync receiving an update from another device
- Schedule recalculation
- ~20 other places

### The cache variable trap
The in-memory caches `_stopEventsLoaded`, `_stopAttractionsLoaded`, `_stopRestaurantsLoaded`
are **NOT reset when renderStops() runs**. They survive the DOM wipe.

This creates the following failure sequence:
1. User opens Events panel → `_stopEventsLoaded[stopId] = true` → fetch fires → results render
2. User plans an activity → `renderStops()` called → DOM wiped → panel body is now empty
3. User opens Events panel again → toggle checks `_stopEventsLoaded[stopId]` → already `true` → **fetch skipped → empty panel**

### The correct fix (already applied to Attractions, not yet to Events/Restaurants)
Move the "already loaded" check **inside the loader function**, not in the toggle.
The toggle always calls the loader. The loader checks whether the body already
has real content before firing the API call.

```js
// CORRECT (Attractions pattern):
function toggleStopAttractions(stopId) {
  panel.classList.toggle('hidden');
  if (isHidden) {
    loadStopAttractions(stopId); // always call — cache check is inside
  }
}
function loadStopAttractions(stopId) {
  var body = document.getElementById('stop-attractions-body-' + stopId);
  if (body && body.children.length > 0 && !body.querySelector('.fa-spinner')) return; // already loaded
  // ... fetch ...
}

// BROKEN (Events/Restaurants pattern — do not copy):
function toggleStopEvents(stopId) {
  if (isHidden && !_stopEventsLoaded[stopId]) { // ← wrong place for cache check
    _stopEventsLoaded[stopId] = true;
    loadStopEvents(stopId);
  }
}
```

---

## 5. OSRM DRIVE CACHE — two caches, one is dangerous

### `appState.osrmDriveCache` — LEGACY, STALE-PRONE
- Keyed by **day number**: `osrmDriveCache[dayNum]`
- Each entry stores `{ miles, driveHours, fromId, toId }`
- **Goes stale when stops are reordered**: day 5 might now be a different stop pair
- The `fromId`/`toId` fields were added later to detect staleness — check them before trusting miles
- Render code in `_renderDriveSepA()` cross-checks fromId/toId against the actual stop pair

### `appState.osrmVirtualCache` — PREFERRED, NEVER STALE
- Keyed by **stop pair**: `osrmVirtualCache[fromId + '_' + toId]`
- Never goes stale regardless of trip restructuring
- Always check this first before falling back to `osrmDriveCache`

### Rule for any new drive-time code
```js
// Always prefer osrmVirtualCache:
var key = String(fromStopId) + '_' + String(toStopId);
var cached = appState.osrmVirtualCache && appState.osrmVirtualCache[key];
if (!cached) {
  // fall back to osrmDriveCache only if fromId/toId match
  var dc = appState.osrmDriveCache && appState.osrmDriveCache[dayNum];
  if (dc && String(dc.fromId) === String(fromStopId) && String(dc.toId) === String(toStopId)) {
    cached = dc;
  }
}
```

---

## 6. REALTIME SYNC — how it works and known failure modes

### Setup
`_startRealtimeSync()` creates a Supabase channel `'trip-realtime-' + _currentTripId`
and subscribes to `postgres_changes` (UPDATE events on `trips` table).

It is called exactly once: inside `_doLegacyInitAfterSbAuth()` after `_currentTripId` is set.
If you add any code that resets `_currentTripId`, you must call `_startRealtimeSync()` again.

### The self-filter
Incoming updates are tagged with `_deviceId` (a per-session random string set at page load).
Updates from the **same device/tab** are ignored to prevent echo loops.
Updates from **other devices** — even with the same user account — are always processed.

**Do not use `_userName` for deduplication** — family members may share an account,
making `_userName` identical on multiple devices, which would cause all realtime
updates to be silently ignored.

### What happens on receiving an update
```
incoming payload arrives
    │
    ├─► if incoming._deviceId === _deviceId → SKIP (our own save echoed back)
    │
    ├─► if incomingTs <= localTs → SKIP (we're already newer)
    │
    └─► _saveLocalBackup(appState)          // recovery copy before overwrite
        merged = _smartMergeStates(appState, incoming)
        appState = merged
        localStorage.setItem(...)
        _refreshAll(true)
        showToast('☁️ Live update from ' + who)
```

### Common failure modes
| Symptom | Likely cause |
|---|---|
| Changes on Device A not appearing on Device B | `_currentTripId` not set on Device B — check login flow |
| All realtime updates ignored | `_deviceId` not set, causing dedup to fail silently |
| Bookings disappear after sync | `bookingConfirmations` not in `_smartMergeStates` |
| Realtime fires but old data shown | Merge overwrites instead of merging — check handler |
| Channel subscribed to wrong trip | `_startRealtimeSync()` called before `_currentTripId` set |

---

## 7. BOOKING CONFIRMATIONS — upload flow

```
User taps stop in Bookings tab
    │
    └─► openBookingModal(stopId)   → sets _bcCurrentStopId
            │
            └─► User uploads PDF/image
                    │
                    └─► _bcHandleFile(event)
                            │
                            └─► Gemini API (via GEMINI_URL)
                                    │
                                    └─► Gemini extracts fields into form
                                            │
                                            └─► User confirms
                                                    │
                                                    └─► _bcSave()
                                                            │
                                                            ├─► appState.bookingConfirmations[stopId].push(bc)
                                                            ├─► saveState(appState)       ← persists + syncs
                                                            └─► renderSchedule()          ← updates schedule badges
```

**Booking id format:** `'bc_' + Date.now() + '_' + Math.floor(Math.random()*9999)`
**Always use this format** for any new bookings so merge deduplication works correctly.

---

## 8. PHOTO SYNC — why full-res photos don't cross devices

Photos are stored as base64 dataUrls (~200-400KB each). Syncing them to Supabase
would exceed payload limits and make saves slow.

**What syncs:** `thumb` (200px JPEG thumbnail) + all metadata fields
**What doesn't sync:** `dataUrl` (full-res) — stays in localStorage on the uploading device only

`_makeCloudSafeState()` strips `dataUrl` before every Supabase write.
`_smartMergeStates()` patches `dataUrl` back from whichever side still has it,
so photos don't disappear on the device that uploaded them after a merge.

**Rule:** Never modify `_makeCloudSafeState()` to strip anything other than `dataUrl`.
Stripping `bookingConfirmations`, `expenses`, or other data would cause silent data loss.

---

## 9. RENDER FUNCTION RESPONSIBILITY MAP

| Function | Reads from appState | Key DOM target | Triggered by |
|---|---|---|---|
| `renderSchedule()` | `customTripData`, `dayOverrides`, `pauseDays`, `arrivals`, `departures`, `osrmDriveCache`, `osrmVirtualCache`, `bookingConfirmations` | `#schedule-content` | Tab switch, plan changes, drive recalc, _refreshAll |
| `renderStops()` | `planned`, `plannedEvents`, `customActivities`, `removedStops`, `weather` | `#stops-content` | Any plan action, _refreshAll |
| `renderDashboard()` | `tripSettings`, `weather`, `expenses`, `bookingConfirmations`, `arrivals` | `#dashboard-content` | Tab switch, _refreshAll |
| `renderBookingsTools()` | `bookingConfirmations` | `#tools-sub-content` | Tools tab, _refreshAll when bookings sub-tab active |
| `renderCalendar()` | `dayOverrides`, `pauseDays`, `dayNotes` | `#tools-sub-content` | Tools tab |
| `_refreshAll()` | — | all of the above | Bulk state changes, realtime sync, stop add/remove |

---

## 10. SESSION STARTUP SEQUENCE

```
Page load
    │
    ├─► appState = loadState()           // sync read from localStorage
    ├─► _detectGuestMode()               // check URL params
    ├─► _initAuth()                      // set up Supabase auth listener
    │       │
    │       └─► onAuthStateChange fires
    │               │
    │               ├─► SIGNED_IN → _sbUser set
    │               │       └─► _doLegacyInitAfterSbAuth()
    │               │               ├─► load trip from Supabase trips table
    │               │               ├─► _smartMergeStates(local, remote)
    │               │               ├─► _currentTripId = trip.id
    │               │               ├─► _startRealtimeSync()    ← must be after _currentTripId
    │               │               └─► initApp() → render all tabs
    │               │
    │               └─► SIGNED_OUT → clear _sbUser, show login
    │
    └─► _tryAutoLogin()                  // legacy password hash path (non-Supabase)
```

**Critical constraint:** `_startRealtimeSync()` must always be called after
`_currentTripId` is set. If you add a new auth path or trip-switching flow,
ensure this ordering is preserved.
