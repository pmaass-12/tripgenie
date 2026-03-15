# CONTRACTS.md — TripGenie / Maass Family RV 2026
> Read this file before writing any code. Every name, signature, and shape listed
> here is LOCKED. Do not rename, move, restructure, or change the call signature
> of anything in this file. If you need to add something new, add it — never
> rename or delete existing entries.

---

## 1. GLOBAL CONSTANTS (never rename or reassign)

| Variable | Value / Purpose |
|---|---|
| `SUPA_URL` | `'https://ljfshsdctsdkybrtfqxj.supabase.co'` |
| `SUPA_KEY` | publishable anon key — never move server-side |
| `SUPA_TABLE` | `'trip_state'` — legacy REST table (still referenced) |
| `SUPA_ROW` | `'maass_family'` — legacy row ID |
| `GEMINI_KEY` | `''` — always empty; key lives in Netlify env vars |
| `GEMINI_URL` | `'/.netlify/functions/gemini'` — all AI calls go here |
| `TRIP_STOPS` | Array of stop objects — source of truth for route |
| `TRIP_DAYS` | Array of day objects — source of truth for schedule |
| `CONFIG` | `{ passwordHash, friendsPasswordHash, viewerPasswordHash, startDate, endDate, totalDays, totalMiles }` |
| `_BUILTIN_TRIP` | `{ stops, days, startDate, endDate, totalDays, totalMiles, tripName }` — immutable original snapshot |

---

## 2. SUPABASE TABLES

| Table | Primary Key | Key Columns | Notes |
|---|---|---|---|
| `trips` | `id` (UUID) | `user_id`, `trip_data` (jsonb), `name`, `start_date`, `end_date`, `updated_at` | Primary per-user trip storage |
| `trip_state` | `id` | `data`, `updated_at` | Legacy shared-state table — do not remove |
| `trip_suggestions` | `id` | `trip_id`, `user_id`, `created_at` | Friends/guest suggestions |
| `profiles` | `id` | `user_id` | User profile data |

---

## 3. APPSTATE — FIELD NAMES AND SHAPES (never rename)

`appState` is the single mutable runtime state object. All fields below are locked.

### Structural / route data
```
appState.customTripData     // { stops:[], days:[], startDate, endDate, totalDays, totalMiles, tripName }
appState.tripSettings       // { tripName, ... }
appState.drivingPrefs       // { breakEveryH, breakMins, ... }
appState.removedStops       // { [stopId]: true }
appState.dayOverrides       // { [dayNum]: { ... } }
appState.phaseExtraDays     // { [phaseKey]: number }
appState.pauseDays          // [ { id, ... } ]
appState.dayOrder           // { [stopId]: number }
appState.waypointOverrides  // { [stopId]: true }
appState.stopCityNames      // { [stopId]: string }
appState.stopMinVisit       // { [stopId]: number }
appState.stayType           // { [stopId]: string }
```

### Per-day activity state
```
appState.arrivals           // { [dayNum]: ISOString }
appState.departures         // { [dayNum]: ISOString }
appState.dayNotes           // { [dayNum]: string }
appState.drivers            // { [dayNum]: string }
appState.agendaItemOverrides// { [key]: { ... } }
appState.agendaEvents       // { [key]: { ... } }
appState.sleepOverrides     // { [stopId]: string }
```

### Planning / activities
```
appState.planned            // { ['p_' + stopId + '_a_' + idx]: true }
appState.plannedEvents      // { [planId]: true }  — planId format: 'ev_STOPID_N' or 'attr_STOPID_N'
appState.customActivities   // { [stopId]: [ { _planKey, ... } ] }
appState.aiActivityIdx      // { [planId]: number }
appState.aiSuggestions      // [ { id, title, detail, impact, affectedDays, sourceDay, triggerType, status, created } ]
appState.aiAttractions      // { [stopId]: [...] }
appState.aiRestaurants      // { [stopId]: [...] }
appState.decisions          // [ { id, ... } ]
appState.skipPrefs          // { [key]: true }
```

### Bookings — TWO formats, both must be preserved
```
appState.customBookings         // [ { id, name, type, phase, checkIn, checkOut, nights, stopId } ]
                                //   ↑ old format — still used in renderBookings()

appState.bookingConfirmations   // { [stopId]: [ {
                                //     id,               // 'bc_' + timestamp + '_' + rand
                                //     stopId,
                                //     propertyName,
                                //     confirmationNumber,
                                //     phone,
                                //     totalCost,
                                //     checkInDate,
                                //     checkInTime,
                                //     checkOutDate,
                                //     checkOutTime,
                                //     address,
                                //     siteOrRoom,
                                //     hookups,
                                //     notes,
                                //     type,             // 'campground'|'hotel'|'cabin'|'airbnb'
                                //     addedAt           // Date.now()
                                //   } ] }
                                //   ↑ current format — used in renderBookingsTools(), schedule, dashboard

appState.bookingStatus          // { [key]: true }  — checkbox state for customBookings
```

### Drive cache
```
appState.osrmDriveCache     // { [dayNum]: { miles, driveHours, fromId, toId } }
                            //   ⚠️ keyed by DAY NUMBER — goes stale when stops reorder
                            //   Prefer osrmVirtualCache for any new code

appState.osrmVirtualCache   // { [fromId + '_' + toId]: { miles, driveHours } }
                            //   ↑ keyed by stop PAIR — never goes stale. Always prefer this.
```

### Media / content
```
appState.photoPool          // [ { id, fileName, timestamp, caption, stopId, dayNum, source, exif, thumb, dataUrl } ]
                            //   ⚠️ dataUrl is STRIPPED before cloud sync — only thumb syncs
appState.journalEntries     // [ { id, ... } ]
appState.savedPostcards     // [ { id, created, ... } ]
appState.memoryBook         // { ... }
```

### Lists / packing
```
appState.customListItems    // { todo: [ { text } ], pack: [ { text } ] }
appState.listChecked        // { todo: { [text]: bool }, pack: { [text]: bool } }
appState.listHidden         // { todo: { [text]: bool }, pack: { [text]: bool } }
appState.listSortOrder      // { todo: [], pack: [] }
appState.listHideCompleted  // bool
```

### Expenses / finances
```
appState.expenses           // [ { id, ... } ]
appState.catBudgets         // { [catId]: number }
appState.mealSkips          // { [key]: true }
```

### Misc
```
appState.weather            // { [stopId]: { ... } }
appState.profiles           // [ { name, color, initial } ]
appState.rvLog              // { ... }
appState.visitedStates      // { [abbr]: true }
appState.games              // { ... }
appState.dietPrefs          // { ... }
appState.restaurantPrefs    // [ ... ]
appState.auditLog           // [ { ... } ]
appState.darkMode           // 'light' | 'dark' | 'auto'
appState.tripStarted        // bool
appState.tutorialDone       // bool
appState.mapboxToken        // string
appState.tripGenieAdvice    // { ... }
appState.pauseGenieAdvice   // { ... }
appState.lodgingAvailability// { ... }
appState.hotelsCache        // { [stopId]: [...] }
appState.labsPhoneBooking   // { ... }
appState.activeTrip         // { ... }
```

### Sync metadata (written by saveState — do not write manually)
```
appState._savedAt           // ISOString — last save timestamp
appState._savedBy           // string — _userName at time of save
appState._deviceId          // string — per-session random ID for realtime dedup
```

---

## 4. LOCKED FUNCTION SIGNATURES

These functions are called throughout the codebase. Never change their signatures.

### Persistence
```js
saveState(state?)                   // state defaults to appState; writes localStorage + Supabase
loadState()                         // sync read from localStorage
loadStateFromCloud()                // async read from Supabase trips table
syncToCloud(state)                  // legacy REST cloud save (non-auth path)
_syncToSupabaseTrips(state)         // debounced Supabase trips table update (auth path)
_smartMergeStates(a, b)             // returns merged state; never mutates inputs
_makeCloudSafeState(state)          // strips photo dataUrls; returns safe copy for Supabase
_saveLocalBackup(state)             // rotates 3 localStorage backup slots
_restoreFromBackup(slot)            // restores from localStorage slot 1|2|3
loadFromCloud(callback)             // loads from legacy trip_state table
```

### Realtime
```js
_startRealtimeSync()                // subscribes to Supabase Realtime on trips table
                                    // must be called AFTER _currentTripId is set
```

### Rendering — these WIPE their container and rebuild from appState
```js
renderSchedule()                    // → #schedule-content
renderStops()                       // → #stops-content  ⚠️ WIPES all stop-detail panels
renderDashboard()                   // → #dashboard-content
renderPlannerAgenda()               // planner agenda segment
renderJournal()                     // journal tab
renderGalleryTab()                  // gallery tab
renderBookings()                    // booking list (old customBookings format)
renderBookingsTools()               // → #tools-sub-content when _toolsTab === 'bookings'
renderExpenses()                    // → #tools-sub-content when _toolsTab === 'expenses'
renderCalendar()                    // → #tools-sub-content when _toolsTab === 'calendar'
renderTripSettings()                // → #tools-sub-content when _toolsTab === 'settings'
renderProfiles()                    // → #tools-sub-content when _toolsTab === 'profiles'
renderAuditLog()                    // → #tools-sub-content when _toolsTab === 'auditlog'
renderMemoryBook()                  // → #tools-sub-content when _toolsTab === 'membook'
renderRVMaintenance()               // → #tools-sub-content when _toolsTab === 'rvlog'
renderLabsTools()                   // → #tools-sub-content when _toolsTab === 'labs'
renderHealthCheckTab()              // → #tools-sub-content when _toolsTab === 'healthcheck'
_refreshAll(silent?)                // calls all render functions; silent=true suppresses toast
```

### Navigation
```js
switchTab(tabId)                    // switches main tab; tabId values below
_mainSeg(which)                     // switches planner sub-segment; values below
```

### Stop panel loaders — called on open; check internal cache before fetching
```js
loadStopEvents(stopId)              // loads Gemini events into stop-events-body-{stopId}
loadStopAttractions(stopId)         // loads Gemini attractions into stop-attractions-body-{stopId}
loadStopRestaurants(stopId)         // loads Gemini restaurants into stop-restaurants-body-{stopId}
toggleStopEvents(stopId)            // opens/closes panel; calls loadStopEvents if opening
toggleStopAttractions(stopId)       // always calls loadStopAttractions (cache check is internal)
toggleStopRestaurants(stopId)       // opens/closes panel; calls loadStopRestaurants if opening
```

### Auth
```js
doLogin()                           // handles login form submit
_sbSignOut()                        // Supabase sign-out
checkAuth()                         // returns _authed bool
_doLegacyInitAfterSbAuth()          // boots app after auth; calls _startRealtimeSync()
```

### Key helpers
```js
getStop(id)                         // returns stop object from TRIP_STOPS by id
getDay(n)                           // returns day object from TRIP_DAYS by day number
tripDay()                           // returns current trip day number
saveState(state?)                   // ← most-called function; always use this to persist
showToast(msg, duration?)           // shows floating toast; duration defaults to 2800ms
_refreshAll(silent?)                // always call this after mutating appState in bulk
formatDate(dateStr)                 // 'YYYY-MM-DD' → human-readable string
_sn(stop)                           // returns display name for a stop
```

---

## 5. DOM CONTAINER IDs (never rename)

### Main tab panels — activated by switchTab(tabId)
| tabId | Panel ID |
|---|---|
| `dashboard` | `tab-dashboard` |
| `map` | `tab-map` |
| `planner` | `tab-planner` |
| `journal` | `tab-journal` |
| `school` | `tab-school` |
| `gallery` | `tab-gallery` |
| `lists` | `tab-lists` |
| `suggestions` | `tab-suggestions` |
| `adjustments` | `tab-adjustments` |
| `decisions` | `tab-decisions` |
| `fun` | `tab-fun` |
| `postcards` | `tab-postcards` |
| `ideas` | `tab-ideas` |
| `tools` | `tab-tools` |
| `whatsnew` | `tab-whatsnew` |

### Planner sub-segments — activated by _mainSeg(which)
| which | Content |
|---|---|
| `schedule` | Schedule view → `#schedule-content` |
| `stops` | Day Planner view → `#stops-content` |
| `agenda` | Agenda view |
| `friends` | Friends/guest view |
| `stats` | Trip stats view |

### Tools sub-tabs — set via _toolsTab variable
`expenses` · `bookings` · `calendar` · `settings` · `profiles` · `auditlog` · `membook` · `rvlog` · `labs` · `healthcheck` · `snapshots`
All render into `#tools-sub-content`.

### Key dynamic containers
| ID | Written by |
|---|---|
| `#schedule-content` | `renderSchedule()` |
| `#stops-content` | `renderStops()` |
| `#dashboard-content` | `renderDashboard()` |
| `#tools-sub-content` | all Tools sub-tab renderers |
| `#stop-detail-{stopId}` | built by `renderStops()` — destroyed on every re-render |
| `#stop-events-panel-{stopId}` | built by `renderStops()` |
| `#stop-events-body-{stopId}` | written by `loadStopEvents()` |
| `#stop-attractions-panel-{stopId}` | built by `renderStops()` |
| `#stop-attractions-body-{stopId}` | written by `loadStopAttractions()` |
| `#stop-restaurants-panel-{stopId}` | built by `renderStops()` |
| `#stop-restaurants-body-{stopId}` | written by `loadStopRestaurants()` |

---

## 6. IN-MEMORY CACHE VARIABLES (survive page load; wiped on full reload)

These are NOT in appState and are NOT persisted. They are reset whenever
`renderStops()` rebuilds the DOM. Any fix touching these must account for that.

```js
_stopEventsLoaded       // { [stopId]: bool } — ⚠️ stale after renderStops(); see ARCHITECTURE.md
_stopAttractionsLoaded  // { [stopId]: bool } — fixed: Attractions always re-fetches on open
_stopRestaurantsLoaded  // { [stopId]: bool } — ⚠️ same stale bug as _stopEventsLoaded
_attractionsCache       // { [stopId]: rawText } — survives filter/load-more without re-fetch
_attractionsShown       // { [stopId]: number } — pagination counter
_realtimeSyncChannel    // Supabase Realtime channel ref
_sbSyncTimer            // setTimeout handle for _syncToSupabaseTrips debounce
_syncTimer              // setTimeout handle for syncToCloud debounce
_cloudLoadedAt          // timestamp of last cloud load
```

---

## 7. NETLIFY FUNCTIONS (never rename endpoints)

| File | Endpoint | Purpose |
|---|---|---|
| `netlify/functions/gemini.js` | `/.netlify/functions/gemini` | Gemini API proxy — all AI calls |
| `netlify/functions/supabase-config.js` | `/.netlify/functions/supabase-config` | Supabase config |

All Gemini calls must go through `GEMINI_URL` — never call the Gemini API directly from the browser.

---

## 8. KEY PATTERNS — follow exactly, do not invent alternatives

### Saving state
```js
// Always use saveState() — never write to localStorage or Supabase directly
appState.someField = newValue;
saveState(appState);
```

### Merging states
```js
// Always use _smartMergeStates() — never do a raw Object.assign or overwrite
var merged = _smartMergeStates(localState, remoteState);
```

### After bulk appState changes
```js
// Always call _refreshAll() to keep all views in sync
_refreshAll(true); // silent=true to suppress the "Views refreshed" toast
```

### Stop panel loaders
```js
// Correct pattern (Attractions — fixed):
// toggleStopAttractions always calls loadStopAttractions; cache check is INSIDE the loader

// ⚠️ Broken pattern (Events, Restaurants — not yet fixed):
// toggleStopEvents checks _stopEventsLoaded BEFORE calling loadStopEvents
// This causes empty panels after renderStops() wipes the DOM
// Fix: move cache check inside loader, always call loader on open
```
