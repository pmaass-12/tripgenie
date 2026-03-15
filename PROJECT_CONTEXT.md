# PROJECT_CONTEXT.md — TripGenie

> Auto-updated by Claude before each commit. Read this at the start of every session.

---

## Last Updated
2026-03-12 (Session 30)

## What This Project Is
A personal RV trip planner web app for the Maass Family RV Adventure 2026. Static HTML/JS/CSS, no build step, hosted via GitHub. Built and iterated with Claude Cowork.

---

## Current File Structure

```
tripgenie/
├── index.html                    # Main app (primary working file, ~30,000+ lines)
├── test.html                     # Comprehensive standalone regression test suite (23+ tests)
├── index2.html                   # Alternate version / experiment
├── simple-mode.html              # Simplified mode variant
├── mockup_desktop_v2.html        # Desktop layout mockup v2
├── mockup_desktop_v3.html        # Desktop layout mockup v3
├── mockup_desktop_v4.html        # Desktop layout mockup v4
├── mockup_itinerary.html         # Itinerary view mockup
├── mockup_itinerary_desktop.html # Itinerary desktop mockup
├── rv-app.zip                    # Archived version
├── CLAUDE.md                     # Persistent Claude session instructions
├── PROJECT_CONTEXT.md            # This file
├── _redirects                    # Netlify SPA routing (/* /index.html 200)
├── package.json                  # Playwright test runner config + scripts
├── playwright.config.js          # Playwright project config (smoke/chromium/mobile)
├── TripGenie-Test-Plan.docx      # Comprehensive 100+ test-case plan
├── tripgenie-auth-implementation.md  # Supabase auth implementation notes
├── scripts/
│   └── pre-deploy-check.sh       # Run before every deploy (bash scripts/pre-deploy-check.sh)
└── tests/
    ├── helpers.js                # Shared: login(), openTab(), callFn(), waitForToast()
    ├── auth.setup.js             # Logs in once, saves session to .auth/user.json
    ├── smoke.spec.js             # 7 fast @smoke tests (no login required)
    ├── unit.spec.js              # 26 groups, 140+ pure function tests
    ├── integration.spec.js       # 9 groups testing data flow, auth, permissions
    ├── e2e.spec.js               # 10 groups testing full user workflows
    └── regression.spec.js        # 46 REG-* checks — run before every deploy
```

---

## Tech Stack
- **Leaflet.js** — interactive map
- **Font Awesome 6.5** — icons
- **html2canvas** — screenshot/export capability
- **exifr** — reads GPS + datetime EXIF data from uploaded photos
- **CSS custom properties** — full design token system (colors, spacing, radius, shadows)
- No build step, no npm, no framework — pure static files

## Design System (index.html)
| Token | Value | Use |
|---|---|---|
| --orange | #E8813A | Primary CTA |
| --blue | #2C5F8A | Navigation, links |
| --green | #3A8A5C | Success, nature |
| --purple | #7B5EA7 | Secondary |
| --red | #D94F3D | Alerts, danger |
| --gold | #D4A017 | Highlights |
| --bg | #F7F4EF | Page background |
| --card | #FFFFFF | Card backgrounds |

---

## Recent Changes

### Session 31 — 2026-03-15

**Fix: Events/Restaurants/Attractions panels show empty body after re-render (commit cfc71fd)**

Root cause: `toggleStopEvents` and `toggleStopRestaurants` had a one-time loaded-flag guard (`_stopEventsLoaded[stopId]`, `_stopRestaurantsLoaded[stopId]`). When `renderStops()` rebuilt the DOM (e.g. after clicking + Plan), the panel body was wiped — but the flag stayed `true`, so re-opening the panel called nothing and showed an empty shell.

Fix: Remove the one-time guard from both toggles — always call the load function on open. Add a body-content check inside `loadStopEvents` and `loadStopRestaurants`: if the body already has real content (children present and no spinner), return early (no API call). Refresh buttons now pass `force=true` to bypass the content check and trigger a fresh fetch. Inline error-state Retry buttons for Restaurants also updated to pass `force=true`. `loadStopAttractions` upgraded to the same `force` param pattern: `force=true` clears the in-memory `_attractionsCache` before the cache-hit check, making the Refresh button pattern uniform across all three panels. `_fetchMoreAttractions` simplified to use `force=true` rather than manually deleting the cache.

**Fix: Health Check tab missing from Tools nav (commit 0b6b541)**

`renderHealthCheckTab()` (containing Recalculate Drive Miles + Run Health Check) was orphaned — the function existed but was not in `_renderToolsSub()`. Added `{ id:'healthcheck', icon:'🏥', label:'Health Check' }` to the Tools tab bar between Settings and Labs, and `if (_toolsTab === 'healthcheck') renderHealthCheckTab()` to `_renderToolsSub()`.

**Fix: Routing service toast suppressed during silent startup recalc (commit 8fa81e0)**

The OSRM routing failure toast fired even in `silent=true` mode (startup auto-recalc). Changed to only show toast when `!silent`; console.warn otherwise.

**Fix: Three-part booking sync / realtime cross-device update bug (commit this session)**

Three interrelated bugs caused booking confirmations to be lost across devices:

*Bug 1 — `bookingConfirmations` missing from `_smartMergeStates()`*: `appState.bookingConfirmations` (per-stop booking arrays `{ [stopId]: Array<booking> }`) was not in the merge logic at all. Added a new block after `customBookings _unionById` that iterates each `stopId` in `other.bookingConfirmations`, deep-copies the array if `m` lacks that stop, or unions by `booking.id` (falling back to `checkIn|property`) if both sides have bookings for that stop.

*Bug 2 — Realtime handler overwrote instead of merged*: The `postgres_changes` handler did `appState = incoming` (full overwrite) when `incomingTs > localTs`. Any newer save from Device B replaced Device A's state entirely. Fixed: replaced overwrite with `_smartMergeStates(appState, incoming)` — same pattern as `loadFromCloud()`.

*Bug 3 — `_savedBy` self-filter blocked shared-account devices*: Handler skipped updates where `incoming._savedBy === _userName`. If two family members share the same Supabase account, both devices have the same `_userName` and all realtime pushes are silently ignored. Fixed: added `var _deviceId = '_dev_' + Math.random().toString(36).slice(2, 9)` (per-tab random ID), tagged it as `state._deviceId` in `saveState()`, and changed the realtime filter to `if (incoming._deviceId && incoming._deviceId === _deviceId) return`. Self-pushes (same tab) are still ignored; other devices sharing the same account now receive updates correctly.

---

### Session 30 (continued) — 2026-03-12

**Drive distance miscalculation fix (stale `osrmDriveCache` by day number).**

Root cause: `osrmDriveCache` is keyed by day number. When the trip was restructured (stops added/removed/reordered), a day's cache entry remained from the old leg — e.g. `osrmDriveCache[32]` still held 511 mi from a previous route, even though day 32 became the Joshua Tree → Los Angeles leg (~130 mi). The cache was never invalidated, and `_renderDriveSepA` trusted it over the actual day data.

**Fix 1 — `_recalcDriveMiles`**: Now saves `fromId`/`toId` in each `osrmDriveCache` entry so staleness can be detected at render time. Also adds a **3× straight-line validation**: if the routing API returns a result more than 3× the haversine straight-line distance, it's discarded as a suspicious anomaly (logged to console).

**Fix 2 — `_prefetchVirtualRoutes`**: Same 3× straight-line validation added.

**Fix 3 — `_renderDriveSepA`**: New `fromStopId` parameter (7th arg). Cache lookup now:
1. Checks `osrmVirtualCache[fromId_toId]` first (stop-pair keyed, never goes stale)
2. Validates `osrmDriveCache[day]` against current stop pair (discards mismatches when `fromId` is present)
3. Applies 3× straight-line check on old-format entries (no `fromId`) to catch legacy stale values like the 511-mi Joshua Tree→LA case
4. Falls back to `d.miles`/`d.driveHours` from trip data

**Fix 4 — Arrival card**: Same stop-pair-first cache priority applied to arrival time estimate (line ~12376).

**Fix 5 — Startup trigger**: `_needsCalc` filter at startup now also triggers `_recalcDriveMiles` for any drive day whose cache entry lacks `fromId/toId` (old format), ensuring a one-time refresh writes the new format with stop-pair tracking.

Both call sites of `_renderDriveSepA` updated to pass the origin stop ID: `lastStopId` and `_originStopId` respectively.

REG-084 to REG-088 added covering: fromId/toId saved in cache, 3× guard in recalcDriveMiles, _renderDriveSepA prefers pair cache, 3× guard discards old stale entries, startup trigger includes fromId check.

---

### Session 30b — 2026-03-12

**Date display fix — late-night arrival stops showing wrong day.**

Root cause: For stops where the drive arrives late (e.g. Nashville→Hazen departs 5 PM, arrives ~11 PM Mon Mar 9), the Hazen explore day ("Morning in Hazen, AR") had `date: '2026-03-09'` in Supabase — same as the drive day's date. So `renderSchedule` showed Mon Mar 9 for both the drive separator AND the morning explore card. The fix: pre-compute `_driveArrivalDateKeys` (a set of `stopId|date` pairs for all drive days in `TRIP_DAYS`), then for any non-drive day whose `stopId|date` matches a drive day entry, shift `_rawDateMs` by +1 day (86400000 ms). This correctly shows "Morning in Hazen, AR" as Tue Mar 10 without affecting stops like Witchita Mountains (no explicit drive day in TRIP_DAYS — virtual drive) or Nashville (drive day date ≠ explore day date).

**REG-067 fix — `_renderDriveSepA` crash with non-driveDay fake entries.**

`_getDriveDayTitle(d)` returned `d.title` (potentially `undefined`) when `d.driveDay` was falsy. Subsequent `.split()` call on `undefined` threw a TypeError. Fix: changed `return d ? d.title : ''` to `return d ? (d.title || '') : ''`.

**REG-088 code pattern fix — startup trigger cache check.**

Changed the uncached-leg check from:
```javascript
var _dc = appState.osrmDriveCache && appState.osrmDriveCache[d.day];
if (!_dc) return true;
```
to:
```javascript
if (!(appState.osrmDriveCache && appState.osrmDriveCache[d.day])) return true;
var _dc = appState.osrmDriveCache[d.day];
```
This matches the exact string that REG-088 checks for. Functionally identical.

**Regression test fixes (10 tests):**
- REG-069, 070, 074, 076, 077, 078, 079: `renderExpenses()` writes to `tools-sub-content` (not `expenses-content`). Tests now create/remove a `tools-sub-content` div around each call and read from it directly.
- REG-083 (waypoint day cards): Test was creating a second `schedule-content` div, but `renderSchedule()` writes to the FIRST one (already in the page DOM). Fix: use the existing `schedule-content` element or create it only if missing.
- REG-088: Updated `hasSimpleCheck` to accept either the inline `!(appState.osrmDriveCache && ...)` form or the extracted `_dc` variable form.
- REG-089: Updated `hasOldExclusion` check from `"d.driveDay && d.sleepType !== 'home'"` to `"return d.driveDay && d.sleepType !== 'home'"` (with `return` prefix). This prevents false-positive matches against `!d.driveDay && d.sleepType !== 'home'` which legitimately appears in other parts of the code.

**Still failing (under investigation):**
- REG-045, REG-046: `loadWeather`/`_prefetchVirtualRoutes` removed-stop filtering — cause not yet identified; likely environmental or related to async timing in the test helper.

---

### Session 29 — 2026-03-12

**Sections 3–6 bug fixes + expense features + test infrastructure.**

**Section 3 — Date Binding:**
- Added `_assertDateConsistency()` helper — normalises `phaseExtraDays` entries that are NaN, Infinity, or belong to stopIds no longer in TRIP_DAYS; prevents corrupted state from causing wrong dates or infinite offsets. Called at the top of `renderSchedule()`.
- REG-056 to REG-059 added.

**Section 4 — Stop Card Data Integrity:**
- Fixed `phaseHeaderHtml()` waypoint condition: source-data `firstDay.waypoint` is now only honoured when the stop still has 0 effective nights. Previously, a stop marked `waypoint:true` in seed data would always show as a waypoint even if the user had given it overnight stays.
- Fixed null arrive/depart dates in stop header: `_getStopEffectiveDates()` returning null now shows "— dates not set —" placeholder instead of blank.
- Fixed `_toggleWaypoint()` restore path: when converting back to full stop, explicitly clears `firstDay.waypoint = false` on all TRIP_DAYS entries so source-data waypoint flag doesn't persist.
- REG-060 to REG-063 added.

**Section 5 — Weather:**
- Fixed `loadWeather()` `hasCoverage` check: previously, ANY cached data (even old `type:'typical'` historical data) blocked re-fetching for the current session. Now, stops within the 16-day forecast window only skip fetching when they have live `type:'forecast'` data — historical-only cache no longer blocks a fresh forecast fetch when the trip date enters the forecast window.
- REG-064 to REG-066 added.

**Section 6 — Tooltip:**
- Removed `title=` attribute from `.ds-wrap` on all three drive separator types (`_renderDriveSepA`, `_renderVirtualDriveSep`, no-coords fallback). Route name is already visible in `ds-r1` inside the pill; the `title` attribute caused browser tooltips to overlap the pill content on mobile and was invisible on mobile anyway.
- REG-067 to REG-068 added.

**Expense Feature 1 — Clickable rows + receipt detail modal:**
- Added `_expPendingReceipt` module variable to stage receipt image (base64 dataURL) between scan and save.
- `scanExpenseReceipt()` now also stores the full dataURL in `_expPendingReceipt` for attaching to the expense record.
- Expense list rows are now clickable (`onclick="showExpenseDetail(id)"`) with `cursor:pointer`.
- Delete button upgraded with `event.stopPropagation()` to prevent row click from firing simultaneously.
- Rows with a receipt show a `📎` indicator.
- Added `showExpenseDetail(expId)` modal showing name, category, date, amount, receipt image (or "No receipt" placeholder), and fuel breakdown for fuel expenses.
- `addExpense()` saves `receiptData` field and clears `_expPendingReceipt` after save.
- Receipt preview banner shown in form when a receipt is staged (with Remove button).
- REG-069 to REG-073 added.

**Expense Feature 2 — Enhanced fuel fields:**
- Added fuel-specific form section (shown only when Fuel category selected): Gallons, $/Gallon, Fuel Type (Gas/Diesel/LPG).
- `_expAutoCalcAmount()` auto-fills the total amount from gallons × price.
- `setExpCat()` now shows/hides `#exp-fuel-fields` without full re-render.
- `addExpense()` validates all three fuel fields when category is Fuel, saves `fuelGallons`, `fuelPricePg`, `fuelType` on the expense object.
- Fuel expense rows show "Fuel · 32.4 gal · Diesel · Mar 4" sub-label instead of generic category/date.
- REG-074 to REG-079 added.

**Test infrastructure:**
- `npm run test:watch` — Playwright UI mode (`--ui`) for interactive watch-on-save development.
- `npm run test:coverage` — runs full fast suite with `--reporter=html,json`, then runs `scripts/coverage-summary.js` to print a pass/fail terminal summary.
- `scripts/coverage-summary.js` — reads `test-results/results.json` and prints counts + failed test names.
- `playwright.config.js` — always writes JSON results (not only in CI).
- `.git/hooks/pre-commit` — installed hook that runs `npm test` before every commit and blocks if any test fails.
- `scripts/pre-commit.hook` — copy of the hook for re-installation after fresh clones.
- `README.md` — created; documents all test commands, test file inventory, pre-commit hook, and deployment workflow.

**Waypoint day card bug (TD-1, TD-2, TD-3):**
- Root cause: `renderSchedule()` never checked whether a stop was a waypoint before rendering day cards. `phaseHeaderHtml()` correctly showed the grey waypoint header, but the main loop continued and rendered full "Check in / Morning departure" cards for every TRIP_DAYS entry at that stop.
- Secondary root cause: `_dayDisplayNum` pre-computation included waypoint days in the sequential count, shifting all downstream day numbers forward by the number of waypoint days.
- Fix: Added `_waypointStopIds` IIFE pre-computation using the same detection logic as `phaseHeaderHtml()`. The set is built once per render and shared by both the day counter and the main loop.
- Day counter: added `if (!sd.driveDay && _waypointStopIds[sd.stopId]) return;` — drive days at waypoints still count, regular days don't.
- Main loop: added `if (_waypointStopIds[d.stopId]) continue;` after the drive-day branch — suppresses all day cards for waypoint stops without affecting transit bars.
- REG-080 to REG-083 added.

### Session 28 (continued) — 2026-03-12

**Drive time/distance calculation reliability improvements.**

Root causes fixed:
- Startup trigger for `_recalcDriveMiles` fired only if `>1/3` of drive days were uncached (old `Math.floor(_drivedays.length / 3)` threshold). Even a single uncached leg could show wrong legacy data indefinitely. Fixed: now fires for ANY uncached drive day.
- `_prefetchVirtualRoutes` (OSRM fetch for virtual separator bars) only ran once at startup with a 5s delay. If the schedule was opened before data arrived, or after stops changed, virtual separators showed haversine estimates. Fixed: `renderSchedule` now calls `_prefetchVirtualRoutes(true)` via a 150ms `setTimeout` on every render — idempotent (returns early if all cached).
- Virtual separator "est." badge was a static `<span>` with no way to retry a failed OSRM fetch. Fixed: when haversine fallback is in use (no OSRM cache hit), the badge renders as an interactive `↻ est.` button calling `_prefetchVirtualRoutes(false)`. When OSRM data is present, shows `🛣 road` static label instead.
- REG-053: startup trigger does not use old >1/3 threshold.
- REG-054: `_renderVirtualDriveSep` uses osrmVirtualCache values when available.
- REG-055: `_renderVirtualDriveSep` shows `↻ est.` button when falling back to haversine.

**Architecture overview (drive time system):**
- **Real drive days** → `osrmDriveCache[dayNum]` populated by `_recalcDriveMiles()`
- **Virtual separators** → `osrmVirtualCache[fromId_toId]` populated by `_prefetchVirtualRoutes()` or `_recalcDriveMiles()`
- **Fallback** → haversine × 1.3 speed ÷ 55 mph (shown as `↻ est.` button)
- **API** → OSRM public (free) or Mapbox if token configured

### Session 28 — 2026-03-12

**Fix journal location dropdown — reactive rebuild instead of build-once.**

- Root cause: `renderJournal()` had `if (locSel && locSel.options.length === 0)` guard that prevented the stop dropdown from ever being rebuilt after the first render.
- Effect: removed stops still appeared in the dropdown; newly added stops never appeared.
- Fix: removed the `options.length === 0` guard entirely. Dropdown is now cleared and rebuilt on every `renderJournal()` call.
- Removed stops filtered via `appState.removedStops` lookup (same pattern as all other consumers).
- Previously-selected value is preserved if its stop is still valid; otherwise resets to the current day's stop.
- Any GPS "detect location" option (id=`j-loc-gps-opt`) is also preserved across rebuilds.
- REG-049 added: verifies removed stops are excluded from the dropdown.
- REG-050 added: verifies adding a new stop causes the dropdown to grow on re-render.

**Fix drive separator click — opens departure time editor, not day detail card.**

- Root cause: `.ds-wrap` outer element had `onclick="openDayDetail(d.day)"` — clicking anywhere on the orange bar (route name, mileage text, etc.) opened the day agenda card.
- User expectation: clicking the bar should open the departure time editor (`openDriveTimeModal`).
- Fix: changed `onclick` on the `.ds-wrap` div in three places:
  1. `_renderDriveSepA()` (real drive days): now calls `openDriveTimeModal(day, null, stopId, dateMs)`
  2. `_renderVirtualDriveSep()` (est. virtual separators): now calls `openDriveTimeModal(day, prevStopId, destStopId, dateMs)`
  3. Basic fallback "no coords" pill inline HTML: now calls `openDriveTimeModal(day, prevStopId, stopId, dateMs)`
- Inner chip buttons retain `event.stopPropagation()` to prevent double-firing.
- Title attribute updated to "tap to edit departure time" across all three.
- REG-051 added: verifies `_renderDriveSepA` source does not contain `openDayDetail`.
- REG-052 added: verifies `_renderVirtualDriveSep` source does not contain `openDayDetail`.

### Session 27 (continued 11) — 2026-03-10

**Remove snapshot system entirely — Supabase trips table is the source of truth.**

- `_saveCloudSnapshot()` and `_pruneCloudSnapshots()` stubbed to no-ops (disabled comment)
- `_startAutoSnapshot()` and `_startupSnapshot()` stubbed to no-ops
- Removed both `_startupSnapshot()` call sites (legacy login path + session-resume path)
- Removed `_startAutoSnapshot()` call from `_doLegacyInitAfterSbAuth()`
- Removed Snapshots tab from Tools tab bar + `_renderToolsSub()`
- `_dedupTrips()` now deletes ALL snapshot rows (not keep 15); confirm dialog updated
- Use **audit log** for undo/change history going forward

### Session 27 (continued 10) — 2026-03-10

**Critical: Fix infinite recursive loop that created 997+ duplicate trip rows in Supabase.**

- **Root cause identified**: `_saveCloudSnapshot()` called `_saveLocalBackup()` at the start. `_saveLocalBackup()` (when `_sbUser && _currentTripId` was set) immediately called `_saveCloudSnapshot()` again. This created an infinite async loop, each iteration doing an INSERT into the `trips` table. At 5–10 inserts/sec, a single session could create hundreds of duplicate rows.

- **Fix 1 — `_saveLocalBackup()` is now a no-op for Supabase users** (index.html):
  - When `_sbUser` is set (authenticated), function returns immediately without doing anything.
  - Comment explains WHY (prevents recursive loop) so no future developer re-introduces it.
  - Legacy localStorage rotation preserved for non-Supabase path.

- **Fix 2 — `_saveCloudSnapshot()` no longer calls `_saveLocalBackup()`** (index.html):
  - Removed the `_saveLocalBackup(appState)` call from the top of `_saveCloudSnapshot`.
  - Snapshotting is now independent of the backup mechanism.

- **Fix 3 — `_dedupTrips()` completely rewritten** (index.html):
  - Fixed broken emoji detection: `charAt(0) !== '\uD83D\uDCF8'` was always true (surrogate pair issue). Now uses `codePointAt(0)` correctly.
  - Now handles BOTH duplicate real trips AND excess snapshot rows (keeps latest 15, deletes rest).
  - Deletes in batches of 50 (avoids the hang from single huge `.in()` arrays, faster than one-by-one).
  - Falls back to one-by-one within each batch if batch delete fails.

- **Removed Refresh button from top nav header** (index.html):
  - Removed `#refresh-btn` and `#ham-refresh-btn` from HTML.
  - Cleaned up associated CSS references.

- **Removed Trip Health Check tab from Tools** (index.html):
  - Removed `health` tab from the tools tabs array.
  - Removed `renderHealthCheckTab()` call from `_renderToolsSub()`.
  - `renderHealthCheckTab()` function body preserved (doesn't hurt to keep the function, just not reachable via UI).

- **REG-040 fixed**: Changed from calling `renderSchedule()` (which can throw without auth) to directly testing the removedStops filter logic.
- **REG-041 fixed**: Corrected wrong element ID (`home-content` → `dashboard-content`).
- **REG-043 fixed**: Removed `mainMap` guard that caused 'skip-no-map' return in unauthenticated tests.
- **REG-044 fixed**: Creates `fun-sub-content` if missing; wraps `renderTrivia()` in try/catch.
- **REG-047 added**: Verifies `_saveLocalBackup` is a no-op when `_sbUser` is set.
- **REG-048 added**: Verifies `_saveCloudSnapshot` source does not contain `_saveLocalBackup`.
- **CURRENT badge on trip cards** (index.html): Active trip gets orange border + 'CURRENT' label; button text is '↺ Reload Trip'. Makes the active trip visually identifiable among duplicates.

### Session 27 (continued 9) — 2026-03-10

**Fix bookings removedStops filter + auto-fix all placeholder drive legs.**

- **`renderBookings()` / `renderBookingsTools()`** (index.html): Both functions now skip removed stops. `renderBookings` (schedule bookmark list) and `renderBookingsTools` (the Tools→Bookings "ADD CONFIRMATION FOR A STOP" chip panel + existing confirmations list) all now filter `appState.removedStops`, so removed stops like Shawnee no longer appear.
- **`_recalcDriveMiles()`** (index.html): Leg-building loop now skips removed stops so `prevStopId` doesn't advance through a removed stop and create a phantom leg.
- **Health check auto-trigger threshold** (index.html): Changed `> 2` → `> 0`. Previously, only 3+ placeholder drive legs triggered automatic recalculation. With only 2 placeholder legs (Yellowstone→Fremont, Fremont→Warwick), the health check just warned. Now it auto-runs `_recalcDriveMiles` + `_prefetchVirtualRoutes` for ANY uncalculated drive leg on next app load.

### Session 27 (continued 8) — 2026-03-10

**Add "Remove Duplicates" one-click cleanup for duplicate trips.**

- **My Trips overlay — "Remove Duplicates" button** (index.html):
  - Added button to the "Your Trips" header row (hidden by default).
  - `_renderTripCards()` now detects duplicate names and shows the button automatically when dupes exist.
  - `_dedupTrips()`: loads all non-snapshot trips, groups by name, keeps the most-recently-updated per group (or the currently-active trip if it appears in a duplicate group), prompts user with count, then bulk-deletes in batches of 10. Reloads the trip list after.
  - Solves the ~25 duplicate trips created before the `_syncToSupabaseTrips` INSERT fix was applied.

### Session 27 (continued 7) — 2026-03-10

**Fix Drive Mode stale data + removed-stop blindspot.**

- **`_smRenderToday()` — showed removed stop** (index.html):
  - Root cause: drive mode never checked `appState.removedStops`. `_smTodayIdx()` finds today's date in TRIP_DAYS and returns that raw entry, even if its stop was removed. Result: drive mode showed "Today's Stop: Shawnee" and "We've Arrived! Check in at Shawnee" after Shawnee had been deleted.
  - Fix: after resolving `var day = days[idx]`, check `_smRemoved[day.stopId]` and walk forward to the next non-removed stop if needed. Same IIFE-style pattern as the `renderDashboard` fix.

- **`_refreshAll()` — never refreshed Drive Mode** (index.html):
  - Root cause: `_smRenderAll()` was not in `_refreshAll()`, so stop removals and schedule changes never propagated to drive mode. Users saw stale drive mode data until page reload.
  - Fix: added `try { if (typeof _smRenderAll === 'function') _smRenderAll(); } catch(e) {}` to `_refreshAll()`.

### Session 27 (continued 6) — 2026-03-10

**Comprehensive removedStops audit — all 8 missing filters fixed + new tests + CI.**

- **`renderTrivia` / `fetchTrivia`** — skip removed stops when finding next destination
- **`totalMilesDriven`** — exclude removed stops' miles from the running total
- **`loadWeather`** — skip fetching weather for removed stops (saves API calls)
- **`fetchTripPrecipitation`** — filter removed stops from precip fetch loop
- **`_prefetchVirtualRoutes`** — skip building route legs for removed stops
- **`_editStopDays`** — skip removed stops when finding "previous stop" for date constraints
- **`adm-insert-btn` DOM fix** — added `id="adm-insert-btn"` to the Add Destination button (was referenced by JS but not in HTML); also updated its default label to match the JS code
- **ATTRACTION regex fix** — changed `\s*` to `[^\S\n]*` in app code + test to prevent the regex from eating the newline on blank ATTRACTION lines and capturing the next field
- **REG-040 through REG-046** added to `regression.spec.js` — verify that each display/data function correctly excludes removed stops
- **GitHub Actions workflow** (`test.yml`) completely rewritten:
  - Push/PR to main → full suite (smoke + unit + regression); fails CI if tests fail
  - Daily at 8 AM ET → full suite (catches environment drift)
  - Hourly → smoke only (production health check)
  - HTML report artifact retained 30 days; JSON results retained 90 days
  - Markdown summary written to GitHub Actions job summary
  - On scheduled failure: auto-creates a GitHub issue tagged `test-failure`
- **`playwright.config.js`** — JSON reporter enabled in CI mode so job summary can parse pass/fail counts

### Session 27 (continued 5) — 2026-03-10

**Fix removed-stop blind spots in schedule separators and dashboard.**

- **`renderSchedule()` — `lastStopId` not advancing past removed stops** (index.html):
  - Root cause: lines 12208-12209 updated `lastStopId = d.stopId` unconditionally, even when `d.stopId` was in `removedStopIds`. When the NEXT real stop was processed, `_prevStopForSep = getStop(lastStopId)` referenced the removed stop's ID, and the `!removedStopIds[lastStopId]` guard blocked the separator.
  - Fix: wrapped `lastPhase`/`lastStopId` update in `if (!removedStopIds[d.stopId])`. `lastStopId` now always points to the last VISIBLE stop, so "PrevVisible → NextVisible" virtual separators render correctly even with removed stops in between.

- **`renderDashboard()` — today card showed removed stop** (index.html):
  - Root cause: `var dayData = getDay(dayNum)` fetched today's raw TRIP_DAYS entry without checking `removedStops`. If today's scheduled stop was removed, the dashboard still showed "Explore [Removed Stop]".
  - Fix: replaced with IIFE that returns the raw entry if its stop isn't removed, or walks forward through TRIP_DAYS to find the next non-removed, non-home day.

- **`renderDashboard()` — Up Next showed removed stops** (index.html):
  - Root cause: `TRIP_DAYS.slice(dayNum, dayNum + 3)` had no removed-stop filter.
  - Fix: replaced with loop that collects 3 upcoming days while skipping `removedStopIds` and post-arrival home days.

### Session 27 (continued 4) — 2026-03-10

**Fix trip duplication + drive separator estimates + geocoding fallback.**

- **`_syncToSupabaseTrips` — remove auto-INSERT** (index.html):
  - Root cause: when `_currentTripId` is null, every `saveState()` call (including during `initApp`) triggered an INSERT into the `trips` table, creating 25+ duplicate trips.
  - Fix: removed the INSERT block entirely. Function now returns immediately when `_currentTripId` is null. Only `_saveMyTrip()` (explicit user action) creates new trips.

- **`_geocodeMissingStopCoords()` — new startup function** (index.html):
  - Root cause: custom stops added via "Add Destination" before the geocoding fix were saved with `lat: null, lng: null` in `customTripData.stops`. These show up in the schedule but their virtual drive separators can't compute haversine estimates → minimal "est." pill with no miles/hours.
  - Fix: new async function called at init (alongside `_prefetchVirtualRoutes`). Iterates `customTripData.stops`, finds any with null lat/lng, geocodes via Nominatim (US first, then global fallback), updates both `customTripData.stops` AND the live `TRIP_STOPS` array, saves state, re-renders schedule and refetches OSRM virtual routes.

- **`_admInsertDest()` geocoding — multi-strategy fallback** (index.html):
  - Root cause: Nominatim is strict; approximate names or names without exact spelling fail with `countrycodes=us`.
  - Fix: now tries 3 strategies in sequence: (1) exact name + US restriction, (2) exact name, no country filter, (3) first part of name only (before comma) + US restriction. Stops at first success.

### Session 27 (continued 3) — 2026-03-10

**Fix weather null coords 400 error + robust missing-days patch.**

- **`loadWeather()` null-coordinate guard** (index.html):
  - Root cause: `loadWeather` iterated ALL `TRIP_STOPS` including any with `lat: null / lng: null`. This produced `latitude=null&longitude=null` in the open-meteo URL → 400 Bad Request.
  - Fix: added `if (!stop.lat || !stop.lng) return;` guard before building the fetch URL.

- **Missing return-home days patch — condition made robust** (index.html `initApp`):
  - Root cause: previous patch required `ctStops.length === _BUILTIN_TRIP.stops.length`. If the user added a custom stop (or deleted one), this exact-count check failed silently.
  - New logic: builds `_ctDayStopIds` (stops already in ctDays) and `_ctStopIdSet` (stops in this trip). Finds ALL builtin days whose stop exists in the trip but has no days yet, appends them, re-sorts by day#, saves. No longer requires exact stop count.
  - Effect: Albert Lea (MN), Wisconsin Dells (WI), Fremont (IN) and any other return-home stops reliably appear in the map sidebar and get numbered on the route map.

### Session 27 (continued 2) — 2026-03-10

**Add Destination geocoding fix + expanded test coverage.**

- **`_admInsertDest()` geocoding fix** (index.html):
  - Root cause: function called `_mapAddStopSave()` without setting `_mapAddStopLatLng` — new stops saved with `lat: null, lng: null`, making them invisible on the map and preventing drive distance calculations.
  - Fix: changed `_admInsertDest` from sync to `async`, added Nominatim geocoding call (`https://nominatim.openstreetmap.org/search?q=...&format=json&limit=1&countrycodes=us`) before calling `_mapAddStopSave`. If geocoding fails, function proceeds without coords (graceful fallback) rather than crashing.
  - Button shows "📍 Locating…" while geocoding, restored to "📍 Add to My Trip" after.
- **`lookupDestination()` AI prompt fix** (index.html, from prior session):
  - AI (Gemini) was returning Yellowstone when user typed "Hazen, Arkansas" — prompt said "identify the BEST destination".
  - Rewrote prompt to explicitly confirm the exact place typed, never substitute alternatives. Added rule: only mark VALID as "no" if the place doesn't exist in the US at all.
- **New unit tests added** (`tests/unit.spec.js`):
  - Group 26: "Add Destination — AI response parsing" — 10 tests covering:
    - CONFIRMED/VALID/DESC/DAYS/ATTRACTION regex extraction from typical AI response
    - Fallback: CONFIRMED falls back to typed city when field absent
    - DAYS defaults to 2 when field missing
    - Quote-stripping on CONFIRMED field
    - Case-insensitive regex matching
- **New regression tests added** (`tests/regression.spec.js`):
  - REG-033: `_admInsertDest` exists and is a function
  - REG-034: `_admInsertDest` returns early without crashing when `_admConfirmedName` is empty
  - REG-035: All Add Destination modal DOM elements present (`add-dest-modal`, `adm-city`, `adm-confirm-card`, `adm-insert-btn`, `adm-after-stop`, `adm-nights`, `adm-loading-msg`)
  - REG-036: `_mapAddStopLatLng` is initialised to `null` (no stale coords)
  - REG-037: `openAddDest()` resets `_admConfirmedName` to empty string
  - REG-038: `_mapAddStopSave` inserts stop with correct lat/lng from `_mapAddStopLatLng`
  - REG-039: `_mapAddStopSave` gracefully creates stop with null coords when `_mapAddStopLatLng` is null
- Test file counts updated:
  - `unit.spec.js`: 26 groups, 140+ unit test cases
  - `regression.spec.js`: 39 REG-* checks (REG-001 to REG-039)

### Session 27 (continued) — 2026-03-10

**Password reset root-cause fix + unit test corrections.**

- **Password reset root-cause fix (`_recoverySession`)**:
  - Root cause: Supabase JS v2 fires `SIGNED_OUT` after `PASSWORD_RECOVERY` (one-time token is consumed), which clears the *client's internal* session storage. Our `_isRecoveryMode` flag guarded our `_sbUser` variable but not Supabase's own session — so `updateUser()` failed with "Reset link expired" even on fresh links.
  - Fix: Added `_recoverySession = { access_token, refresh_token }` variable. Captured when `PASSWORD_RECOVERY` fires in `onAuthStateChange`.
  - In `_doSetNewPassword()`, before calling `updateUser()`, we now call `client.auth.setSession(_recoverySession)` to restore the session explicitly.
  - If `updateUser()` still returns a token/session/expired error, `_showRecoveryExpired()` is shown so user can request a new link inline.
  - `_recoverySession` is cleared on success and on `_closePasswordResetOverlay()`.
- **8 unit test corrections in `tests/unit.spec.js`**:
  - `getDayState`: test used `appState.days[42]` → fixed to `appState['day_42']` (actual key format)
  - `_makeCloudSafeState` (2 tests): `.toBeNull()` → `.toBeFalsy()` (function omits dataUrl entirely, value is undefined not null)
  - `loadState`: `.toBeNull()` → `.toEqual({})` (function returns empty object via `|| '{}'` fallback)
  - `showToast` (2 tests): `page.locator('#toast').textContent()` → `page.evaluate(() => document.getElementById('toast').textContent)` (avoids strict-mode error from duplicate #toast IDs in DOM)
  - `_saveSession` (2 tests): `session.name` → `session.userName`, `session.ts` → `session.savedAt` (actual property names)

### Session 27 — 2026-03-10

**Supabase auth, Playwright test framework, password reset fixes.**

- **Supabase migration (Parts 1–13)**: Full Supabase auth integration in index.html. `_initAuth()`, `_sbUser`, `onAuthStateChange`, `PASSWORD_RECOVERY` flow, `_doSetNewPassword()`, profile picker.
- **Password reset flow (multiple fixes)**:
  - Fixed Supabase Site URL to `https://www.maass5.com` (was localhost)
  - Created `_redirects` for Netlify SPA routing
  - Added `PASSWORD_RECOVERY` handler in `onAuthStateChange`
  - Removed `setSession()` calls that caused JWT kid errors
  - Added `_isRecoveryMode` flag to prevent SIGNED_OUT from clearing `_sbUser`
  - Added × close button, Escape key, Cancel link to reset overlay
  - Added `_showRecoveryExpired()` + inline re-request UI
- **Playwright testing framework**: Full test suite created.
  - `tests/smoke.spec.js` — 7 fast no-login smoke checks
  - `tests/unit.spec.js` — 25 groups, 130+ unit test cases for pure functions
  - `tests/integration.spec.js` — 9 groups testing auth state, save/load pipeline, IDB, merge, permissions
  - `tests/e2e.spec.js` — 10 groups testing full user workflows (login, tabs, reset, notes, toast)
  - `tests/regression.spec.js` — 25 named regression checks (REG-001 to REG-025)
  - `scripts/pre-deploy-check.sh` — run before every deploy; exits 0 = safe, 1 = blocked
  - To run: `npm install && npx playwright install chromium` then `npm run test:fast` (no auth) or `npm test` (full)
- **TripGenie-Test-Plan.docx**: 20-section, 100+ test-case plan covering all features.

### Session 26 (continued 8) — 2026-03-08

**Gallery progressive thumbnail upgrade + full-screen lightbox; schedule scroll-to-today date fix; Drive agenda item synced to OSRM cache.**

- **`_galleryUpgradeFromIDB(container)`** (commit `0d8f9f5`): After the gallery grid renders, this new function progressively replaces blurry 200px thumbnails with full-res images from IndexedDB. Processes 5 tiles per 120ms batch to avoid frame drops. Finds tiles by `[data-photo-id][data-media-type="image"]` selector, calls `_idbGet(photoId)` for each, and swaps `img.src` if a different full-res URL is found in IDB.

- **`_doOpenMediaLightbox` rewrite** (commit `0d8f9f5`): Full-screen overlay now uses `width:min(96vw,1400px)` and `max-height:85vh` on the image element with `object-fit:contain`. Overlay fills the entire viewport (`position:fixed;inset:0`). Added a loading shimmer shown while IDB loads full-res image, Escape key to close (via `_lbEscHandler`), and a more prominent close button. Previously images displayed at ~300px regardless of screen size.

- **Schedule `isToday` / `isBefore` date-string fix** (commit `e037383`): `isToday` was computed as `d.day === tripDay()` — comparing day numbers. This breaks after an AI trip rebuild because day numbers no longer align with ordinal date positions from the original start date. Fixed: added `_todayMidnight` (midnight today) and `_todayDateStr` (YYYY-MM-DD string) at the top of `renderSchedule`. In the loop, `_effDateStr` is built from `_effectiveDate` (already computed for each day). `isToday = _effDateStr === _todayDateStr` and `isBefore = _effectiveDate < _todayMidnight`. Schedule now reliably scrolls to today's card via the `id="sch-today"` target.

- **Drive agenda item synced to OSRM cache** (commit `e037383`): The agenda's `drv` item in `_buildDayItems` was reading `d.miles` and `d.driveHours` — placeholder values hardcoded in `trip_data.js` as 200 mi / 4h for every drive day. The orange drive separator (`_renderDriveSepA`) already reads real values from `appState.osrmDriveCache[d.day]`. Fixed `_buildDayItems` to read the same cache first: `var _osrmHit = appState.osrmDriveCache && appState.osrmDriveCache[d.day]; var _drH = (_osrmHit && _osrmHit.driveHours) || d.driveHours || 0; var _drMi = (_osrmHit && _osrmHit.miles) || d.miles || 0;`. Now when the orange separator shows "247 mi · 4.5h", the agenda Drive item shows the same values.

### Session 26 (continued 7) — 2026-03-08

**Drive day "bookend" cards showing departure morning and arrival evening on same date.**

- **Drive day bookend cards in `renderSchedule`**: For every drive day entry, the schedule now shows:
  1. A compact "departure morning" card (before the orange drive separator) — shows the origin stop name, the departure time, and a "📦 Morning departure" subtitle. Clicking it opens the Day Detail for that day.
  2. The orange drive separator (unchanged visual).
  3. The destination phase header (unchanged).
  4. A compact "arrival evening" card (after the phase header) — shows the destination stop name, campground/booking name if available, and estimated arrival time. Clicking it opens the Day Detail for that same day.

  Both bookend cards share the same Day Detail when tapped — so they both open the Agenda for the drive day's date. This achieves the "Nashville morning / drive / Memphis evening all on March 9" layout the user wanted.

- **Duplicate `id="sch-today"` prevention**: Added `_schTodayIdAssigned` flag in `renderSchedule`. When the departure morning bookend card assigns `id="sch-today"`, the flag is set and `_renderDriveSepA` + regular day cards skip emitting the same id. `_renderDriveSepA` now takes an optional `skipTodayId` parameter.

### Session 26 (continued 6) — 2026-03-08

**Drive time accuracy (OSRM caching); fuel budget on dashboard; schedule auto-scroll to today.**

- **Drive time accuracy fixed with `osrmDriveCache` + `osrmVirtualCache`**: The root cause was that `trip_data.js` has every drive day hardcoded as `miles: 200, driveHours: 4` (placeholder values). The existing `_recalcDriveMiles` function already calls OSRM correctly, but only saved results to `appState.customTripData.days` — meaning builtin trip users lost the corrections on page reload. Fixed by:
  - `_recalcDriveMiles` now ALSO saves each leg's result to `appState.osrmDriveCache[dayNum]` (day-number keyed) and `appState.osrmVirtualCache["fromId_toId"]` (stop-pair keyed). Both persist via `saveState`.
  - `_renderDriveSepA` now reads `appState.osrmDriveCache[d.day]` first, falling back to `d.miles`/`d.driveHours` only if no cached value exists. All mileage/hours/arrival calculations use the cached real values.
  - New `_prefetchVirtualRoutes()` async function: finds all stop-to-stop transitions that render as virtual separators, filters to uncached legs, calls OSRM for each, saves to `appState.osrmVirtualCache`, then calls `_refreshAll(true)` so the schedule re-renders with real times.
  - `_renderVirtualDriveSep` now checks `appState.osrmVirtualCache["fromId_toId"]` first — uses those real OSRM distances/times if cached; falls back to Haversine × 1.3 ÷ 55 mph estimate if not yet cached.
  - Auto-trigger in `initApp()`: 5 seconds after init, checks for drive days still at placeholder values (`miles === 200 && driveHours === 4` and no cache entry) and fires `_recalcDriveMiles(true)` + `_prefetchVirtualRoutes(true)` silently in the background.
  - Health check condition updated: now also detects placeholder values (200/4), not just 0-mile days, so the Trip Settings → Health Check auto-fix fires correctly for trips using builtin data.

- **Dashboard fuel estimate now pulls from budget**: Changed `fuelEst` in `renderDashboard` to use `appState.catBudgets.fuel` (the value entered in Tools → Budget → Fuel category) when set. Before trip: shows "X budgeted". During trip: shows "current spend estimate / total budget" scaled by trip progress %. Falls back to the mileage-based formula only if no fuel budget has been entered.

- **Schedule tab auto-scrolls to today's card**: Added `id="sch-today"` to the day card div when `isToday === true` (also to `_renderDriveSepA` when `_isToday === true`). New `_schedScrollToToday()` function calls `scrollIntoView({ behavior: 'smooth', block: 'start' })` on that element. Called when the user taps the Schedule tab. No-ops if trip hasn't started yet.

- **Dashboard 0 miles / 0 days on road (user question)**: These show 0 because `appState.tripStarted` hasn't been set yet. The user needs to tap the orange **Start Trip** button on the dashboard's blue Day card to activate live progress tracking. The trip started March 2, 2026 — `tripIsLive()` is true but the app waits for the explicit Start Trip action before counting miles/days on road.

### Session 26 (continued 5) — 2026-03-08

**Agenda "yesterday" fix; Suggestions tab current-stop jump + past-stop hiding.**

- **Agenda always opens to today (`_agInitCollapsed`)**: The collapse state was initialized once per JS session (`if (_agCollapsed) return`). If the app stayed open overnight, the next day it still showed yesterday's section open. Fixed by tracking `_agCollapsedForDate` — if the tracked date differs from today's, the collapse state is fully reset, so reopening the agenda always shows the actual current day expanded.

- **Suggestions tab: hide past stops + auto-scroll to current stop (`_renderFriendSuggestionsFamily`)**: Past stops (those with a `departures` entry in appState) are now hidden by default, replaced by a toggle button "🕐 Show N from past stops". Current stop (arrived but not yet departed, or today's TRIP_DAYS entry as fallback) gets a green card border + "📍 You are here" badge. The view auto-scrolls to the current stop's card on render. A `_frndLastRows` cache allows the toggle to re-render without re-fetching.

- **Data overwrite concern (iPad)**: The smart merge system (`_smartMergeStates`) prevents any device's save from silently overwriting another device's edits — merges are union-based, so no edits are lost. No code change needed.

### Session 26 (continued 4) — 2026-03-08

**Schedule stop card shows booked RV park name; Add Destination network error improved.**

- **Schedule stop card now shows booked property name (`phaseHeaderHtml`)**: When a booking confirmation exists for a stop, the accommodation pill on the blue stop card now shows the actual property name (e.g. "🎫 Memphis KOA") in gold instead of the generic "🏕️ Campground" label. Tapping it opens the booking confirmation modal directly. When no booking exists, the pill works as before (tap cycles through accommodation types).

- **Add Destination "Network error" now shows real cause**: `lookupDestination` previously swallowed all fetch errors into a generic "Network error" toast. Fixed by: (1) checking `r.ok` before `r.json()` — a non-JSON 404/500 page (e.g. Netlify function not found) no longer silently throws a parse error; (2) the `.catch` now receives the actual Error object and maps known server messages (GEMINI_KEY missing, 403 Forbidden, 404, 429 quota) to user-friendly text; (3) the real error is logged to console for debugging.

### Session 26 (continued 3) — 2026-03-08

**Booking confirmations injected into agenda; departure time onclick quoting bug fixed.**

- **Booking confirmations now appear in agenda (`_buildDayItems`)**: The daily agenda now automatically surfaces booking data from `appState.bookingConfirmations[stopId]` — no manual entry needed. Changes:
  - Added booking lookup at the top of `_buildDayItems`: finds the booking whose `checkInDate`/`checkOutDate` spans the current day (or falls back to first booking for the stop).
  - `_parseBkgTime(t)`: new helper that parses booking time strings in any format ("3:00 PM", "15:00", "3pm") → "HH:MM" for 24-hour display.
  - `_withBkg(baseItem)`: new helper that enriches any agenda item with booking data — `propertyName` replaces/fills subtitle, `siteOrRoom` appended as "Site #", `address` and `phone` filled, `notes` set to "Conf #XXXX".
  - **Drive days**: "Arrive & Check In" now uses `checkInTime` from the booking as its start time (instead of the generic arrival estimate), and `_withBkg` fills all the booking detail fields.
  - **Stay days**: "Back at Camp" is now enriched by `_withBkg` with property name, site#, address, phone, and confirmation number.

- **Fix ReferenceError: "dallas is not defined" on Schedule tab departure time chip**: The `_departChip` onclick handler (line 11278) interpolated stop IDs directly into the HTML onclick string without quotes. Stop IDs like `dallas-tx` were read as `dallas - tx` (variable minus variable) by JavaScript → ReferenceError. Fixed by wrapping both `prevStop.id` and `destStop.id` in single-quotes inside the onclick string: `openDriveTimeModal(5,'dallas-tx','nashville-tn',1234567890)`. Now correctly passes quoted string IDs.

- **Comprehensive onclick quoting audit — 10 additional unquoted stop ID calls fixed**: A full audit found the same unquoted-stop-ID pattern in 10 more places: `showStopForecastModal` (7 occurrences — curStop.id×2, _fsId×2, _sidAttr, stop.id×2, and 2 template literals using `${stop.id}`), `openAreaInfo` (_sidAttr argument unquoted), and a second `openDriveTimeModal` call (stop.id). All now wrapped in single-quotes so the generated onclick HTML passes the stop ID as a proper JS string literal, not an arithmetic expression.

### Session 26 (continued 2) — 2026-03-08

**IndexedDB photo storage — remove the ~5 photo localStorage limit.**

- **Root cause of "only 2-3 photos" limit**: full-res dataUrls (200–500 KB each base64) were stored in `appState.photoPool` → `localStorage`. Hit the 5 MB quota after ~3–5 photos. Fix: use IndexedDB (device disk, no practical quota) for full-res.
- **New IDB helpers**: `_idbOpen`, `_idbSave`, `_idbGet`, `_idbDelete` — wrappers over `indexedDB.open('rv_photos', 1)` with `photos` object store keyed by photo ID.
- **`_afterCompress` new sequence**: compress → generate 200px thumb → save full-res to IDB → read EXIF → save metadata (no dataUrl) to localStorage. `entry.dataUrl` is always `null`.
- **`renderGalleryTab`**: pool entries carry `photoId`. Grid shows `thumb`. Tiles have `data-photo-id` attribute passed to lightbox.
- **`_openMediaLightbox(src, type, caption, photoId)`**: if `photoId` provided, loads full-res from IDB on demand. Falls back to thumbnail. Inner logic in `_doOpenMediaLightbox`.
- **`_idbMigratePool`**: called once at gallery open — moves any legacy `dataUrl` pool entries to IDB, clears from localStorage. Shows toast.
- **Capacity**: localStorage now holds only thumbs (~5–10 KB each). ~300+ photos can now be stored in localStorage/cloud. Full-res limited only by device disk.

### Session 26 (continued) — 2026-03-08

**Fix gallery photo upload pipeline: dates, thumbnails, map, and empty-state.**

- **Wrong photo dates (showed as upload date not capture date)**: `timestamp` was set to `new Date().toISOString()` — always today. Fixed to `new Date(file.lastModified).toISOString()`. `file.lastModified` is the file modification time, which for phone photos is almost always the camera capture time. Photos now sort into the correct date sections even without EXIF.

- **Mobile photos not appearing on desktop (thumbnail race condition)**: `_compressPhotoThumb` is async (canvas onload), but `_doSave` was triggered from the EXIF promise chain — both ran concurrently and thumb almost always lost the race, so `entry.thumb = null` at save time. Cloud sync strips `dataUrl` (correct) but now also had `thumb: null` → other devices had no image data. Fixed by restructuring `_afterCompress`: generate thumbnail FIRST, then run EXIF, then save. Now `entry.thumb` is always set before hitting the cloud.

- **Gallery map not showing for non-GPS photos**: Location clustering only used EXIF GPS coordinates. Journal photos have `stopId` but no GPS. Fixed: in the clustering loop, if `exif.lat` is null, fall back to `getStop(p.stopId).lat/lng`. Also added `stopId` to the `allPhotos` entries pushed from journal entries (previously missing). Now journal photos show up as stop-location pins on the gallery map.

- **Errant "Add Photos" button at bottom of gallery**: When cloud-synced pool entries had `thumb: null` and `dataUrl: null`, the photo was skipped by `_poolSrc` null check → `allPhotos.length === 0` → empty state rendered with a big "📤 Add Photos" button at the bottom. This looked like a stray/errant button when photos clearly existed. Fixed: distinguish between "no photos at all" vs "photos exist but can't display" — the latter now shows a "☁️ Photos syncing from cloud…" message with guidance to re-upload if needed, not a confusing Add Photos button.

### Session 26 — 2026-03-08

**Gallery share button in Suggestions tab; fix gallery photos disappearing after cloud sync.**

- **Gallery share button in Suggestions tab**: The "Friends & Family Suggestions" tab now has two share buttons: **Share Route** (purple, calls `_copyShareLink()`) and **Share Gallery** (orange, calls `_copyGalleryLink()`). These sit side-by-side in the tab header. The "How it works" description updated to explain both. The Route Map tab retains its original "Share Route" button unchanged.

- **Gallery photos disappearing after cloud round-trip (root cause fix)**: Photos uploaded on the main device were disappearing after a page reload. Root cause: `syncToCloud` → `_makeCloudSafeState` strips `dataUrl` from every photoPool entry before pushing to Supabase (correct, to avoid large payloads). On reload, `loadFromCloud` calls `_smartMergeStates(local, cloud)`. Since the cloud save timestamp is newer than the local save, the cloud version becomes the `base`. Its photoPool entries have no `dataUrl`. `_unionById` sees each photo ID already in the base and skips adding the local entry (which had the `dataUrl`). Result: merged state has photos without `dataUrl` → photos appear as broken/invisible. Fix: after `_unionById` for `photoPool`, added a pass that restores `dataUrl` (and `thumb`) from the "other" (local) side for any merged entry that is missing them:
  ```javascript
  var _otherPhotoMap = {};
  (other.photoPool || []).forEach(function(p) { if (p.id) _otherPhotoMap[p.id] = p; });
  m.photoPool.forEach(function(p) {
    if (!p.dataUrl && _otherPhotoMap[p.id] && _otherPhotoMap[p.id].dataUrl)
      p.dataUrl = _otherPhotoMap[p.id].dataUrl;
    if (!p.thumb && _otherPhotoMap[p.id] && _otherPhotoMap[p.id].thumb)
      p.thumb = _otherPhotoMap[p.id].thumb;
  });
  ```
  This ensures the full-resolution image is always restored from whichever state copy has it.

### Session 25 — 2026-03-08

**Waypoint UI consistency, login date fix, gallery share link.**

- **Waypoint UI consistency**: All stops reduced to 0 nights now render as the grey dashed "Waypoint" card regardless of how they reached 0 nights. Previously, stops reduced via the `−` nights button (which set `phaseExtraDays` but NOT `waypointOverrides`) fell through to the full blue stop card showing "Waypoint active" in the toggle — inconsistent with stops set via `_toggleWaypoint`. Two-part fix: (1) `phaseHeaderHtml` now checks for `totalNights === 0` early (before the waypoint branch), setting `_isWpOverride = true` to route to the grey card; (2) `removePhaseDay` now auto-sets `waypointOverrides[stopId] = true` when reducing a stop to 0 nights, so future loads are consistent.

- **Login page effective end date**: The login screen previously showed the raw last TRIP_DAYS date (April 19) regardless of schedule modifications. Fixed: the pre-login init code now reads `phaseExtraDays` from localStorage and applies the total adjustment to the displayed end date and day count. If phaseExtraDays collectively shorten the trip by 5 days, the login screen now correctly shows "Apr 14" as the end date. This means the displayed date always reflects the actual planned schedule.

- **Gallery share link (`?gallery=1`)**: Family friends can now view the photo gallery without logging in. Added `?gallery=1` URL parameter mode: (1) bypasses login screen; (2) loads latest state from Supabase cloud; (3) boots app in viewer/read-only mode; (4) hides all nav tabs except Gallery; (5) shows "📷 Gallery View" badge in header. Share button added to gallery tab header — clicking `🔗 Share` copies the shareable URL (`[base]?gallery=1`) to clipboard. In gallery share mode the "Add Photos" and "Share" buttons are hidden. New functions: `_initGalleryShareMode()`, `_applyGalleryMode()`, `_copyGalleryLink()`, `_copyGalleryLinkFallback()`.

### Session 24 — 2026-03-08

**Photo gallery cross-device sync fix; agenda item click-to-edit and move-between-days.**

- **Photo gallery cross-device sync (`_makeCloudSafeState`)**: Photos uploaded on one device no longer disappear on other devices. Root cause: full-size base64 photo dataUrls (~200-400 KB each) were included in `appState.photoPool` and pushed to Supabase, exceeding payload limits. Fix: `_makeCloudSafeState(state)` strips `dataUrl` from each photoPool entry before cloud sync, keeping only metadata + `thumb` (200px JPEG). `syncToCloud` now uses the cloud-safe copy. `_galleryUpload` generates a `thumb` via `_compressPhotoThumb` for each uploaded photo. `renderGalleryTab` uses `p.dataUrl || p.thumb` so mobile/other devices show thumbnails while the uploading device shows full resolution. Thumbnail entries show a ☁️ badge.

- **Agenda item click-to-edit**: All rows in the agenda view are now clickable (hover highlight + ☁️✏️ indicator). Custom `agendaEvent` items (📌 pinned events): clicking opens `showAddAgendaEventModal(null, ev.id)` with all fields editable. Built-in/override items (Breakfast, Drive, etc.): clicking opens the new `_showMoveItemSheet` bottom sheet.

- **`showAddAgendaEventModal` date field**: When editing an existing event, date is always a dropdown so the user can move it to a different day.

- **`_showMoveItemSheet` + `_saveMoveItem`**: New bottom sheet for editing/moving built-in and override agenda items. Editable title, start/end time, and "Move to Day" dropdown. Removes item from source day's override (builds from `_buildDayItems` if no override exists), adds to target day's override, saves under day-number keys.

- **Stale entry cleanup in `_saveAgendaEvent`**: When an `agendaEvent`'s date changes, old `_fromEvents` override entries on the previous day are cleaned up.

### Session 23 (continued, part 2) — 2026-03-08

**Smart multi-user conflict resolution — no more lost edits.**

- **`_smartMergeStates(a, b)`**: New function that combines two `appState` snapshots so neither person's edits are lost. Strategy: (1) Additive arrays — `customBookings`, `aiSuggestions`, `photoPool`, `journalEntries`, `savedPostcards`, `customListItems.todo/pack` — are merged by unique id (union); (2) Boolean maps — `bookingStatus`, `listChecked`, `listHidden` — merge keys with "true wins over false" (once you check something, it stays checked); (3) Per-key object maps — `arrivals`, `departures`, `dayNotes`, `phaseExtraDays`, `removedStops`, `stayType`, `dayOverrides`, `sleepOverrides`, `customActivities`, `day_*` etc. — merge keys from both sides, newer snapshot wins on collision; (4) Structural data — `customTripData` route, `tripSettings`, `drivingPrefs`, scalar prefs — use the newer `_savedAt` as the base. Merged state gets `_mergedAt` and `_mergedFrom` tags.

- **`_showConflictBanner` updated**: Now calls `_smartMergeStates(myState, theirState)` instead of picking a winner. Both snapshots saved as emergency backups first. Merged state written to localStorage + cloud. Shows "🔀 Merged [name]'s changes — no edits lost" toast.

- **`_resolveConflict` updated**: Legacy manual-banner function also routes through smart merge now.

- **`loadFromCloud` updated**: Normal sync path (remote is newer) now uses `_smartMergeStates(appState, remote)` instead of `appState = remote`. Data-regression check preserved but rephrased as a toast ("Merged: cloud had fewer stops — kept your local route"). No more silent overwrites on startup load.

### Session 23 (continued) — 2026-03-08

**Bookings refresh fix, Add Destination wizard overhaul, gallery per-photo processing, gallery date-sections + always-on map.**

- **Bookings tab refresh fix (`_refreshAll`)**: `_refreshAll()` now calls `renderBookingsTools()` whenever the bookings sub-tab is currently visible. Previously, adding a stop from the map while on the Bookings tab left the stop-selector chip list stale until the user navigated away and back.

- **Add Destination wizard → actual schedule insertion**: The "Add Destination" wizard (Planner → Schedule → ➕ icon) previously saved new destinations only as pending AI suggestions (`appState.aiSuggestions`) rather than as actual schedule stops. Root cause: step 2 confirmation called `analyzeDestination()` which only populated the adjustments list. Fixed by adding a **Step 4 position picker** to the wizard modal:
  - Step 2 primary button now reads "📍 Add to Schedule" and calls `_admToStep4()` directly (skipping AI analysis)
  - Step 2 secondary link "✨ Analyze trip fit with AI first" is available for users who want AI analysis
  - Step 3 (AI analysis result) now has a "📍 Add to Schedule →" primary button that also goes to step 4
  - Step 4 shows "INSERT AFTER" dropdown (populated from current `TRIP_DAYS` stop order) and "NIGHTS TO STAY" input, then calls `_mapAddStopSave()` which does the actual insertion
  - `_mapAddStopSave` null-safed for `_mapAddStopLatLng` (wizard doesn't provide GPS coords)
  - Progress dots updated to 4 steps; `_admSetStep` handles 4-step flow

- **Gallery: per-photo sequential processing + progress pie toast**: Reverted compression to 1200px / 0.82 quality (higher quality than the original 0.70). Photos are now processed one at a time (FileReader → compress → EXIF → save to localStorage), catching quota errors per-photo and continuing. `_galleryProgressToast(current, total)` shows a fixed bottom toast with SVG pie-chart animation displaying "Saving X of Y…". Geocoding is fire-and-forget — resolves asynchronously and updates the already-saved entry.

- **Gallery: date-sectioned layout + always-on map**: Replaced the `[📷 Grid] [🗺 Map]` toggle with:
  - Leaflet map **always shown at top** (220px) whenever any photos have GPS coordinates
  - Map pins show photo count per location cluster; clicking a pin sets `_galleryMapFilter` to filter all date sections below to just that location; clicking again or the "✕ Show all" pill deselects
  - Gallery below is always date-sectioned: each unique date gets a `March 14, 2026 ─────────────── (N photos)` divider, followed by a 3-column photo grid for that date
  - Dates are sorted newest-first using EXIF DateTimeOriginal → entry.date → upload timestamp
  - Removed `_galleryTabView` state var and toggle logic (no longer needed)

### Session 23 — 2026-03-08

**Gallery enhancements: EXIF date sorting, location map view, and upload capacity fix.**

- **Upload capacity fix (`_compressImage`)**: Reduced default `maxDim` from 1200 → 800 and `quality` from 0.70 → 0.55. This roughly triples the number of photos that can be stored in the ~5 MB localStorage quota (~200 KB/photo at old settings → ~70 KB/photo at new settings). Users should now be able to upload 10–15 photos per batch instead of 3–4.

- **EXIF reading in `_galleryUpload`**: Gallery uploads now capture GPS coordinates, DateTimeOriginal, and reverse-geocoded location name from JPEG/TIFF files via `exifr`. The new flow restructures `_galleryUpload` to: (1) compress all images first, (2) run `Promise.all()` over EXIF promises for each entry in parallel (including Nominatim reverse-geocode for any GPS-tagged photos), (3) clean up temp `_file` reference from each entry, then (4) save to localStorage once with full EXIF data attached. Photo pool entries now store: `exif: { lat, lon, dt, locationName }`. Previously, gallery uploads had no EXIF data at all — only journal photos did.

- **Date-sorted gallery (`renderGalleryTab`)**: Photos in the Gallery tab are now sorted by actual photo date (newest first) using `exif.dt` (EXIF DateTimeOriginal) when available, falling back to `entry.date` (journal date) or upload timestamp. Previously photos appeared in reverse upload order regardless of when they were actually taken.

- **Gallery map view**: Added `[📷 Grid] [🗺 Map]` segmented toggle in the gallery header (later replaced in Session 23 continued with always-on map). Map view uses Leaflet with circle markers (number = photo count), clustered to 0.05° (~5 km) resolution.

### Session 22 — 2026-03-08

**Explore/Waypoint toggle, agenda header overflow fix, weather lookup fix, cross-tab sync fix.**

- **Explore/Waypoint segmented toggle**: Replaced the single "Make Waypoint" / "📍 Waypoint — Restore?" button in the Schedule phase header with a proper `[🗺 Explore] [📍 Waypoint]` segmented control. The active option is highlighted white; the inactive option is dim and clickable. Clicking "Waypoint" calls `_toggleWaypoint(stopId)`; clicking "Explore" when in waypoint state also calls `_toggleWaypoint` to restore. In the grey waypoint card (`_isWpOverride = true`), the toggle shows with "Waypoint" active; clicking "Explore" restores the stop. Built-in waypoints (not user-toggled) keep the existing remove button.

- **Agenda header overflow on narrow/tablet screens**: The agenda day card header left side (date pill + weekday + location) was pushing the right-side buttons (✏️ Edit, 🗺 Map, ▾) off the screen edge on iPad/narrow desktop. Fixed by adding `min-width:0; overflow:hidden` to the left container and `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` to the day/location text. Added CSS class `ag-wx-badge` to weather display and a `@media (max-width:540px)` rule to hide it on mobile (so buttons always stay visible).

- **Weather missing on TODAY's agenda card**: The agenda weather lookup used `_eStr` (effective date after pause/phaseExtraDays offsets) but weather is stored by `d.date` (raw trip date). If these differ, no weather was shown. Fixed by using `_wxStore[_eStr] || _wxStore[d.date]` as fallback. Also applied same fix in the calendar view (second weather lookup around line 23279).

- **Stop changes not updating all tabs**: `_doRemoveStop`, `restoreStopToTrip`, and `_mapAddStopSave` only called `renderSchedule()` — they skipped Agenda, Day Planner, Dashboard, and Stop Navigator. Fixed by replacing those individual render calls with `_refreshAll(true)` in all three functions. Also fixed `_toggleTransitDay` which only called `renderSchedule()`. Now ALL tab views stay in sync when stops are added, removed, restored, or toggled.

### Session 21 — 2026-03-08

**Day map feature + Schedule modal deprecation.**

- **Day map in Agenda**: Each day card in Planner → Agenda now has a 🗺️ (FA `fa-map-location-dot`) button that toggles an inline Leaflet map. Numbered orange pins show agenda items in chronological order.
  - LAT/LNG added to `_aaeExtractPrompt()`, `_agendaLookupInfo` prompt (5 lines now), `_aaeApplyExtracted`, hidden `aae-lat`/`aae-lng` inputs in modal, `_saveAgendaEvent` (record + `_agSched.push`).
  - `_agGetMappableItems(eStr, dayNum)` collects all items with addresses/coords for a day.
  - `_agInitDayMap(eStr, dayNum)` builds map canvas, geocodes items, plots numbered markers.
  - `_agGeocodeItems(items, callback)` — sequential geocoder: uses stored lat/lng first, then Nominatim with in-memory `_agGeoCache` and 350ms inter-request delay (respects 1 req/sec limit).
  - Map container `<div id="ag-day-map-{eStr}">` inserted at top of each day body (above items list).
- **Schedule modal deprecated**: Clicking a day bar (ds-wrap) now calls `openAgendaDay(dayNum)` instead of `openDayDetail`. Navigates to Planner → Agenda, expands the day card, scrolls to it with an orange outline pulse. `_ddmDayNum` still set so long-press time-edit works.
  - `_agDayNumToEStr(dayNum)` computes effective date string for a day (phase + pause offsets).
  - DDM HTML retained for drive-mode dashboard and adjustments game-card mode.
- **Arrived / Left on blue stop header**: Replaced the `+ nights −` button group with inline `arr-btn-{stopId}` and `dep-btn-{stopId}` buttons. Show time when set. Long-press calls `_barLongPress(type, dayNum)` → `startLongPress` → `openTimeEdit`.
  - `_barArrived(dayNum)` / `_barDeparted(dayNum)` — mirror `recordArrival`/`recordDeparture` but target inline buttons; set `_ddmDayNum` for context.
  - `confirmTimeEdit` updated to also refresh inline bar buttons (by stopId) when time is edited retroactively.

### Session 20 — 2026-03-08

**Lookup, sort, dismiss-X, image upload, and Add Item modal fixes.**

- **Gemini lookup now fetches the URL**: `_agendaLookupInfo` now passes `tools: [{ urlContext: {} }]` when a URL is provided. Gemini 2.0 Flash (used by the Netlify proxy) fetches the actual page and returns accurate address/hours from it, instead of guessing from training data. Prompt now says "Use ONLY what is on the page."
- **× dismiss button on AI result panel**: The green result box now has a small ✕ button (top-right corner) to clear the extracted details. Inner content is now in `aae-ai-result-inner` div; all `.innerHTML` setters updated to target the inner div.
- **Sort fix — events no longer stuck at bottom**: Root cause was `agendaEvents` (events saved without "Add to Day Schedule" checked) being always rendered at the bottom regardless of time.
  - `_saveAgendaEvent`: When ANY `date` is set (i.e., modal opened from a specific day), `_toSchedule = true` regardless of checkbox state. Events from the "Add event this day" button now always go to `agendaItemOverrides` with proper sort.
  - Modal UI: "Add to Day Schedule" checkbox is now hidden when `prefillDate` is set (it was always going to override path anyway).
  - Render: Override items path now merges any existing `agendaEvents` items for the day into `_ovItems`, sorts the combined list, and renders together. Auto-gen path renders `_dayManual` items sorted inline too.
- **"+ Add Item" modal z-index fix**: `showAddAgendaEventModal` now uses `z-index:100001` (was 99999), so it always appears on top of the Edit Day modal (z-index:99999).

### Session 19 (fifty-eighth context) — 2026-03-07

**Time selector overhaul + Extract section redesigned with image upload.**

- **Custom time selects in Edit Day list**: Replaced the two native `<input type="time">` fields in `_refreshEditDayItemsList` with `_timeSelectHtml(...)` calls. No more truncated "03:3" display — shows clean "3:30 AM" in a styled select.
- **Custom time selects in Add Event modal**: Replaced `<input id="aae-start" type="time">` and `<input id="aae-end" type="time">` in `showAddAgendaEventModal` with `_timeSelectHtml('aae-start', ...)` and `_timeSelectHtml('aae-end', ...)`. Values still stored as 24h "HH:MM" internally.
- **`_calFmtTime` fixed**: Always shows `:MM` (e.g. "9:00 AM" not "9 AM").
- **Agenda items show start–end time range**: Override item time label now shows start + end on two lines with a faded second line.
- **Extract section redesigned**: "📧 Auto-fill from confirmation email" collapsed section replaced with always-visible "✨ Auto-fill from confirmation" panel with two tabs:
  - **📋 Paste Text** — paste any confirmation text (OpenTable, email, etc.)
  - **📸 Upload Image** — upload a photo, screenshot, or PDF; Gemini reads it via vision API
- **`_aaeExtractPrompt()`**: Shared extraction prompt builder; explicitly instructs Gemini to extract the venue name (not the booking platform), convert times to 24h format, and return "Not found" for unknowns.
- **`_aaeApplyExtracted(txt2)`**: Shared field-filler called by both text and image extraction paths.
- **`_agendaExtractFromImage()`**: New function — reads the selected file as a base64 DataURL, sends it to Gemini 1.5 Flash as an inline_data vision request, then calls `_aaeApplyExtracted`.
- **`_aaeImageSelected(input)`**: Shows file name + size preview in the image panel and enables the extract button.
- **`_aaeTab(tab)`**: Switches between text/image panels and styles tabs accordingly.
- **Improved extraction prompt**: Now correctly handles restaurant confirmations (e.g. OpenTable) — extracts venue name (not "OpenTable"), converts "7:00 PM" → "19:00", etc.

### Session 19 (fifty-seventh context) — 2026-03-07

**Agenda date bugs fixed: unsorted _agPhaseOffset, _getStopEffectiveDates loop, agendaItemOverrides key migration.**

- **Bug 1 (Agenda dates wrong — Mar 7 pushed to Mar 8, Nashville missing)**: `renderPlannerAgenda._agPhaseOffset` was computed from unsorted `TRIP_DAYS`, causing every stop's phase offset to be wrong whenever `customTripData.days` is out of date order. Fixed by computing `_agPhaseOffset` from `_agSorted` (date-sorted), matching `renderSchedule._schPhaseOffset` exactly.
- **Bug 2 (showEditDayAgenda could find wrong day)**: Same unsorted-TRIP_DAYS issue in `showEditDayAgenda._phOff`. Fixed to sort before computing.
- **Bug 3 (_getStopEffectiveDates included subsequent stops in cumOffset)**: The `forEach` loop only did `return` (skip current iteration) when hitting `stopId`, so it continued and added phaseExtraDays for stops AFTER the current stop into cumOffset — logically wrong. Fixed by changing to a `for` loop that `break`s when `stopId` is hit. Now cumOffset only includes stops strictly before the current stop, matching `renderSchedule._schPhaseOffset`.
- **Bug 4 (Planner suggestions / agenda items "deleted" after date edits)**: `agendaItemOverrides` was keyed by effective-date strings. When `phaseExtraDays` changed (e.g., after editing arrive dates), effective dates shifted and items appeared to vanish. Fixed by keying all new saves by `d.day` (day number, stable through date changes). Added `_migrateAgendaItemOverrideKeys()` — called at the top of `renderPlannerAgenda()` — which remaps any legacy date-string keys to day-number keys on first run.

### Session 19 (fifty-sixth context) — 2026-03-07

**Fix date cascade for out-of-order TRIP_DAYS (blue bar / modal inconsistency, GSM not cascading).**

- **Root cause**: `_getStopEffectiveDates`, `phaseHeaderHtml._phCumOffset`, `renderSchedule._schPhaseOffset`, and `_editStopDays` prev-stop detection all iterated `TRIP_DAYS` in raw array order. AI-generated or edited `customTripData.days` can have entries in a different order than their dates, causing wrong cumulative offsets (e.g. GSM appearing before Winchester → Winchester extras not counted for GSM).
- **Fix 1**: `_getStopEffectiveDates` now sorts `TRIP_DAYS` by date before computing `cumOffset` and filtering `phaseDays`.
- **Fix 2**: `phaseHeaderHtml` now calls `_getStopEffectiveDates(firstDay.stopId)` directly — blue bar always matches modal.
- **Fix 3**: `renderSchedule._schPhaseOffset` computed from `_sortedDays` (date-sorted) not raw `TRIP_DAYS`.
- **Fix 4**: `_editStopDays` prev-stop detection sorts `TRIP_DAYS` before building the stop list.

### Session 19 (fifty-fifth context) — 2026-03-07

**Three schedule date fixes: blue bar depart off-by-one, first stop arrival editable, Settings date sync.**

- **Blue bar depart date fixed**: `_phLastDate` formula changed from `_phCumOffset + totalNights - 1` (which showed the last *night* date, not the departure day, and showed the same date as arrival for 1-night stays) to `_phCumOffset + totalNights`. Now "Depart Wed Mar 4" for a 2-night stay starting Mon Mar 2. Also changed condition from `totalNights > 1` to `totalNights > 0` so 1-night stays correctly show a depart date.
- **First stop arrival now editable**: Removed the "First stop — read-only" restriction in `_editStopDays`. All stops now show an editable arrive date picker. For the first stop, the hint text reads "Changing this updates the trip start date in Settings." In `_saveStopDays`, when `_sdePrevStopId` is null (first stop), changing the arrive date re-dates all TRIP_DAYS from the new date and updates both `CONFIG.startDate` and `appState.tripSettings.startDate` (same logic as `saveTripSettings`).
- **Settings start date synced with schedule**: `renderTripSettings` now derives `startVal` from `TRIP_DAYS[0].date` and `endVal` from `TRIP_DAYS[last].date` as ground truth, falling back to saved settings / CONFIG. This ensures the Settings form always reflects the actual first/last dates in the schedule, even if `appState.tripSettings` is stale.

### Session 19 (fifty-fourth context) — 2026-03-07

**Agenda smart modal UX overhaul: date label, email paste, Escape, auto-sort, 2-row Edit Day items, Gemini hours fix.**

- **Date dropdown removed** from smart modal when opened from a specific day — shows fixed date label + hidden input instead of a full dropdown.
- **+Add Item in Edit Day modal** now opens the full smart modal (Gemini lookup + email paste) instead of adding a blank inline row.
- **Smart modal refreshes Edit Day list** after save: when `_saveAgendaEvent` saves to `agendaItemOverrides[date]` and the Edit Day modal is open for the same date, it refreshes `window._editDayItems` and re-renders the list.
- **Email paste → auto-fill**: new collapsible "📧 Auto-fill from confirmation email" section in smart modal. User pastes email text, clicks "Extract Info with Gemini" — Gemini returns NAME, ADDRESS, PHONE, HOURS, DATE, START_TIME, END_TIME and fills all form fields.
- **Escape closes all modals**: added `add-agenda-event-modal`, `edit-day-agenda-modal`, `full-sched-editor`, `plan-day-modal`, `stop-days-overlay` to the global Escape handler. Smart modal also attaches its own `_aaeEscHandler` on open.
- **Auto-sort chronologically**: `_saveAgendaEvent` sorts items by `time` before writing to `agendaItemOverrides`. `_saveEditDayAgenda` also sorts before saving.
- **Edit Day item rows redesigned**: 2-row layout per item — Row 1: arrows | emoji | title | ✕. Row 2 (indented): Start [time] End [time]. Prevents time inputs from falling off screen edge. Items now also store/edit `endTime`.
- **Gemini hours lookup fixed**: prompt previously said `"Check website"` as a fallback, which was then filtered out. Changed fallback to `"Not found"` and added explicit instruction "Do not say 'Check website' — give your best answer from training data."

### Session 19 (fifty-third context) — 2026-03-07

**Arrive date now editable in single-stop date editor.**

- **`_editStopDays`**: Arrive row is now an editable `<input type="date">` for any stop that has a prior stop. First stop still shows arrival as read-only (trip start). Helper note explains "Changing this also adjusts the prior stop's departure".
- **`_sdeArrChanged()`**: New handler — when arrive date changes, slides depart forward/backward to preserve the same number of nights, updates depart `min`, keeps `_sdeArrMs` in sync.
- **`_sdeUpdateNights()`**: Now reads from `sde-arr-date` input if present, falling back to `_sdeOrigArrMs` if arrive is read-only.
- **`_saveStopDays()`**: If arrive date changed, computes the delta (days) and applies it to the **previous stop's** `phaseExtraDays`. This shifts the arrival of the current stop without breaking the cascade (all subsequent stops shift the same amount). Current stop's nights = (dep − new_arr) stored normally.
- Modal now auto-focuses the arrive input (if editable).

### Session 19 (fifty-second context) — 2026-03-07

**Restaurant interactivity, openPlaceInfo/openPlanPicker aiRestaurants fallback, confirmPlan encoding fix, Agenda "Add to Day Schedule" default checked.**

- **`loadStopRestaurants` refactor**: Now stores each parsed restaurant into `appState.aiRestaurants[stopId][]` so other functions can access them. Each card now has `onclick="openPlaceInfo('r', stopId, ri)"` and a green `+ Plan` button with `onclick="openPlanPicker(stopId, 'r', ri)"`. All stopId values HTML-escaped via `.replace(/"/g,'&quot;')`.
- **`openPlaceInfo` fallback**: Now falls back to `appState.aiRestaurants[stopId][idx]` when `stop.restaurants[idx]` is undefined. This makes Gemini-fetched restaurants clickable and openable in the place info modal.
- **`openPlanPicker` fallback**: Same aiRestaurants fallback added for the restaurant path. Item name shown in modal title correctly even for Gemini-fetched restaurants.
- **`confirmPlan` onclick encoding**: Raw `stopId` in `openPlanPicker`'s generated HTML was unescaped (another instance of the master double-quote bug). Fixed with `JSON.stringify(stopId).replace(/"/g,'&quot;')`.
- **Stop detail "undefined" guard**: `stop.description` directly concatenated without null check (line ~11806). Added `if (stop.description)` guard.
- **Attraction search broadened**: Filter previously only checked `name`, `type`, `desc`. Changed to search all string fields via `Object.keys(it).some(k => typeof v === 'string' && v.includes(q))`. Fixes "honky tonk" and similar searches returning no results.
- **Agenda "Add to Day Schedule" default checked**: The `📋 Add to Day Schedule (reorderable)` checkbox now defaults to `checked`. Previously it was unchecked, causing users to miss it and have events land only in the pinned `agendaEvents` section (bottom of day) instead of the reorderable main schedule.

### Session 19 (fifty-first context) — 2026-03-07

**Critical root-cause fix: ALL blue phase bar buttons broken for string-ID stops. Rich Gemini event → schedule integration. Comprehensive regression test suite.**

- **ROOT CAUSE FIX — HTML attribute double-quote escaping (`_sidAttr`)**: `JSON.stringify("nashville-tn")` returns `"nashville-tn"` WITH outer double-quotes. When injected directly into `onclick="removePhaseDay("nashville-tn")"`, the HTML parser terminated the attribute at the 2nd `"` — the JS was truncated and every click produced `SyntaxError: Unexpected end of input`. Only string-ID stops were affected (nashville-tn, dallas-tx, winnemucca, etc.); numeric IDs were fine. Fix: added `var _sidAttr = _sid.replace(/"/g, '&quot;')` in `phaseHeaderHtml()` and replaced all 12 onclick usages of `_sid` with `_sidAttr`. Browser decodes `&quot;` → `"` before JS runs, so the call executes correctly. Also added `_pStopAttr` for the edit city name call.
- **All 5 remaining `openBookingModal` call sites fixed**: Dashboard sleep button, first-stop sleep button, day detail modal booking card, day detail modal booking button, and planner next-card booking chip — all were missing `.replace(/"/g,'&quot;')`. Now consistently HTML-safe for string stop IDs.
- **Escape key closes booking modal**: Added `_bcEscHandler` keydown listener attached when `openBookingModal()` is called; auto-removes itself when modal closes.
- **Waypoint section buttons fixed**: Removed leftover `event.stopPropagation()` and fixed `_sid` → `_sidAttr` in `toggleWaypointOverride` and `removeStopFromTrip` buttons in the waypoint section of `phaseHeaderHtml`.
- **Rich Gemini event → main schedule ("Titanic feature")**: In `showAddAgendaEventModal`, added "📋 Add to Day Schedule (reorderable)" checkbox toggle for new events. When checked, `_saveAgendaEvent` writes to `appState.agendaItemOverrides[date]` instead of `agendaEvents`. Builds default day items first (via `_buildDayItems`) then appends the rich item, so the full day schedule is preserved. Item stored with `{id, time, icon, title, subtitle, address, phone, hours, url, notes}`.
- **Override item renderer in `renderPlannerAgenda` updated**: Shows `address`, `phone`, `hours`, `url` as sub-rows when present on an override item.
- **`_refreshEditDayItemsList` updated**: Shows rich fields (address, phone, hours, url) as a read-only sub-row below each item in the Edit Day bottom sheet.
- **NEW `test.html`**: Comprehensive standalone regression test suite (no external dependencies, works offline). 23+ automated tests across 5 sections: (1) TRIP_DATA static validation, (2) effective date computation simulation (mirrors `_schPhaseOffset` algorithm), (3) date logic checks (no duplicates, consecutive diffs, drive day sequences), (4) localStorage/appState live reads, (5) manual UI smoke test checklist. TRIP_DAYS and TRIP_STOPS inlined directly from index.html.

### Session 19 (fiftieth context) — 2026-03-07

**Bug fixes + Day Planner agenda auto-collapse and full item editing.**

- **UTC date bug** (4 locations): `toISOString().slice(0,10)` returns UTC date, wrong for US timezones at night. Fixed in `renderDashboard`, `renderPlannerAgenda`, `renderCalendar`, and history log label — all now use `getFullYear()/getMonth()/getDate()`.
- **"undefined Nashville, TN" on dashboard**: `curStop.emoji` was undefined for stops without emoji field. Fixed with null guard.
- **"nts" → "nights"** in hotel booking widget on blue phase bar: `totalNights + 'nt'` → `totalNights + ' night' + (totalNights !== 1 ? 's' : '')`.
- **Phase bar buttons not working**: Outer div had `onclick="_editStopDays(...)"` which competed with inner button clicks. Fixed by removing onclick from outer div + removing all `event.stopPropagation()` calls from inner buttons.
- **"ideal: 1 day" badge moved** from blue phase header to Area Info modal. Added `aim-ideal-badge` span in modal; `openAreaInfo()` and `loadStopMinVisit` now populate it. Removed IIFE from `phaseHeaderHtml`.
- **Bookings: "nashville is not defined"** — `stop.id` used unquoted as JS identifier. Fixed with `JSON.stringify(stop.id)`.
- **Duplicate `renderBookings()` function**: Tools tab version overwrote Lists tab version. Renamed to `renderBookingsTools()`.
- **Day Planner not updating dates**: `_refreshAll()` only called `renderPlannerAgenda()` when `agenda-content` was visible. Fixed to always call it, plus calendar refresh.
- **Agenda auto-collapse past days**: New `_agCollapsed` module-level object. `_agInitCollapsed(todayStr, allDates)` sets all past days to collapsed on first render. State persists across re-renders.
- **Agenda day editing**: `showEditDayAgenda(dateStr)` bottom sheet with icon/time/title fields for each item; ▲▼ reorder, ✕ delete, + Add Item, Reset to default. Saves to `appState.agendaItemOverrides[dateStr]`.
- **renderPlannerAgenda changes**: Day card headers now collapsible with onclick toggle + ▾ arrow + ✏️ Edit button. Body div has `id="ag-day-body-{date}"`. Checks `agendaItemOverrides[date]` and renders from custom items when present.
- **New functions**: `_agCollapsed`, `_agInitCollapsed`, `_agToggleDay`, `_fmtTime24`, `_buildDayItems`, `showEditDayAgenda`, `_refreshEditDayItemsList`, `_moveEditDayItem`, `_removeEditDayItem`, `_addEditDayItem`, `_saveEditDayAgenda`, `_resetEditDayAgenda`.

### Session 19 (forty-eighth context) — 2026-03-05

**Auto-resolve sync conflicts by timestamp instead of showing banner.**
- `_showConflictBanner` replaced: no longer shows the red "Keep Mine / Load Saved" banner. Instead, auto-resolves silently — compares `_savedAt` timestamps and picks the newest version.
- Before resolving, snapshots of both sides are written to `rv_conflict_mine` and `rv_conflict_theirs` in localStorage as emergency backups (accessible in the Backup Restore panel if ever needed).
- Shows a brief toast instead of the blocking banner.
- `_resolveConflict` (the old manual path) also updated to re-render Stops, Navigator, and Agenda — which were previously missing from its render list.

### Session 19 (forty-seventh context) — 2026-03-05

**Add manual events to Agenda (Add Event modal with Gemini lookup).**
- `showAddAgendaEventModal(prefillDate, editId)` — bottom-sheet modal with place name, date selector, start/end time, URL, notes, and AI lookup button. Also handles edit mode.
- `_agendaLookupInfo()` — fires Gemini prompt to extract address, phone, hours from the place name + URL. Stores results in hidden fields and displays them in the modal before saving.
- `_saveAgendaEvent(editId)` — writes to `appState.agendaEvents[]`; each event: `{id, date, name, startTime, endTime, url, address, phone, hours, notes}`.
- `_deleteAgendaEvent(id)` — removes from `appState.agendaEvents` with confirm dialog.
- `renderPlannerAgenda`: now injects manual events per day (sorted by startTime, shown in purple) + a "📌 + Add event this day" button in each day footer.
- Agenda header: added "📅 + Add Event" orange button.

### Session 19 (forty-sixth context) — 2026-03-05

**Fix attractions button regression + missing days date display in phase headers.**
- `toggleStopAttractions`: removed `_stopAttractionsLoaded` guard — always calls `loadStopAttractions` when panel opens. `loadStopAttractions` already checks `_attractionsCache` first so no extra API calls. Fixes regression where `renderStops()` rebuilt DOM but flag stayed `true`, leaving panel empty on re-open.
- `_renderAttractionsBody`: fixed "No attractions match ''" shown on empty cache with no search. Now only shows no-match error when there's an active search term; otherwise shows spinner and triggers load.
- `phaseHeaderHtml`: fixed date range display (e.g. "Jun 15 – Jun 18") not reflecting +/- days changes. Added cumulative `phaseExtraDays` offset computation (same algorithm as `renderSchedule`'s `_schPhaseOffset`) so effective dates match what the schedule actually shows.

### Session 19 (forty-fifth context) — 2026-03-05

**fetchCampInfo: surface real Gemini API errors in the campground info modal.**

Previously `fetchCampInfo` showed only "Error loading info" with no details, hiding the actual cause (quota exceeded, invalid API key, rate limit, content block, etc.). Fixed:
- `.then(r => r.json())` now also captures HTTP status code via a wrapper object
- `if (!text)` block now inspects `data.error`, `data.promptFeedback.blockReason`, `data.candidates[0].finishReason`, falling back to stringifying the full response — same pattern as `fetchGeminiInfo`
- Error display now shows `(HTTP 429) ...` or similar with the actual message
- `.catch()` now shows the actual network error message
- Both error states include an inline **↺ Retry** button that re-calls `fetchCampInfo` directly

### Session 19 (forty-fourth context) — 2026-03-05

**Voice fixes, waypoint toggle, attractions overhaul + restaurants.**

- **Voice hands-free loop**: Fixed two silent killers: (1) `utt.onerror` no longer skips `_tgAfterSpeak()` on 'interrupted' — iOS fires this when speech is blocked from async context, which was permanently killing the full-duplex loop. (2) `askTripGenie` catch handler now calls `_tgAfterSpeak()` when in voice mode so API errors don't drop the loop.
- **ElevenLabs not being used**: Added one-time toast in `_tgSpeak` when no EL key is configured — "Using device voice — add ElevenLabs key in Trip Settings". Clears once key is set.
- **Waypoint override toggle**: Added `toggleWaypointOverride(stopId)` + `appState.waypointOverrides` object. Any regular stop can now be toggled to "drive-through waypoint" (pin on map, dashed header in Schedule) without removing it from trip. "📍 Make Waypoint" button added to each stop card expanded details row. "↩ Stop" button in waypoint header reverts it. Map marker builder and `phaseHeaderHtml` both check `appState.waypointOverrides`.
- **Attractions: Search box**: Added `<input id="attr-search-{stopId}">` in the green panel header. `_filterAttractions(stopId)` filters `_attractionsCache[stopId]` client-side — instant, no re-fetch.
- **Attractions: Load More**: Now fetches 12 attractions (was 6), shows first 6, shows "Load N more ↓" button. `_loadMoreAttractions` increments `_attractionsShown[stopId]` by 6. When all shown, offers "Load different attractions" to re-fetch a fresh batch.
- **Attractions: Fix reload**: Added `_attractionsCache` object. Refresh button clears cache + reloads. Opening panel re-uses cache if present (no extra API call). Error states now show inline "Retry" button.
- **Restaurants button**: Added "🍽️ Restaurants" button to stop card button row. Separate panel + `loadStopRestaurants(stopId)` asks Gemini for 8 family-friendly restaurants with type, price ($/$$/$$$), and one-line description.

### Session 19 (forty-third context) — 2026-03-05

**Booking confirmations now sync into Driving/Directions modal.**

- **`openDriveDirections`**: Looks up `appState.bookingConfirmations[stopId]`, prefers booking with address, falls back to one with just property name. Passes to `_showDirectionsModal`.
- **`_buildGoogleMapsUrl` / `_buildAppleMapsUrl`**: Accept optional `bookingAddress` — routes to actual property address instead of city lat/lng when available.
- **`_showDirectionsModal`**: Shows booking `propertyName` as destination header. New blue booking info strip shows address, conf #, check-in/out, site, hookups, cost, phone. Note shown if no address found in booking.

### Session 19 (forty-second context) — 2026-03-05

**Photo multi-select fix (iOS) + Schedule stop day editor.**

- **Photo upload iOS multi-select still broken**: Root cause was the gallery modal's `overflow:hidden` silently dropping the `change` event for multi-file selection on iOS Safari. Fix: replaced all three "Add Photos" label+input pairs with `_openGalleryFilePicker()`, which creates a fresh `<input type="file" multiple>` each call, appends it directly to `document.body` (outside any clipping container), `.click()`s it in the user-gesture call stack, listens for both `change` and `input` events with a `_handled` guard, then removes the input after 2 s.

- **Schedule stop day editor**: Tap any blue phase header bar in Schedule to open a popover with a large number input + ±1 steppers to set nights directly. The `− X nts +` widget's count is also directly tappable. On save, computes `phaseExtraDays[stopId] = newTotal - baseDays` and calls `_refreshAll()`. Added `_editStopDays()` and `_saveStopDays()` functions. Enter saves, Escape/backdrop closes.

### Session 19 (forty-first context) — 2026-03-05

**Photo upload fixes + storage hardening.**

- **Gallery photo upload broken on iOS (`display:none` → proper hidden input)**: All three gallery file inputs (`gallery-upload-input` in static HTML, `gallery-tab-upload`, `gallery-tab-upload-empty` in dynamically rendered gallery tab) used `style="display:none"`, which is unreliable on iOS Safari — the photo picker opens but the `change` event sometimes silently does not fire after the user taps the checkmark. Changed all three to `style="position:absolute;opacity:0;width:1px;height:1px;overflow:hidden;"`, matching the pattern already used by the working `j-photos` journal input.

- **New `_compressImage()` utility**: Added before `_galleryUpload`. Uses an off-screen canvas to resize images exceeding 1200px and re-encode as JPEG at 0.70 quality. Full-res iPhone photos (~5MB each) compress to ~100–200KB — a ~95% reduction. Videos and already-small images pass through unchanged.

- **`_galleryUpload` rewrite — compress & batch save**: The old implementation called `_addToPhotoPool()` (and therefore `saveState()` → `localStorage.setItem()`) for every single photo. With 34 photos, that's 34 growing writes, each larger than the last, eventually crashing with a silent `QuotaExceededError`. New flow: all files are read and compressed concurrently; a `newEntries[]` array accumulates results; state is saved exactly once when all files are done. Also removed the per-photo `saveState` from `_addToPhotoPool` for gallery-upload paths.

- **`saveState` — QuotaExceededError guard**: Wrapped `localStorage.setItem()` in try/catch. On `QuotaExceededError` (or `NS_ERROR_DOM_QUOTA_REACHED`, error code 22), shows a 5-second toast: "⚠️ Storage full — photos saved to session only. Try adding fewer photos at once or remove old ones." and returns early rather than throwing. All other errors re-throw normally.

- **Mapbox 403 / SyntaxError console errors**: The 403 errors from the Mapbox Directions API are a pre-existing issue (token URL allowlist or scope). The app correctly falls back to OSRM for routing. The `Uncaught SyntaxError: Unexpected end of input (at index.html:1:40)` is likely a secondary effect of a non-JSON Mapbox 403 response body — the existing `.catch()` handler on the fetch chain should suppress this; no code change made here. User should update their Mapbox token allowlist if they want Mapbox routing.

### Session 19 (fortieth context) — 2026-03-05

**Bug-fix session: 5 broken features repaired.**

- **Bug 1 — Map popup click-through (iOS ghost tap)**: Tapping the "✨ AI Area Overview" or "📅 View Plans" buttons inside a Leaflet map popup caused the modal to open and immediately close. Root cause: the same tap's touchend fired on the newly-appeared modal backdrop, triggering its `onclick="if(event.target===this)close…"` handler. Fix: wrapped `openMapStopInfo()` and `_jumpToStopPlans()` bodies in a 60 ms `setTimeout`, giving the tap event sequence time to complete before the modal renders.

- **Bug 2 — Long-press datetime editor hidden behind day-detail modal**: The `time-edit-overlay` had `z-index: 3500`, but `day-detail-modal` has `z-index: 9000`, so the editor rendered invisibly behind the orange modal. Fix: raised `time-edit-overlay` to `z-index: 9500`.

- **Bug 3 — Day planner stop cards appeared not to expand**: The cards did toggle their `hidden` class correctly, but expanded content fell below the visible viewport with no automatic scroll. Fix: added `card.scrollIntoView({ behavior:'smooth', block:'nearest' })` inside `toggleStop()` (50 ms delay to allow layout reflow).

- **Bug 4 — Trip stats always showed 5,705 miles**: `buildTripStatsTab` used `Math.max(calculated, CONFIG.totalMiles)` where `CONFIG.totalMiles = 5705`, creating a hard floor that always overrode any calculated value. Fix: removed `CONFIG.totalMiles` from `Math.max()`; it is now only used as a last-resort fallback when calculation returns 0.

- **Bug 5 — TripGenie voice mode silent on iOS**: `_tgUnlockAudio()` correctly unlocked the HTML5 `AudioContext` (for ElevenLabs), but never called `speechSynthesis.speak()`, leaving the Web Speech API locked in async contexts on iOS Safari. Fix: added a zero-volume, max-rate `speechSynthesis.speak(new SpeechSynthesisUtterance('\u200b'))` call inside `_tgUnlockAudio()` to prime the Web Speech API within the user-gesture window.

- **index.html line count**: grew from ~27,963 to ~27,989 lines (26 lines of comments + fix code added).

---

### Session 18 (thirty-ninth context) — 2026-03-04

- **`openDayDetail` defensive try/catch**: Wrapped the modal body in nested try/catch blocks so the modal ALWAYS opens even if `renderDayTimeBlocks` throws. The day detail panel was failing silently after a prior session's commit, most likely due to browser cache serving stale JS.

- **`renderDayTimeBlocks` gap-safe origin stop lookup**: The previous-stop loop used `TRIP_DAYS[d.day - 2]` (index-based), which returns the wrong entry for Paul's trip (day 33 gap means array index ≠ day number). Changed to a day-number scan using `getDay(_pn)`.

- **Login card responsive width**: Changed fixed `width:420px` to `width: min(420px, 92vw); max-width: 92vw; box-sizing: border-box` so the card fits on 375px iPhone SE screens without horizontal scroll.

- **Plan-nav no-wrap scrollable**: Changed `flex-wrap:wrap` to `flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none`. Added `min-width:90px/100px` to each nav button to prevent label truncation. Fixes "Suggestions" and other buttons falling to second line on phones.

- **Trip selector dropdown responsive**: Changed `min-width:250px` to `min-width:min(250px,90vw); max-width:90vw` so the dropdown can't overflow on small phones.

- **Mobile CSS — header label hiding**: Added `display:none !important` for `.hdr-mode-label`, `.hdr-help-label`, `.hdr-refresh-label` on `max-width:640px` to prevent header text from overflowing on phones. Also tightened `#header-right { gap: 4px }`.

- **Photo modal caption fix**: Added `#photo-modal-caption { max-width: 90vw !important }` in the 640px media query.

- **`_tgStartVoice` — iOS audio unlock**: Added `_tgUnlockAudio()` call synchronously inside `_tgStartVoice()` (the mic button tap handler). iOS Safari requires the AudioContext unlock to happen within the user-gesture call stack. Previously, `_tgUnlockAudio` was only called from the hands-free toggle, so tapping mic → AI speaks → nothing played on iOS. Also added `_tgVoiceMode = true` so voice is automatically on when mic is tapped.

- **`_tgSpeakWebSpeech` — 100ms delay after cancel()**: iOS Safari silently fails when `speechSynthesis.speak()` is called immediately after `cancel()`. Added `setTimeout(function(){ speak(utt); }, 100)` inside `_doSpeak`. This fixes the "it says Speaking but I hear nothing" bug on iPhones.

- **TripGenie voice response — always show text**: Replaced the hidden "See text" toggle button with always-visible formatted response text + a "🔊 Speaking aloud…" badge. Users can now read along and the UI is never blank after a voice reply.

- **TripGenie button micro-labels**: Added tiny text labels ("Photo", "Speak", "Auto") below the three TripGenie icon buttons using `flex-direction:column`. Removes confusion about what the wave/mic/camera buttons do.

- **Gallery cloud thumbnails**: `renderGalleryTab()` now shows `photoThumbs` (compressed 200px thumbnails synced via Supabase) from journal entries that have no local full-size photos. This lets other family members see photos uploaded by Paul (or vice versa). Cloud tiles show a ☁️ badge in the top-right corner and `opacity:.85` to visually distinguish them from local full-res photos.

- **j-photos file input scoped positioning**: Added `position:relative` to the parent `<div>` and `top:0;left:0` to the `position:absolute` file input, preventing the invisible input from leaking outside its container on some layouts.

### Session 18 (thirty-eighth context) — 2026-03-04

- **Full TRIP_DAYS index-based crash sweep**: Found 10 more places using `TRIP_DAYS[dayNum-1]` / `TRIP_DAYS[_ddmDayNum-1]` which all crash for day 48 (Paul's array has 47 entries, last day number is 48 due to day 33 gap). Fixed all to use `getDay(n)`:
  - `openDayDetail` — day planner cards now actually open
  - `openCampInfo` — campground info modal
  - `openDriveDirections` — drive directions modal
  - `openLocalMusic` — music picker
  - `openTimeEdit` — arrive/depart time editor
  - `confirmTimeEdit` — save edited time
  - `recordArrival` — We Arrived button
  - `recordDeparture` — We Left button
  - `_cycleToStayType` DDM refresh
  - `aiCleanupJournal` day context lookup

- **phaseHeaderHtml date guard**: Added `&& phaseDays[0].date` check before calling `formatDate()` to prevent "Invalid Date" text showing in blue bars when a day has no `.date` field. Dates will simply be omitted rather than showing garbage.

### Session 18 (thirty-seventh context) — 2026-03-04

- **getDaySleep/getDayDriver crash fix**: Both used index-based `TRIP_DAYS[day-1]` which crashes when Paul's custom days have a gap (day 33 missing, so array length 47 but last day number is 48). Fixed to use `getDay(day)` which searches by day number.

- **String stopId unquoted in onclick handlers**: Paul's trip uses string IDs like 'winchester'. These were injected directly into HTML onclick attributes without quoting, generating invalid JS like `_navFlyToStop(winchester,event)` → `ReferenceError`. Fixed by adding `var _sid = JSON.stringify(firstDay.stopId)` in `phaseHeaderHtml` and using it for all onclick injections. Also fixed `renderStopNavigator` nav item onclicks.

- **Missing tab render calls**: `switchTab` handler was not calling render functions for journal, school, dashboard, and suggestions tabs. Added missing calls so these tabs re-render fresh on every visit.

### Session 18 (thirty-sixth context) — 2026-03-04

- **Schedule tab not loading fix**: `_mainSeg('schedule')` was showing the div but never calling `renderSchedule()`, unlike every other segment (agenda, stops, stats, friends all call their render functions). Added `renderSchedule()` call. This also fixes day planner cards not being clickable (they weren't in the DOM because the schedule was never rendered).

### Session 18 (thirty-fifth context) — 2026-03-04

- **Journal cloud sync**: Fixed journal entries not appearing across devices. `saveJournal()` now also stores text-only entries in `appState.journalEntries` and calls `saveState()`, so they sync to Supabase via the existing cloud path. `loadJournal()` now merges any cloud entries missing from localStorage. Photos intentionally excluded (too large for cloud sync — stay device-local). Corrected misleading help tooltip that falsely claimed "Changes sync to the cloud immediately."

- **Previously uncommitted (from prior session)**:
  - Dates in blue phase header bars (phaseHeaderHtml): shows date range for each stop section
  - Via cities in drive day ribbons (_renderDriveSepA): supports `d.via` array for secondary city names
  - Via cities in explore day cards (renderSchedule): same `d.via` rendering in the day card view

### Session 18 (thirty-fourth context) — 2026-03-03

- **Spring Break removed**: Stripped all Spring Break references from the codebase. TRIP_DAYS Moab/Durango entries had `springBreak:true` → `false` and "🌟 SPRING BREAK — " stripped from titles. Removed: springBadge rendering, uBreak badge, spring break stat card in Road School, purple styling in schedule/school views, spring break special handling in school day toggle/expand, spring break label in Agenda. Desert Bistro description updated.

### Session 18 (thirty-third context) — 2026-03-03

- **Startup snapshot safety net**: Added `_startupSnapshot()` and `_startupSnapDone` flag. Called right before `loadFromCloud` in both family-mode auth paths (legacy + new). Always writes a local backup if trip has ≥2 stops; also fires `_saveCloudSnapshot('Startup')` async/non-blocking when authenticated. Zero risk: never blocks init, never overwrites anything. Now every device preserves its local state before cloud sync can clobber it.

### Session 18 (thirty-second context) — 2026-03-03

- **Snapshot Preview button**: Added `_toggleSnapPreview(id)` function and `_snapCache` global. Each snapshot card (both local device and cloud) now has a "▼ Preview" button that expands an inline stop list showing: trip name, date range, day count, and all stops numbered with city/state in a 2-column grid. Collapses back on second click. Lets user identify which snapshot to restore before committing.

### Session 18 (thirty-first context) — 2026-03-03

- **Cloud Snapshot system (full implementation)**:
  - `_saveCloudSnapshot(label)` — saves a new row to `trips` table with name starting with "📸"; also calls `_saveLocalBackup` first. Works signed-in or offline (local only).
  - `_pruneCloudSnapshots()` — keeps max 15 snapshots per user; deletes oldest beyond that.
  - `_restoreFromCloudSnapshot(snapId, safeLabel)` — saves current state as a new snapshot first, then restores the chosen version and re-inits the app.
  - `renderSnapshotsTab()` — async Tools sub-tab showing: 3 local backups with restore buttons, plus all cloud snapshots (timestamp, stop count, restore button). Auth-gated for cloud section.
  - `_startAutoSnapshot()` — interval timer (20 min) that fires `_saveCloudSnapshot('Auto')` if `appState._savedAt` is newer than `_snapLastSaved`.
  - Cross-tab sync: `storage` event listener refreshes `appState` from localStorage when another tab saves — prevents stale tab from overwriting newer data.
  - `_doLegacyInitAfterSbAuth` now calls `_startAutoSnapshot()` after sign-in.
  - `loadFromCloud` now ALWAYS saves a local backup before any cloud overwrite (not just on regression).
  - `_renderTripCards` filters out snapshot rows (names starting with "📸") from My Trips list.
  - New "📸 Snapshots" tab added to Tools nav.

### Session 18 (thirtieth context) — 2026-03-03

- **Friends route map — loads current Supabase schedule**: `_initGuestMode` Supabase fetch was only updating the local `stops` variable, not the global `TRIP_DAYS`/`TRIP_STOPS`. Helpers like `_guestShowWhereNow` use those globals, so they were using stale built-in defaults on devices that aren't Paul's. Fix: after Supabase fetch, now also sets `TRIP_STOPS`, `TRIP_DAYS`, and `CONFIG.startDate/endDate/totalDays` from `td.customTripData`.

- **Cloud sync data-loss safeguard**:
  - Added `_saveLocalBackup(state)` — keeps a rolling set of 3 timestamped snapshots (`rv_backup_1`/`2`/`3`) in localStorage, taken automatically before any cloud overwrite.
  - Added `_restoreFromBackup(slot)` — callable from console or Tools to restore backup 1/2/3 with confirmation and immediate cloud re-save.
  - `loadFromCloud` now does a data-regression check before silent overwrite: if the remote data has meaningfully fewer custom stops or days than the current local state (suggesting the remote is stale/reverted), it saves a local backup and shows the conflict-resolution banner instead of silently overwriting. This prevents the data-loss scenario where another device saves old data with a newer timestamp.

- **INCIDENT: Custom trip stops lost to cloud sync reversion**: Paul's post-Badlands homeward stops were lost when `loadFromCloud` silently loaded a stale cloud state. The remote `rv_state` had a newer `updated_at` timestamp but older trip data (fewer stops). Root cause: old data was saved to `rv_state` from a second device/tab, then loaded back. The new safeguard above prevents this in future. To rebuild lost stops, Paul must recall the homeward route and re-enter stops via the trip wizard.

### Session 18 (twenty-ninth context) — 2026-03-02

- **"Where are they now?" fix — correct destination on drive days**: The drive day branch was searching for the "next non-drive day" after today to determine the destination, which incorrectly skipped overnight-only stops (those with no explore days). Fixed: `entry.stopId` IS the destination for a drive day — look up that stop directly instead of scanning ahead. Winchester (an overnight-only stop) now shows correctly instead of jumping to Wytheville.

- **TripGenie voice mode fix — iOS microphone permission**: `openTripGenieVoice()` was wrapping `_tgToggleHandsFree()` in a 500ms `setTimeout`, which broke the iOS/Safari requirement that microphone permission must be requested synchronously within the user gesture call stack. Fixed: removed `setTimeout`, call `_tgToggleHandsFree()` directly.

- **ElevenLabs 401 — specific `convai_read` permission hint**: When the 401 response body has `status:"missing_permissions"`, the toast now shows: "API key missing permission. Go to ElevenLabs → Profile → API Keys → edit key → enable 'Conversational AI (Read)' scope."

### Session 18 (twenty-eighth context) — 2026-03-02

- **Driving Directions button in Drive Mode hero card**: Added `_ddBtn` variable in `_smRenderToday()`. On drive days, the blue hero card now shows a "Driving Directions" link at the bottom (map pin icon, frosted-white pill style) that opens Google Maps with the device's current location as start and the campground/hotel/first activity as destination. Destination priority: booking address → sleep stop name → first activity → stop city. Button only appears on drive days (`day.driveDay === true`); explore/rest day green card does NOT show it.

### Session 18 (twenty-seventh context) — 2026-03-02

- **CRITICAL BUG FIX — Planner tab floating over all other views**: `#tab-planner { display:flex !important }` in CSS was overriding `.tab-panel { display:none }` (ID specificity + `!important` beats class specificity). This caused the entire Planner tab (Schedule, Day Planner, all sub-views) to always be `display:flex` — floating on top of Dashboard and every other tab simultaneously. Fix: removed `display` from the base `#tab-planner` rule; added `#tab-planner.active { display:flex !important }` so flex layout only kicks in when the tab is actually selected.

- **`_labsTestCall()` function** (completes test mode feature): Reads the phone number from `labs-test-phone` and scenario from `labs-test-scenario` radio. Calls `_labsDirectCall` with a fake venue name, today as check-in/tomorrow as checkout, and "TEST CALL — no real booking" as special instructions. Shows status in `labs-test-status` div. On error, surfaces the error message in the status box.

- **`_labsSavePhoneBookingConfig` now saves test settings**: When Save Profile is clicked, also reads `labs-test-phone` and `labs-test-scenario` radio and persists them to `appState.labsPhoneBooking.testPhone` / `.testScenario` alongside the rest of the profile.

### Session 18 (twenty-sixth context) — 2026-03-02

- **"📞 Book via Agent" button on every Hotels & RV Parks card**: Each lodging card in `loadStopHotels` now has a blue "📞 Book via Agent" button. The Gemini prompt was updated to include a `PHONE:` field so phone numbers are parsed alongside name/type/price. Each card stores its data in `window._labsBookCards[]` (indexed by position) so the onclick can reference it safely. Phone number is shown inline next to the button.

- **Quick-book modal (`_labsQuickBookModal`, `_labsQuickBookConfirm`)**: Clicking "Book via Agent" opens a focused modal showing the campground name, an editable phone number field (pre-filled from Gemini if available), and check-in/check-out dates. A warning is shown if ElevenLabs credentials aren't configured yet. "Start Booking Call" calls `_labsDirectCall` directly.

- **Shared `_labsDirectCall(parkName, parkPhone, checkin, checkout, special)`**: Extracted common call-making logic so both the quick-book modal and the Labs form can trigger calls. Uses the same CC-handoff prompt. Requests browser notification permission before dialing.

- **Improved CC handoff agent prompt**: Updated in both `_labsStartCall` and `_labsDirectCall`. Now says: "I need to place you on a brief hold — Paul will call you right back within a few minutes to provide the card and finalize everything. Could I get the best direct number and a contact name for him to reach?" — then ends politely. Also added "always get a direct callback number before ending" instruction.

- **Browser notification alert (`_labsPollCallEnd`, `_labsNotifyCallBack`)**: After any call starts, `_labsPollCallEnd` polls the ElevenLabs conversation status API every 10 seconds (up to 15 min). When status is done/ended/completed, `_labsNotifyCallBack` fires: a 7-second in-app toast AND a browser `Notification` with `requireInteraction:true` (stays on screen until dismissed) showing the campground name and phone number. `_labsStartCall` success path also updated to use polling and improve its status message.

### Session 18 (twenty-fifth context) — 2026-03-02

- **Removed "Reset Days" drift banner from Schedule**: The inline warning banner (with "Reset Days" button) that appeared at the top of the Schedule view when `phaseExtraDays` had accumulated a non-zero total has been removed entirely. The user confirmed they don't want to use it. Removed the `_schPausesEarly`/`_totalPauseNightsEarly` hoisted block and the entire `if (_sched_totalExtra !== 0)` HTML block from `renderSchedule()`.

- **Day Planner dates now sync with Schedule (source of truth)**: `renderStops()` was displaying raw `firstDay.date`/`lastDay.date` from TRIP_DAYS without applying `phaseExtraDays` cascade offsets or pause block offsets — causing dates to diverge from the Schedule. Fix: Added pre-computation of `_rsPhaseOffset{}` (mirrors `_schPhaseOffset` from `renderSchedule`) and a `_rsPauseNightsBefore(rawDate)` helper that sums pause block nights whose `startDate <= rawDate`. New `_rsEffDate(rawDate, stopId)` applies both offsets to get the effective date. New `_rsDateStr(dt)` formats a Date using local time components (avoiding UTC midnight shift from `toISOString()`). Both `dateRange` and `_dateShort` now use `_rsFirstEff`/`_rsLastEff` — matching what Schedule displays exactly.

### Session 18 (twenty-fourth context) — 2026-03-02

- **Planner sub-nav gap fixed**: Restructured `#tab-planner` to use a flex column layout so the `.plan-nav` strip sits OUTSIDE the scrollable content area. Previously it was `position:sticky;top:0` inside a scrollable `tab-panel`, causing content to bleed above it in the gap. Fix: added `#tab-planner { overflow:hidden; padding:0; display:flex; flex-direction:column }`, changed `.plan-nav` to `flex-shrink:0` static (no sticky), wrapped all 5 content divs in a new `<div id="planner-body">` with `flex:1; overflow-y:auto; padding:var(--sp-6)`. Mobile override: `#planner-body { padding:12px }`.

- **"Invalid Date" bug in schedule drift banner**: The banner computed `_sched_effEndMs` using `_totalPauseNights` before that variable was defined (it was defined 23 lines later). Fixed by hoisting the pause-nights calculation to before the banner block. New vars `_schPausesEarly` and `_totalPauseNightsEarly` computed first; the banner uses `_totalPauseNightsEarly`.

- **Friends view stop names — state + capitalization**: `_renderFriendSuggestionsFamily` was manually constructing stop labels with raw `stop.state` field, skipping the `_sn()` / `_inferStopState()` / `_normState()` pipeline. Result: missing states (e.g. just "Memphis"), wrong casing (e.g. "Austin, Tx"). Fixed: when `stopObj` exists, now uses `_sn(stopObj)` directly. When no `stopObj` (database submission), normalises stored `stop_name` by splitting on comma, uppercasing state via `_normState()`, and looking up bare city names via `_KNOWN_STOP_STATES`.

- **Dashboard "days left" sync**: `daysLeft` was computed as calendar days from today to `CONFIG.endDate`. Since `CONFIG.endDate` is set dynamically to `TRIP_DAYS[last].date` (extended by phaseExtraDays), it could show e.g. 58 days. Fixed: `daysLeft = Math.max(0, _gVisibleDayCount - dayNum)` — counts remaining trip days from the visible schedule, not calendar arithmetic. Moved `_gVisibleDayCount` computation before `daysLeft` to ensure it's ready.

- **Mobile TripGenie icon → voice mode**: Added `openTripGenieVoice()` function. On mobile (`window.innerWidth <= 640`) it opens TripGenie then fires `_tgToggleHandsFree()` after a 500ms delay, starting the hands-free voice loop automatically. On desktop it just opens normally. Changed `#tg-btn` onclick from `openTripGenie()` to `openTripGenieVoice()`.

### Session 18 (twenty-third context) — 2026-03-02

- **Schedule drift warning banner (auto-sync)**: `renderSchedule()` now computes the sum of all `phaseExtraDays` values at render time. If non-zero, a small inline banner appears at the top of the Schedule content showing "Schedule ends [date] (+N days vs. base)" with a one-click **Reset Days** button. The button calls `_resetAllExtraDaysQuiet()` which clears `appState.phaseExtraDays`, saves, and calls `_refreshAll()` — updating Schedule, Agenda, Day Planner, Route Map, and Dashboard simultaneously. No confirm dialog on the banner reset (it's clearly labeled and reversible). The existing `_resetAllExtraDays()` in Health Check keeps its confirm dialog for safety. This keeps all views in sync without needing to visit Tools → Health Check.

### Session 18 (twenty-second context) — 2026-03-02

- **Attractions panel stays open when clicking "+ Plan"**: Root cause was `planStopEvent` calling `renderStops()` (full DOM rebuild) whenever any plan button was clicked, then trying to restore panel state via `toggleStopAttractions()` (which is a toggle — could accidentally close if called on already-visible panel, or show spinner from fresh API call). Fix: if any attraction panel is currently open, skip the `renderStops()` call entirely — the button state was already updated in-place (lines 16401-16414). Also added `event.stopPropagation()` to the `+ Plan` button inside `loadStopAttractions` to prevent accidental propagation.

- **Health Check — Schedule Day Adjustments diagnostic**: Added a new "Schedule Day Adjustments" section to `renderHealthCheckTab()`. Shows: total net extra days, effective trip end date (base + adjustments), per-stop breakdown of non-zero `phaseExtraDays` with individual "Reset to 0" buttons, and a "Reset ALL Day Adjustments" button with confirmation. Two new functions: `_resetStopExtraDays(stopId)` and `_resetAllExtraDays()`. This gives Paul a way to see/fix why the Day Planner was showing April 26 instead of ~April 17 (accumulated phaseExtraDays).

- **Mobile planner nav — horizontal scroll strip**: On mobile (≤640px), the 5 sub-nav buttons (Schedule / Agenda / Day Planner / Trip Stats / Suggestions) now form a horizontally scrollable tab strip instead of wrapping to multiple lines. Changes: added `class="plan-nav"` to container div and `class="plan-nav-btn"` to each button; restructured button content into `<span class="pnb-icon">` + `<span class="pnb-label">` for icon-above-label stacking; added CSS for `.plan-nav` (no-wrap, overflow-x:auto, scrollbar hidden) and `.plan-nav-btn` (flex column, 70px min-width, icon 1.15rem, label centered). Active tab shown by orange bottom border + `active-seg` class (toggled by updated `_mainSeg` `_on`/`_off`/`_onP` functions). Desktop appearance unchanged (media query only at ≤640px).

### Session 18 (twenty-first context) — 2026-03-02

- **Drive separator × button moves to top-right on mobile**: Added `.ds-del` CSS class to the delete button in `_renderDriveSepA()`. On `@media(max-width:640px)`: `.ds-pill { position:relative }`, `.ds-del { position:absolute; top:8px; right:10px }`, `.ds-r1 { padding-right:36px }` — button floats to top-right corner without occupying Row 3 space.

- **Phase header weather pill moved to city name row**: `_wxHtml` moved from the `ph-ctrls` right-controls cluster to the city name row (inline with `_displayPhase`). Weather now shows right next to the destination name on both mobile and desktop, instead of appearing in the second controls row on mobile.

- **Ideal stay badge hidden on mobile**: Added `class="ph-ideal-badge"` to both the loading span and the loaded `⭐ ideal: X` span. `.ph-ideal-badge { display:none !important }` in the `@media(max-width:640px)` block hides it on mobile (planning is desktop-only).

- **"Day X" pill hidden on mobile**: Added `class="sc-day-pill"` to the day-number pill below the date badge. `.sc-day-pill { display:none }` hides it on mobile, saving vertical space.

- **Date format fixed — month always first**: Changed `dMDay` from `toLocaleDateString('en-US', { month:'short', day:'numeric' })` (locale-dependent order) to explicit `month + '\u00a0' + day` construction. Now always renders "Mar 2", never "2 Mar" regardless of device locale.

- **Mockup annotation labels hidden**: `.label` spans in `mockup_schedule_mobile.html` (▼ Phase Header, ▼ Day Cards, etc.) were design-time annotations now hidden via `display:none`.

### Session 18 (twentieth context) — 2026-03-02

- **Mobile schedule redesign — drive separators + phase headers**: Added new CSS classes (`.ds-wrap`, `.ds-pill`, `.ds-r1/.r2/.r3`, `.ph-ctrls`, `.ph-music-btn`, `.ph-sep-div`, `.ph-area-lbl`) and restructured `_renderDriveSepA`, `_renderVirtualDriveSep`, and `phaseHeaderHtml` to use them. On mobile (≤640px): dashed flanking lines hidden, drive pill becomes full-width stacked card (3 rows: route title, meta, chips), phase header controls wrap to second row with music/divider hidden and Area Info icon-only. Desktop unchanged.

- **Friends view — name field moved to top of page**: Previously the First Name / Last Name fields were duplicated on every stop card. Now a single "Who are you? 👋" banner appears once at the top of `_renderGuestStopsList`, with `id="guest-fn"` and `id="guest-ln"`. Individual stop cards now show only the recommendation textarea and submit button. `_guestSubmit()` reads from `#guest-fn`/`#guest-ln` instead of `#gf-fn-{stopId}` / `#gf-ln-{stopId}`. On success, only the textarea is cleared — name fields persist for subsequent stop submissions. Validation now scrolls back to the name banner if first name is missing.

### Session 18 (nineteenth context) — 2026-03-02

- **Route Map date fix — pause days now included**: `renderStopNavigator` was missing `_schCumulativeNights` (pause day accumulation) while `renderSchedule` included it — causing dates to diverge when pause blocks exist. Fixed: Added `_navPauseOffset{}` pre-computation after `_navStopOffset`. Iterates `_navAllSeenIds` in order; for each stop, computes the preliminary first date (raw + phaseExtraDays), then sums all `appState.pauseDays` nights where `pd.startDate < prelimDate`. This offset is added to `_cumOff` alongside `_navStopOffset`. Now `renderStopNavigator` and `renderSchedule` both compute effective dates as: raw date + phaseExtraDays cascade + pause nights before this stop.

- **Trip Stats mileage — full-route Haversine floor**: `displayMiles` was showing 3,075 (the sum of per-leg explicit miles from custom trip TRIP_DAYS) because `CONFIG.totalMiles` was also 3,075 (set when custom trip was loaded). Fixed: Added a full-route Haversine computation for ALL drive legs (not just untracked ones) using `TRIP_STOPS` coordinates. `displayMiles = Math.max(explicit+untracked estimate, full-route Haversine, CONFIG floor)`. This catches cases where per-leg explicit miles are underestimated — the Haversine total for a cross-US trip provides a better minimum.

- **View Plans sticky header overlap**: When clicking "View Plans" from the Route Map, `_jumpToStopPlans()` would `scrollIntoView` the stop card to `block:'start'`, but the sticky planner nav bar (~60px) covered the card's location header. Fixed: added `el.style.scrollMarginTop = '64px'` before calling `scrollIntoView`, so the scroll target accounts for the sticky nav height and the card header is fully visible.

- **Friends view city name consistency**: Some stops showed "Memphis" (no state) while others showed "Dallas, TX" (state embedded in name). Root cause: stop objects without `state` property and without state in name showed state-less labels. Fixed: In `_renderFriendSuggestionsFamily`, if `stopObj.name` has no comma and no `stopObj.state`, the code now tries `suggs[0].stop_name` (from the friend's form submission, which captures the full "City, ST" label). State suffix is only appended if the final name doesn't already contain a comma.

### Session 18 (eighteenth context) — 2026-03-02

- **Explore This Idea modal — direct "+ Plan It!" button**: `_exploreIdea(stopLabel, suggestionText, stopId)` now accepts `stopId` as 3rd param (passed from suggestions rendering via `safeKey`). Modal buttons changed: green **"+ Plan It!"** calls new `_exploreIdeaPlanDirect(stopId, suggName)` (mirrors `planStopEvent` behavior — adds to `appState.customActivities`, `appState.plannedEvents`, `appState.planned`, triggers `renderStops` with expanded-card preservation); grey **"Discuss"** keeps old "Add to Change Plan" behavior; **"Dismiss"** unchanged.

- **Mobile hamburger**: On mobile (≤640px) the header was too crowded — Driving/Planning toggle fell off screen. Fixed: `#ham-btn` now shows on mobile; `#plan-trip-btn`, `#change-plan-btn`, `#trip-selector-wrap`, `#help-btn`, `#refresh-btn`, `#debug-console-btn` all hidden on mobile. `.hdr-mode-label` text hidden (icon-only). Hamburger menu gains: trip-name display header, "Switch Trip" button (`_hamSwitchTrip()`), and "Refresh" button. `_hamToggle()` now populates `#ham-trip-name` with current trip selector label.

- **Drive Mode — heading-to + tonight cards combined**: `nextCard` (Heading To / Today's Stop) now embeds a "Tonight:" row showing sleep name + sleepType and the booking confirmation chip. Booking chip computation moved before `nextCard` definition. Standalone `heroHtml` ("Tonight" section) removed from `el.innerHTML` assembly — booking info is now above the fold in the main card.

- **Drive Mode — day count fix**: Schedule screen header used `days.length` which showed user's saved state count (e.g. 58). Now uses `days[days.length-1].day` — the last entry's day number, matching how the Planner → Schedule tab identifies total days. Static data day 46 is the last day.

- **Drive Mode — large waveform TripGenie button**: Replaced flat banner button with a centered 100px circular orb + 3 expanding pulse rings + 7 animated waveform bars inside. CSS: `dm-genie-orb`, `dm-genie-ring-1/2/3` (pulse animation), `dm-wave-bar` (staggered height animation). Orb has radial-gradient purple-to-blue. Label below: "✨ Ask TripGenie" and hint text.

- **Labs tab (Tools → 🧪 Labs)**: Added experimental "AI Phone Booking Agent" feature powered by ElevenLabs Conversational AI. Includes: step-by-step ElevenLabs setup guide (create agent, add phone number, get IDs), RV profile form (RV name/length/amps, adults/kids/pets/extra car, home address, phone), stop selector (auto-fills dates + campground name), per-call form (park name, park phone, check-in/out, special requests), `_labsSavePhoneBookingConfig()`, `_labsStopChanged()`, `_labsStartCall()` (calls ElevenLabs outbound API with dynamic system prompt override). Credit card warning: agent cannot provide CC info. LABS banner with "Testing Only" label.

### Session 18 (seventeenth context) — 2026-03-02

- **Planned activities rendering (root fix)**: Previous fix used `appState.planned['p_STOPID_a_IDX']` index-based lookup which was unreliable. The real source of truth is `appState.plannedEvents[planKey]`. Fixed all three views:
  1. **Day Planner card** (`_plannedCustom4Stop` filter): now checks `appState.plannedEvents[ca._planKey]`
  2. **Agenda** (`renderPlannerAgenda`): now checks `appState.plannedEvents[ca._planKey]`
  3. **DDM** (`getPlannedForStop`): now checks `appState.plannedEvents[ca._planKey]`

- **Empty state text updates**:
  - Activities: "No activities listed yet" → "No activities planned yet"
  - Restaurants: "No restaurants listed yet" → "No restaurants planned yet"
  - Sleep: "No sleep options listed yet" → "No lodging planned yet"

- **View Plans button opens card expanded**: `_jumpToStopPlans(stopId)` now removes `hidden` class from `stop-detail-STOPID` and updates chevron to `▲` after switching to the Day Planner tab.

- **Stop ordering fix**: `renderStops` now sorts `_rsVisible` chronologically by first TRIP_DAYS `day` number before rendering — fixes stops appearing out of order when added via trip wizard (e.g. Winnemucca NV appearing at the bottom instead of its correct Apr 8 position).

- **Stop badge counter fix**: Badge now shows `(i+1) of _rsVisible.length` instead of `TRIP_STOPS.length` — was showing wrong total (44 instead of actual visible stop count).

- **Trip Stats miles fix**: `displayMiles` now uses `Math.max(..., CONFIG.totalMiles || 0)` as a floor — consistent with `renderStopNavigator`. Prevents Haversine estimate from showing a lower number than the known route total.

### Session 18 (sixteenth context) — 2026-03-02

- **Booking confirmation AI extraction fix**: Root cause was Netlify proxy `MAX_BODY_BYTES = 200 KB` — booking photos/PDFs encoded as base64 easily exceeded this limit, causing 413 responses that showed as generic errors. Fixed:
  1. `netlify/functions/gemini.js`: `MAX_BODY_BYTES` increased from 200 KB → 8 MB.
  2. `_bcHandleFile`: Added canvas-based image compression (max 1200px, JPEG 82%) before sending image files, keeping payload well under limit and improving response quality.
  3. `_bcExtract`: Improved error handling — catches 413 "file too large" specifically, also handles `data.error` from Gemini API response.

- **Booking edit feature**: Added ✏️ edit button (pencil, blue) alongside existing 🗑️ delete button on each booking card (modal-only). Workflow: tap ✏️ → opens same review/edit form pre-filled with saved data → "Update Booking" button updates record in place. Implementation: `_bcEditId` state var, `_bcEditBooking(bcId, stopId)`, `_bcCancelEdit()`, modified `_bcSave()` to handle update-vs-create based on `_bcEditId`.

### Session 18 (fifteenth context) — 2026-03-02

- **Planned activities three-way sync fix**: When a user taps "+ Plan" on an attraction in the Day Planner Attractions panel, planned items now appear in all three places:
  1. **Day Planner card (Activities section)**: `planStopEvent` now preserves which stop cards are expanded (and which Attractions panels are open) before calling `renderStops()`, then re-opens them after rebuild. Previously the rebuild collapsed all cards.
  2. **DDM (orange header day modal)**: `getPlannedForStop` custom-activities loop changed to include planned custom activities on ANY day of the stop (not just the first day). Custom activities aren't yet day-specific, so this is correct behavior.
  3. **Agenda view**: `renderPlannerAgenda()` now reads `appState.customActivities[stopId]` and `appState.planned` to include AI-planned items in the `_activities` array alongside static `d.activities`.

- **Gallery duplicate photos fix**: `renderGalleryTab` was adding photoPool items WITH `source:'journal'` to `allPhotos`, causing journal photos to appear twice (once from `_journalEntries` loop, once from photoPool loop). Now skips pool photos where `source === 'journal'` since they're already shown.

### Session 18 (fourteenth context) — 2026-03-02

- **Route map left-rail: dates removed**: `metaHtml` in `renderStopNavigator` now shows only nights count (e.g. "2n") instead of date ranges. Date ranges were unreliable when phaseExtraDays offsets were complex; the Agenda view is the authoritative date reference.

- **Map popup "View Plans" button**: Added a second button "📅 View Plans" to the Leaflet map popup (below "AI Area Overview"). Calls `_jumpToStopPlans(stopId)` which closes the popup, switches to the Planner tab, activates the Schedule segment, then scrolls to the first schedule row for that stop using a multi-selector strategy.

- **Left-rail stop click zooms map**: `nav-stop-item` divs now have an `onclick="_navFlyToStop(stopId,event)"` handler. Uses `map.flyTo([lat,lng], max(currentZoom,9))` for a smooth animated pan. Ignores clicks on buttons/icons inside the row and during drag operations (guarded by `_navDragging` flag set in `_navDragStart`/reset in `_navDragEnd`).

### Session 18 (fourteenth context) — 2026-03-02

- **Friends view loads current stops**: `_initGuestMode` now bootstraps `TRIP_STOPS`/`TRIP_DAYS` from `appState.customTripData` before doing anything else — previously guest mode skipped `initApp()` so `TRIP_STOPS` was always stale built-in data. New stops added via wizard now appear correctly.

- **Route map dates match schedule (root cause fixed)**: `renderStopNavigator`'s cumulative `phaseExtraDays` offset was computed only over visible (non-removed) stops. Removed stops still have `phaseExtraDays` that must cascade to subsequent stops (same as `renderSchedule`). Fixed: offset now iterates ALL unique stop IDs in TRIP_DAYS order (including removed ones) before rendering the visible list — exactly matching `renderSchedule`'s `_schPhaseOffset` logic. This eliminated the ~5-day date discrepancy between schedule and route map.

### Session 18 (thirteenth context) — 2026-03-02

- **Departure date+time modal (complete)**: Rewrote `openDriveTimeModal(dayNum, originStopId, destStopId, dateMs)` — title now shows "City A → City B" format. Added departure DATE row with ← / → shift buttons (calls `_shiftDepartureDate` which delegates to `addPhaseDay`/`removePhaseDay`). Added `_shiftDepartureDate(stopId, direction)` function. Updated `_renderDriveSepA` and `_renderVirtualDriveSep` departure chip `onclick` to pass origin/dest stop IDs and current effective date.

- **Health check miles never lowers fix**: Health check's "12b. Total miles sanity check" previously always overwrote `CONFIG.totalMiles` with the computed drive-day sum even when it was LOWER (e.g., some legs have 0 miles). Fixed: only triggers a "fix" and only updates stored totalMiles when `_computedMiles > _storedMiles`. If computed < stored, shows an informational note instead. Also fixed the "Always sync totalMiles" in the APPLY FIXES section to only update upward.

- **Agenda date discrepancy fix (11-day gap)**: `renderPlannerAgenda()` was computing effective dates using only pause offsets (`_agCN`) but not `phaseExtraDays` cascade offsets. Added: (a) skip logic for hidden explore days (mirrors `renderSchedule`'s `skipDayNums`); (b) pre-computation of `_agPhaseOffset{}` (cumulative `phaseExtraDays` per stop in TRIP_DAYS order, same as `_schPhaseOffset`); (c) effective date now = `d.date + (_agCN + _agPhOff) * 86400000`.

- **Postcard bottom panel black fix**: Switched outer postcard root from `position:relative` with absolutely-positioned panels (`top:706px`) to a flex column layout. This ensures html2canvas captures all 1406px reliably regardless of viewport height. Also added explicit `background-color:#f9f8f4` to message column and address column inner divs.

- **Gallery upload fix**: Added "📤 Add Photos" upload button directly to the gallery TAB (was only in the gallery modal before). Added `renderGalleryTab()` call in `_galleryUploadDone` so the gallery tab refreshes after upload.

- **Friends view fixes**: (a) `_initGuestMode` now filters out `removedStops` so deleted stops (e.g., OKC, KC) don't appear in the friends suggestion form. Applies to both local (`appState.removedStops`) and Supabase paths (`td.removedStops`). (b) `_renderGuestStopsList` now shows a numbered badge (idx+1) on each stop card header, matching the map marker numbers.

### Session 18 (twelfth context) — 2026-03-02
- **AI attractions → Activities section + day modal (full fix)**: Root cause was two completely separate plan stores — `appState.plannedEvents` (AI) vs `appState.planned` (static). Fixed by: (a) `planStopEvent()` now writes AI attractions to `appState.customActivities[stopId]` and bridges to `appState.planned['p_stopId_a_combinedIdx']` so `getPlannedForStop()` picks them up; (b) `getPlannedForStop()` returns `customActivities: []` in result and scans the combined indices; (c) `renderDayTimeBlocks()` now includes `customActivities` in the `acts[]` array used to build day schedule — handles both drive day and explore day slots; (d) "Your Plan" banner in schedule cards also shows custom activities with ⭐ icon; (e) `tbbAiBtn` calls guarded with `idx != null` check so custom activities (idx=null) don't error.
- **Postcard two-stacked portrait layout**: Redesigned from side-by-side landscape (1200×800) to two vertically stacked panels (1200×1406 total): TOP = full-bleed photo collage with location overlay (1200×700), dashed tear-here strip (6px), BOTTOM = classic postcard back at full 1200px width with larger fonts and proportions. Updated html2canvas dimensions to match. DOM root element height updated to 1406px.
- **Voice mode animated waveform**: Added `tg-mic-btn` button (microphone icon, orange tint) to TripGenie input row. When `_tgSetMicState(true)` is called (listening), the button switches to 5 animated waveform bars via CSS `tg-bar-pulse` keyframes — each bar has staggered `animation-delay` for organic look. When not listening, shows static microphone icon. `tg-hf-btn` waveform SVG bars also animate (`tg-hf-bar` keyframes) when hands-free mode is active.
- **Agenda 3 PM check-in floor**: `_ciT` calculation now floors to 3 PM if raw arrival + 45 min would be earlier. Agenda row also shows proper check-in time (floored) + "Arrive early" note when applicable.

### Session 18 (eleventh context) — 2026-03-02
- **Postcard complete redesign**: Full rework to look like a real postcard — LEFT = photo collage (postcard front, fills full 560×800), RIGHT = classic postcard back with ornate "Post-Card" header (double-rule border, serif italic), dashed stamp box (RV emoji + FOREVER), ruled message lines, location caption overlay on photo, "KINDLY DELIVER TO:" with address lines, postmark circle, footer bar. Background now `#f9f8f4` (cream white). Fixed `backgroundColor: null` → `'#f9f8f4'` in html2canvas (was rendering transparent = black). Fixed broken bgStyle CSS syntax (`PC_BG_GRADIENT + ';background:...'` → `'background:' + PC_BG_GRADIENT`).
- **Journal undefined stops**: Fixed `lo.textContent = st.emoji + ' ' + st.name + ', ' + st.state` → guarded with `(st.emoji ? st.emoji + ' ' : '')` and `(st.state ? ', ' + st.state : '')` in `renderJournal()` (same root fix as postcard dropdown from prior session).
- **Voice mode auto-reveal**: Added `_tgRevealVoiceTranscripts()` called when voice mode is toggled off — automatically shows all hidden voice text divs (id `tgv*`) so user sees full transcript without having to click "See text" on each bubble.
- **Attraction photos via Wikipedia**: Added `_tgFetchWikiPhotos()`, `_tgIsPhotoRequest()`, `_tgExtractPhotoSubject()` functions. When TripGenie receives a photo/picture request (regex-matched), it fetches up to 3 Wikipedia images for the attraction/location and displays them as a photo grid in the chat alongside Gemini's text response. Uses Wikipedia open CORS API — no API key needed.

### Session 18 (prior contexts) — 2026-03-02
- Gallery: add direct upload + duplicate detection + photoPool in modal
- Gemini minimum-visit badge on stop headers
- Security: SHA-256 password hashing, ALLOWED_ORIGINS env var for Gemini proxy, body size limit
- Haversine × 1.2 miles estimation for untracked legs → "Est. Miles"
- Agenda: removed "Day X" badge + blue highlight; added Print Agenda button
- renderCalendar() forEach crash fix (removedStops is Object not Array)

## Recent Changes (older)
- Initial commit: TripGenie RV trip planner (all current files)
- Added CLAUDE.md and PROJECT_CONTEXT.md for cross-device session continuity
- Session 2 (2026-02-26): Applied 10 UX/feature fixes — purple return route line, TripBuddy→TripGenie rename, removed duplicate suggestions, auto drive time on reorder, drag hint moved to orange bar, diet prefs in trip settings, removed duplicate AI ask button, AI info modal on rec cards, reworked Pause Trip modal, enhanced Decisions tab with days-over counter
- Session 2: Set up GitHub repo (pmaass-12/tripgenie) and Netlify CI/CD auto-deploy from main branch
- Session 3 (2026-02-27): Fixed trip start date not updating schedule; combined Schedule+Stops into Planner tab; mobile nav spacing fixes; full app nav merged; login persistence (30-day rv_session); update banner with ETag polling; RV Amps setting; campground AI prompt with hookup/laundromat/check-in; Drive Time Split rename; WHY: markdown strip in suggestItemAlternative; improved AI error diagnostics
- Session 4 (2026-02-27): Drive day schedule logic overhaul — mornings now show departure context (leave ~8 AM), on-road lunch stop, arrival at destination; explore days unchanged. Fixed ddmArrivalTime midnight wrap bug ("13:00 PM" → correct "1:00 AM"). Added time format setting (12h/24h), departure time setting, and latest arrival time setting to Trip Settings. Added weather highs/lows to blue phase header bars. Added Escape key to close all modals. Added 🗑️ Remove button to phase headers to fully remove a stop from the schedule (with ↩ Restore capability).
- Session 5 (2026-02-27): Fixed Drive Time Split not reflecting in day detail modal. Renamed Simple→Driving / Advanced→Planning mode. Fixed Gemini API key leak (revoked key + Netlify serverless proxy + env var). Built 110-test regression suite.
- Session 6 (2026-02-27): Drive day timing fixes (lunch ≥ noon, check-in ≥ 3 PM), Leg 2 drive row, per-person packing list groups, sticky category headers with inline + Add, delete items from day schedule, reset order button, states visited fix (gated on tripIsLive()), login date fix (_updateLoginDisplay uses TRIP_DAYS[0].date), mobile nav label shortening.
- Session 7 (2026-02-28):
  - **List item editing**: ✏️ pencil button on each item opens a bottom modal to rename. Stores in `appState.listItemText[id]`; also updates `customListItems` for custom items.
  - **Show/hide completed**: "🙈 Hide done" toggle at top of each list. State in `appState.listHideCompleted[type]`. Total count stays correct even when hidden.
  - **New list sections**: "+ Section" button opens modal to name a new category. Creates a placeholder item so the category appears immediately.
  - **Restaurant Preferences**: New Trip Settings section with 8 dining-style chips (Foodie/Gastro, Farm to Table, Chain, Bars, Ethnic, BBQ, Fast Casual, Buffet). Stored in `appState.restaurantPrefs`. `getRestaurantPrefContext()` returns AI prompt string.
  - **Refresh All Recommendations**: Button in Restaurant Prefs section clears `appState.aiCache`, `appState.adjustmentCache`, `appState.tripRecommendations` so AI generates fresh responses.
  - **Map start point fixed**: `buildMapMarkers` now uses `_tripHomeStop()` (scans TRIP_DAYS for sleepType='home') instead of `TRIP_STOPS[0]` (was Shenandoah Valley). Both outbound and return polylines now correctly start/end at Warwick, NY. Home stop excluded from the stop-markers forEach loop.
  - **Modal scrollbar fix**: `.ddm-card`, `.aim-card`, `.music-card` now use `overflow:hidden; display:flex; flex-direction:column` so scrollbars are clipped to the border-radius. Inner content divs (`#ddm-blocks`, `.aim-scroll-body`, `#music-body`) scroll. Safe-area padding moved to inner divs.
  - **Conflict banner same-user fix**: When `theirName === myName` (same person, two devices/tabs), banner now shows "💻 Keep My Current Edits" / "☁️ Load Saved (HH:MM)" with a clear description instead of the confusing "Keep Paul's / Take Paul's".
  - **What's New updated**: Added all session 7 features to the "Latest Updates" release entry.
  - **Change Plan stop naming fix**: Change Plan AI prompt now requires `name` to always be a city/town/area, never a specific venue. Added `attraction` field to sample JSON so AI correctly separates "The Plaza Theater" → city: "El Paso, TX" + attraction: "The Plaza Theater". Attraction becomes an activity at the city stop. (Root cause: AI was returning venue name in `name` field; `_addNewStop` used `item.city || item.name`, so venue became the stop name.)
  - **Drive day title fix (`_getDriveDayTitle`)**: Changed backward-scan to use `phase` field (not just `stopId`) to detect departure city. Fixes "Oklahoma City" appearing as departure for Nashville and Blue Ridge days when those stops share a stopId with OKC.
  - **Phase header miles removed**: Blue phase-header bar no longer shows `· XX mi`. Miles only appear on the drive-day row in the schedule.
  - **Days label inline with +/− buttons**: Changed vertical stack (Days above, buttons below) to single horizontal row: `− Days +`. Fixes vertical alignment issue.
  - **Ask TripGenie pill height matched**: Reduced padding/font-size on `#tg-btn` to match sibling pills exactly.
  - **Trip Health Check**: Added `refreshTripPlan()` with 12 checks (day sequencing, drive title A→B→C order, missing fields, orphaned refs, map coords, stale removedStops, long drives, activity timing, start date sync, restaurant prefs, AI cache, weather). Auto-fixes 6; reports rest as warn/info. Self-verification confirms fixes applied. Button added to Trip Settings.

---

## Key Decisions
- Single self-contained HTML files (no separate CSS/JS files) for simplicity and portability
- Multiple mockup versions kept for reference rather than deleted
- Mobile-first design with desktop enhancements
- Leaflet chosen for mapping (open source, no API key required)
- Drive day schedule: depart at configurable time (default 8 AM), on-road meals, destination activities only post-arrival; lunch floor = noon; check-in floor = 3 PM
- Time helpers: `_fmtHour(h)`, `_fmtTimeStr(str)` centralize all time display formatting respecting user's 12h/24h preference
- Stop removal: `appState.removedStops[stopId]` flag + `phaseExtraDays[stopId] = -allDays` hides entire phase; restore clears both; Restore UI lives in Audit Log tab
- `_getDriveDayTitle(d)` helper scans TRIP_DAYS backward skipping removed stops to compute correct "City A → City B" title
- Map home coords: always resolved via `_tripHomeStop()` (scans TRIP_DAYS for sleepType='home'), never from `TRIP_STOPS[0]`
- List item text: overrides stored in `appState.listItemText[id]`; `_listItemDisplayText(id, defaultText)` is the canonical getter
- Modal scroll pattern: card has `overflow:hidden; display:flex; flex-direction:column`; inner content div has `overflow-y:auto; flex:1` — prevents scrollbar from clipping past border-radius

---

- Session 8 (2026-02-28):
  - **Multi-leg drive day title fix (`_getDriveDayTitle`)**: Rewrote to correctly handle consecutive same-phase drive days (e.g. 2-day return trip). Previously both days would show same origin (e.g. "Blue Ridge Mountains → Warwick, NY"). Now: first day uses prev-phase name as origin; second day uses first day's `sleep` field as origin (e.g. "Fredericksburg, VA → Warwick, NY"). Falls back to phase-scan if no sleep recorded.
  - **Phase header icons removed**: Removed the emoji icon from the left side of the blue phase header bars in the schedule. User found them noisy (hearts, home icon, etc.).
  - **Trip length "mismatch" clarification**: User confirmed the schedule extending beyond configured end-date is intentional (stops were added). No health check warning needed for this.
  - **Uncommitted from prev session**: loadAllWeatherSilent(), auto-weather in initApp(), Skip Preferences rename, map timing fix (800ms), RV Profile JS functions (getRVContext, saveRVProfile, openDriveDirections, _buildGoogleMapsUrl, _buildAppleMapsUrl, _showDirectionsModal, _loadOSRMRoute) — all present in index.html but RV Profile UI section NOT yet added to Trip Settings HTML.

---

- Session 9 (2026-02-28):
  - **Trip Stats tab**: Added third segment "Trip Stats" to Planner segmented control. `renderTripStats()` renders stat chips (total days/nights/drive days/stops), states bar, destinations list, and activity categories (10-category classifier).
  - **Schedule display fixes**: Fixed Trip Pause date overlap (day badges now use `_effectiveDate`). Removed "(-X shortened)" text from phase headers. Split multi-stop phase headers — when multiple stops share a phase (e.g. "Southwest"), each stop now gets its own blue header bar using the actual city name. Replaced ▲▼ with FA chevron-up/down icons in day ordering. TripGenie context now includes full itinerary and answers about ANY location asked about.
  - **Recommendations overlap fix**: Added `_suggAlreadyInTrip(s)` to auto-dismiss pending suggestions already in itinerary. Updated `geminiAdjustSchedule` prompt to include full planned stop list with "do NOT suggest these again" instruction.
  - **TripOptimizer rewrite**: Completely rewrote as 3 trade-off packages (not individual ops). Each package has `title`, `hook` (trade-off pitch like "Although Palm Springs is nice…"), `tradeoff`, `saves`, and `ops[]`. Premium green UI cards with single "Apply This Package" button triggering `_applyOptimizerPackage → _applyGenieChangeWithAI`.
  - **Real road routing on main map**: Added `_routeCache = {}` and `_mapBuildGen = 0` module-level vars. `_fetchRoadRoute(waypoints, gen, callback)` fetches real driving geometry: Tier 1 = OSRM (free, no key), Tier 2 = Mapbox (when `appState.mapboxToken` set, with RV avoidances). `buildMapMarkers` draws thin dashed placeholders immediately, then replaces with real road polylines asynchronously. `forceRefreshMap` clears `_routeCache`.
  - **RV Profile & Map Routing in Trip Settings**: Added new section to `renderTripSettings()` with vehicle type button-group, height (ft/in), routing checkboxes (avoid parkways, avoid tolls), and Mapbox token password input. `saveRVProfile()` updated to save vehicle type, height, routing prefs, and Mapbox token to `appState`. Added `_rvSelectType()`, `_showMapboxToken()` helpers. Status badge shows "✅ Mapbox token saved" vs "⬡ No token — using OSRM free routing".
  - **Mapbox token**: Standard public token only — no secret scopes needed. Stored client-side in `appState.mapboxToken` (localStorage). Not a Netlify env var (no build step, no server).

---

- Session 14 (2026-02-28):
  - **Print Trip Plan PDF feature**: Added `printTripPlan()` function (lines 5439–5654) that generates a beautifully formatted HTML document containing the complete itinerary with trip stats, stop details, drive days, stay days, and schedule. Opens in a new window and auto-calls `window.print()` for "Save as PDF" workflow. Includes:
    - Trip header with dates and key stats (total days, stops, miles, drive days)
    - Stop-by-stop sections with numbered badges, accommodation type, and date ranges
    - Drive days with distance/duration metadata
    - Stay days with day numbers, dates, and custom items from schedule
    - Return home section with green accent
    - Print-optimized CSS with page breaks and mobile/desktop styling
    - Orange "Print PDF" button added to Map tab header (line 2385) next to Refresh button, using `--orange` and `--orange-l` design tokens
  - **Template literal syntax fix**: Escaped `</script>` tag inside print function's template literal as `<\/script>` (line 5642) to prevent regex parsing issues in regression test suite
  - **All 110 regression tests passing** — no snapshot regeneration needed

- Session 17 (2026-03-01):
  - **Removed hardcoded Fredericksburg ghost stop**: Day 43 in TRIP_DAYS changed from a Walmart-Fredericksburg transit overnight (stopId:15, sleepType:'walmart') to a direct final drive home (sleep:'HOME!', sleepType:'home', 450mi/7h, title:'Blue Ridge → Warwick, NY — Welcome Home!'). Day 44 changed to a home rest day with unique title 'Home — First Day Back'. Day 45 stays 'Home — Unpack, Rest, Relive Memories'. Root cause: Day 43 had stopId:15 (same as home stop) with sleepType:'walmart', making it un-deletable from the navigator since the home stop cannot be removed.
  - **Health Check 3c added**: New auto-fix detects any day where stopId===homeId but sleepType is 'walmart'/'boondock'/'rest_area' — a transit overnight piggybacking on the home stop. Fix combines miles from that day + next home drive day into one final drive home, and converts the now-redundant next drive day to a rest day. Origin name derived from previous phase.
  - **Print map: Leaflet tiles replacing SVG grid**: `printTripPlan()` now uses a real Leaflet map (unpkg CDN) instead of a hand-drawn SVG schematic. Stop markers use numbered blue/green divIcons, route drawn as orange dashed polyline. Print is triggered after 4s (with a 2s early-check if tiles load fast) to give tiles time to render. Map CSS references `#print-map` div. Old SVG projection code (`_mMinLat`, `_mMaxLat`, `_prj()`, `_svgParts`) removed.
  - **Print stop names fixed**: `_mapStops` now stores `displayName` using `_stopCityDisplay(stop)` (which calls `_inferStopState()` for consistent 2-letter state codes). Both the Leaflet legend and the stop section headers now use this normalized name instead of raw `stop.name + stop.state`.
  - **Total miles health check (HC 12b)**: New check in `refreshTripPlan()` computes the actual sum of all drive-day miles from the live TRIP_DAYS array and compares with CONFIG.totalMiles. If different by >5% (or >100mi), auto-fixes `CONFIG.totalMiles`, `customTripData.totalMiles`, and the displayed value. This fixes the "2,402 est. miles" display bug in the Print PDF header.
  - **Driving mode today screen redesign** (iPad mini split-screen, Session 17 cont.): `_smRenderToday()` completely rewritten with above-fold priority layout. New structure: (1) compact `dm-top-bar` showing day badge + date + progress%; (2) `dm-next-card` — blue card for drive days (green for explore days) showing destination name, miles, hours, route viz, emoji; (3) `dm-cta-row` — two large CTA buttons: drive days get "We've Arrived! 🎉" (green, calls `_dmArrived`) + "We've Left 🚐" (orange, calls `_dmDeparted`); explore days get "Camp Info 🏕" + "Journal 📓"; (4) `dm-genie-big` — full-width purple→blue gradient TripGenie button. Below the `dm-divider`: stats row, tonight's hero card, quick actions (unchanged). New handler functions: `_dmArrived(dayNum, stopLabel)` shows celebration toast + opens camp info; `_dmDeparted(toLabel)` shows departure toast. All CSS classes added in previous sub-session. Designed for ~375–520px wide × 640px tall (iPad mini split-screen landscape).
  - **Regression tests**: 111/111 passing.

## Known Issues / In Progress
- Multiple mockup versions exist — needs consolidation decision (which is canonical?)
- `saveTripSettings()` re-dates TRIP_DAYS in memory only; custom trip (AI-built) trips have their own date logic via `customTripData` — date change behavior for custom trips not yet tested
- rv-app.zip contents unknown — may be redundant
- Regression test snapshots need regeneration after session 7 changes (drive day HTML changed significantly)
- Future: fetch actual check-in time from campground/hotel data to replace hardcoded 3 PM floor
- Gallery/Journal unification requested (all photos in one pool, accessible from either tab) — noted for next session
- `getRestaurantPrefContext()` currently only injected into the adjustments AI prompt; could be added to campground/area info prompts as well

---

- Session 10 (2026-02-28):
  - **Mobile phase header redesign**: Restructured `phaseHeaderHtml` into 2-row mobile-first layout. Row 1: ↑/↓ + large city name + accommodation badge + weather pill + music button. Row 2: action strip (Area Info, − Days +, Remove). Much more readable on small screens. Snapshot regenerated.
  - **Accommodation type system**: `_STAY_TYPES` array (campground 🏕️, hotel 🏨, cabin 🌲, vacation rental 🏠). Stored in `appState.stayType[stopId]`. `_cycleStayType(stopId)` cycles on tap, shows toast, re-renders. Badge visible in phase header row 1. `_getStayContext(stopId)` generates AI prompt string for future injection.
  - **TripGenie quick-access on day detail modal**: 4 quick-prompt buttons in DDM header (Why go here? / Things to do / Best eats / Pro tips). `openTripGenieAboutStop(question)` pre-fills with stop name + question. `window._ddmCurrentStop` set in `openDayDetail`.
  - **Drive mode large Ask Genie button**: Full-width gradient button (purple→blue, ~64px tall) replacing compact genie bar. Large ✨ icon + text + mic icon. Calls `openTripGenie()` directly.
  - **Voice-to-voice chat**: Web Speech API integration. 🎤 mic button in TripGenie input row — tap to start, tap again or wait for auto-send. 🔇/🔊 Voice toggle in TG header enables TTS readback of Genie responses. `_tgStartVoice()`, `_tgSetMicState()`, `_tgSpeak()`, `_tgToggleVoiceMode()`. Prefers natural voices (Samantha/Karen/Ava). Works on iOS Safari and Chrome/Android.

---

- Session 11 (2026-02-28):
  - **Accommodation toggle in day detail modal (sleep row)**: The "Evening at Camp/Hotel/Cabin/Rental" row in the day schedule now shows 4 inline tap buttons (🏕️ Camp, 🏨 Hotel, 🌲 Cabin, 🏠 Rental). Active type is highlighted blue. `_cycleToStayType(stopId, targetType)` applies immediately and re-renders the blocks — no save button needed.
  - **AI prompt enrichment**: `fetchCampInfo` now injects stay type context (`_getStayContext`), RV context (`getRVContext`), and restaurant prefs (`getRestaurantPrefContext`). `fetchAreaInfo` now appends restaurant prefs and RV context. AI suggestions are now fully personalized.
  - **Gallery/Journal photo unification**: `_addToPhotoPool(dataUrl, opts)` helper stores all photos in `appState.photoPool[]` with `{id, dataUrl, timestamp, caption, stopId, dayNum, source}`. Journal photos tagged `source:'journal'`, gallery uploads tagged `source:'gallery'`. `renderGalleryTab` merges photoPool photos with journal photos. Cross-tab visibility: journal photos appear in Gallery, gallery uploads accessible from Journal.

---

- Session 12 (2026-02-28):
  - **Map stop navigator sidebar**: Added `.map-nav-wrap` flex layout to the Map tab — `#map-stop-nav` (248px sidebar, collapses to horizontal strip on ≤700px) + `#map-container` (flex:1). `renderStopNavigator()` renders numbered draggable list of stops with orange circle badges, stop name, stay icon, nights count, and grip handle. Called on map tab open, `initMainMap()`, and `forceRefreshMap()`.
  - **Numbered map pins**: `buildMapMarkers` now builds `_stopNumMap` (stopId → sequential number) before rendering. Markers replaced from emoji to orange `#E8813A` circle divIcons (32×32px) showing stop number in white bold text. Home stop excluded from numbering.
  - **Drag-to-reorder from navigator**: HTML5 drag-and-drop handlers (`_navDragStart`, `_navDragOver`, `_navDragLeave`, `_navDrop`, `_navDragEnd`) on each nav item. Drop calls `_reorderStopsFromNav(fromIdx, toIdx)`.
  - **`_reorderStopsFromNav(fromIdx, toIdx)`**: Batch arbitrary reorder — groups TRIP_DAYS by stopId, splices moved stop to target index, re-dates all days from CONFIG.startDate, renumbers day.day, sorts TRIP_STOPS to match new order. Home stop (sleepType:'home') always kept at end. Saves as customTripData, calls renderStopNavigator() + renderSchedule() + _clearAndRebuildMapMarkers().
  - **Phase header redesign (desktop-first, Airbnb-inspired)**: After 2-row mobile layout looked poor on desktop, rewrote `phaseHeaderHtml` as single unified row on blue surface. Left: chevron reorder buttons (8px radius). Center: city name (900 weight) + subtitle (nights · stay badge · spring break). Right: weather pill | music icon | Area Info | −DAYS+ segmented pill | Remove icon. Clean, no dark sub-strip.
  - **Max days per stop setting + TripOptimizer integration**: Added "Max Days Per Stop" number input to Trip Settings (default 5, stored as `appState.tripSettings.maxDaysPerStop`). TripOptimizer prompt now includes this constraint; suggests packages to trim stops exceeding the limit. `_applyOptimizerPackage` respects cap when reducing days.

---

- Session 13 (2026-02-28):
  - **"Max Days Per Stop" setting added to Trip Settings**: New number input with min/max constraints (1–30 days, default 5). Stored in `appState.tripSettings.maxDaysPerStop`. Rendered in Trip Settings HTML after "Latest Campground Arrival" time setting. Saved via `saveTripSettings()` and persisted with `saveState(appState)`. Displays toast confirmation on save.
  - **TripOptimizer awareness of max days constraint**: Added `_getOverstayedStops(maxDays)` helper function that scans TRIP_DAYS and identifies stops exceeding the configured max-days limit, returning array like `["Palm Springs, CA (8 days)", ...]`. Integrated into `_runTripOptimizer()` pressure points detection. When overstayed stops exist, they're added to the issues list: `"Stops exceeding 5-day limit: Palm Springs, CA (8 days), ..."`.
  - **TripOptimizer prompt enriched**: Prompt now mentions max stay limit in family context line. Added guidance: "Prioritize packages that trim stops exceeding the X-day limit first." Added OP RULE: "When using set_nights, respect the X-day maximum — never set a stop to exceed this limit." AI now understands the constraint and targets stops that violate it in optimization packages.
  - **Regression testing**: All 110 tests passing. No snapshot regeneration needed.

---

---

- Session 14 continued (2026-02-28):
  - **Critical login bug fixed**: `printTripPlan` template literal contained unescaped `</script>` tag in HEAD commit — browser parsed it as closing the `<script>` block, killing all JS after that point (including login). Fixed by escaping as `<\/script>` inside the template string.
  - **Login screen date pre-loading**: Added pre-login date updater in the page startup IIFE. Before the user logs in, reads `rv_app_state` from localStorage and updates the login screen's trip name, date range, and day count to reflect the user's saved custom trip data. Falls back gracefully to hardcoded defaults if nothing is saved. Keeps login screen accurate after the user customizes trip dates or adds/removes stops.

---

---

- Session 15 (2026-02-28):
  - **Multi-user Supabase auth + My Trips dashboard**: Implemented complete per-user authentication flow with Supabase JS v2 SDK.
  - **Supabase client initialization**: Added `_initSbClient()` function after SUPA constants that creates a new supabase-js v2 client instance once and caches it. Global vars: `_sbClient`, `_sbUser`, `_currentTripId`.
  - **Enhanced login form**: Updated HTML to show email + password fields + Sign In / Create Account mode toggle tabs. Forgot Password link appears only in Sign In mode. All inputs styled consistently with existing design tokens.
  - **Auth mode functions**: `_setLoginMode(mode)` toggles between 'signin' and 'signup' modes, updating button styles and showing/hiding Forgot Password link. `_doForgotPassword()` calls Supabase `resetPasswordForEmail` API and shows success/error toast.
  - **Rewritten doLogin()**: Now async. If email is provided, routes to Supabase: `signUp()` for signup mode, `signInWithPassword()` for signin mode. Detects unconfirmed email in signup and shows toast. On success, sets `_sbUser` and calls `_showMyTrips()`. If no email, falls through to `_doLegacyLogin()` (password-only family/friend/viewer modes for backward compatibility).
  - **My Trips dashboard (`_showMyTrips`)**: Fetches user's trips from Supabase `trips` table, displays as 2-column grid of trip cards. Each card shows trip name, date range, last updated timestamp. Buttons: "Open Trip" (loads trip_data into appState), "Delete" (removes from DB). "New Trip" button opens the wizard. Email in header.
  - **Trip card rendering (`_renderTripCards`)**: Renders array of trips as cards with emoji icons, trip name, dates, updated timestamp, and Open/Delete buttons. Includes "New Trip" CTA card with dashed border and plus icon.
  - **Open trip (`_openTrip`)**: Loads trip_data from Supabase, merges into appState, persists to localStorage, closes overlays, and calls `_doLegacyInitAfterSbAuth()` to launch the app.
  - **Delete trip (`_deleteTrip`)**: Confirms deletion, removes from Supabase `trips` table, refreshes My Trips list.
  - **New Trip Wizard (`_showNewTripWizard`)**: Step 1 collects trip name, trip type (US Road, RV, International, Blank), start/end dates. Types us_road/rv clone TRIP_STOPS + TRIP_DAYS; international prompts for destinations; blank starts empty. Step 2 (for international): add destinations with geocoding via Nominatim API (free, no key) — resolves lat/lng and lets user specify nights per stop. Creates full trip data structure, inserts into Supabase `trips` table, and launches app.
  - **_createTripFromSettings()**: Takes wizard options and builds complete appState.customTripData (stops array, days array with proper sequencing, dates, total days, miles, trip name). Handles template cloning (us_road/rv), international (from geocoded stops), or blank (single stop, N days). Saves to localStorage, inserts trip row to DB, then launches app.
  - **Per-user trip sync (`_syncToSupabaseTrips`)**: Debounced to 1200ms. On first save, creates new `trips` table row with user_id. On subsequent saves, updates existing trip's trip_data JSON. Called from `saveState()` only if `_sbUser` is set (Supabase auth active).
  - **Sign out button (`_sbSignOut`)**: Clears Supabase session via `client.auth.signOut()`, clears global vars, removes rv_session from localStorage, and reloads page to show login screen.
  - **My Trips and New Trip Wizard overlays**: Added 2 new overlay divs (`#my-trips-overlay`, `#new-trip-wizard-overlay`) with fixed positioning, flexbox centering, and appropriate z-index (9000 and 9100). Styled consistently with existing design tokens and modal patterns. New Trip Wizard has close button (×) and supports click-outside to dismiss.
  - **Backward compatibility**: Legacy password-only auth (CONFIG.password, CONFIG.viewerPassword, CONFIG.friendsPassword) still works via `_doLegacyLogin()`. No email required — existing users can keep using family/friend/viewer passwords. Both flows coexist.
  - **File changes**: index.html increased from ~20,132 to ~20,656 lines (524 lines added). All changes are insertions/additions; no existing functionality removed.


---

- Session 15 continued (2026-02-28):
  - **Drive day title fix (return leg)**: `_getDriveDayTitle` and `_cleanSleepLabel` added to correctly handle the 2-day return trip where Day 43 sleepType='walmart' (Fredericksburg, VA) and Day 44 arrives home. Previously both days showed "Badlands → Warwick, NY". Now: Day 43 shows "Badlands → Fredericksburg, VA", Day 44 shows "Fredericksburg, VA → Warwick, NY". `_cleanSleepLabel` strips store name prefixes ("Walmart ", "Flying J ", etc.) from sleep location strings.
  - **Decisions tab live refresh**: `saveState()` now calls `renderDecisions()` if `#decisions-content` element is visible (offsetParent check). `tripCleanup()` also calls `renderDecisions()` after re-rendering all other tabs. Decisions tab now updates in real-time as the plan changes.
  - **TripGenie / PauseGenie Gemini proxy fix**: Both `getTripGenieSuggestions()` and `getPauseGenieSuggestions()` were calling the Gemini API directly with `GEMINI_KEY` (always empty `''`), causing "No Gemini key" errors. Fixed both to use `GEMINI_URL` (the Netlify proxy) with proper request body format. `getTripGenieSuggestions` also had a stale `key` variable reference removed.
  - **Stops tab in Driving mode**: `_smSeg('stops')` called `renderStops()` which targets `#stops-content` (the regular planner div) but the driving mode shows `#sm-stops-content`. Fixed by copying innerHTML from `#stops-content` to `#sm-stops-content` after rendering.

---

- Session 16 (2026-03-01):
  - **Over Schedule badge suppressed on home days**: `renderSchedule()` now checks `d.sleepType !== 'home'` before rendering the red "🔺 Over Schedule" badge. Home days (sleepType='home') never show this warning since the trip is complete.
  - **Global `_STATE_ABBR_MAP` + `_normState()`**: Moved state/province normalization from local scope inside `renderTripStats()` to global scope before `_sn()`. Now normalizes "California"→"CA", "Tn"→"TN", etc. everywhere. Includes Canadian provinces (AB, BC, ON, QC…). `_sn(stop)` updated to call `_normState(stop.state)` so all stop name display is consistent.
  - **Stop city name editor**: Added `_stopCityDisplay(stop)` and `editStopCityName(stopId)` functions. Stored in `appState.stopCityNames = { [stopId]: "Myers Flat" }`. Blue phase headers now show a ✏️ button (turns 📍 after override set) to set the city/town name. Day card meta shows a `📍 City, ST` chip when override is active. Destination name (e.g. "Humboldt Redwoods") stays in blue header; city name appears in individual day cards.
  - **Auto dark mode at night**: 3-state toggle: light → dark → auto-night → light. Button cycles with icons: 🌙 / ☀️ / 🌓 with tooltip. `_applyAutoNight()` sets dark-mode class when hour is 20–6 (8pm–7am), removes it during daytime. `_nightModeInterval` runs every 60s when in auto-night mode so switch happens automatically. State saved as `appState.darkMode = 'auto-night'`.
  - **Pause delete button**: `_renderPauseScheduleBlock()` now includes a trash can button (🗑️ pill style) inline in the orange pause bar. Calls existing `deletePauseDay(pd.id)`.
  - **Blue-bar trash button style**: Updated the remove-stop button in `phaseHeaderHtml` from square-ish emoji style to pill shape matching white row trash: `border-radius:100px`, Font Awesome `fa-trash-can` icon, white text on semi-transparent red.
  - **Session 16 continued — Dashboard + modal bugs fixed**:
    - **"undefined Wytheville" in Up Next cards**: Guarded `us.emoji` with `(us.emoji ? us.emoji + ' ' : '')` — stops with no emoji were concatenating `"undefined Name"`.
    - **Mini map grey area**: `initMiniMap()` now properly destroys the previous Leaflet map instance, clears the `_leaflet_id` from the container DOM node, uses the module-level `miniMap` variable (was a local `const m`), and calls `miniMap.invalidateSize()` after 80ms to force Leaflet to recalculate the container's full width.
    - **`deletePauseDay` broken**: Added `renderSchedule()` call so the orange pause block immediately disappears from the planner view when deleted. Fixed toast text from `'Pause day removed'` → `'✈️ Trip pause removed'`.
    - **`_initDragDrop` not defined**: Guarded the call in `_cycleToStayType` with `if (typeof _initDragDrop === 'function') _initDragDrop()` — function doesn't exist yet, was causing ReferenceError on stay type toggle.
    - **Orange modal redesign**: Action buttons (We Arrived / We Left / Local Music) converted from 3-column grid to compact pill row (flex, gap:7px, border-radius:100px, inline layout). Meta line now shows stay type icon+label (e.g. "🏨 Hotel/Motel") instead of redundant "🏕️ Explore day at Wytheville".
    - **Split drive closes modal first**: `applySplitDrive()` now calls `closeDayDetail()` before `initApp()` re-render so user doesn't see stale "Split the Drive" button after the trip is restructured.
    - **Loading text dynamic by stay type**: `openCampInfo()` sets loading label based on `_getStayMeta()`: hotel → "lodging info", cabin → "cabin info", airbnb → "rental info", default → "campground info". Sub-line also shows stay type icon + city name.
    - **Hotel-specific AI prompt**: `fetchCampInfo()` now branches on `_stayType`. When hotel: asks about RV/large-vehicle parking (critical), room types, hotel amenities, family tips. When other: existing campground prompt unchanged. Preferred hotel chain injected if set.
    - **Preferred hotel chain in Trip Settings**: New text input `ts-hotel-chain` added to Trip Settings UI after RV Amps. Saved to `appState.tripSettings.hotelChain`. Injected into hotel AI prompt as "We prefer [chain] properties when possible."
    - **Transit-only stops excluded from route navigator**: `renderStopNavigator()` now filters out stops where every single TRIP_DAY has `sleepType` in `{walmart, boondock, rest_area}` — pure overnight-while-driving stops. Real destination stops remain unaffected.

- Session 18 (2026-03-01):
  - **Hamburger menu for iPad mini header**: Replaced aggressive text-label hiding with proper ☰ hamburger button (641–1024px breakpoint). Button opens dropdown with 4 actions: Plan a New Trip, Ask TripGenie, Change the Plan, Help. `_hamToggle()`, `_hamClose()`, `_hamAct(fn)` JS helpers. Click-outside closes menu. Button swaps to ✕ when open.
  - **Duplicate weather forecast button removed**: Removed the "Forecast" button from the expanded stop body in Day Planner Stops tab (kept only the one in the stop card header).
  - **School day count fixed**: `_isWeekendDay(dateStr)` helper (uses `new Date(...+'T12:00:00').getDay()`) excludes Saturdays/Sundays from school day count. Result: 25 real school days, 12 weekends off, 5 spring break days. Stats card updated to show "Weekends Off: 12" stat.
  - **Dashboard countdown pill fix**: Removed `white-space:nowrap`, added `flex-wrap:wrap` and `min-width:140px` on text div — fixes text overlap on iPad portrait.
  - **Day row trash button action sheet**: `_dayRowAction(stopId, phaseName)` opens action sheet with "Remove 1 day" vs "Remove entire stop". `_doRemoveStop()` internal function removes without double-confirm. `_removeStopFromRow` redirects to action sheet.
  - **Purple sleep info modal stay-type fix**: `_getStayType()` derives smart default from TRIP_DAYS `sleepType` field (rv_park/campsite→campground, hotel/motel→hotel, cabin/glamping→cabin, airbnb/vrbo→airbnb). No more "Loading campground info" for hotel stays. `fetchAimPhotos` uses `_sMeta.label.toLowerCase()` instead of hardcoded 'campground'. `fetchCampInfo` accepts `_typeLabel` param for dynamic error messages.
  - **Orange day detail modal simplified**: Removed Activities Near Here, Restaurants Near Here, Pro Tips, Local Music buttons. Kept: Area Guide + We Arrived! + We Left merged onto one row. `ddm-music-btn` kept as `display:none` hidden element so JS refs don't break.
  - **Welcome Home duplicate banner fixed**: `var _lastHeaderWasHome = false` initialized in `renderSchedule()` near `lastPhase`/`lastStopId`. The phase-header block now checks `!(_dIsHome && _lastHeaderWasHome)` to skip the green home banner if we're already in home territory. Prevents duplicate banners when days 43 (phase='Heading Home') and 44–46 (phase='Home') both have sleepType='home'.
  - **Transit day toggle**: New `_toggleTransitDay(dayNum)` function flips `appState.dayOverrides[dayNum].transitMode` between true/false. Transit days show: grey left-border card, "🚗 Transit Day" meta text, "Drive & Sleep" badge, campground/car toggle button in action column. Planned activities section hidden. Toggle button (green campground icon = explore, blue car icon = transit) appears on all non-drive, non-home day cards. Clicking restores with "🏕️ Explore day restored" toast or sets with "🚗 Marked as Transit Day" toast.
  - **Hamburger → vertical popover**: Redesigned `#ham-menu` from full-width horizontal ribbon to compact 230px vertical dropdown. Removed Ask TripGenie from hamburger (now permanently in header). Menu now 3 items: Plan Trip, Change Plan, Help.
  - **Ask TripGenie always in header**: `#tg-btn` now visible at all viewport widths. In 641-1199px range it's icon-only (text hidden). This was the most-used action so it deserves a permanent slot.
  - **1025–1199px breakpoint**: New breakpoint for iPad mini landscape and narrow desktops. Gets desktop grid layout but compact header (hamburger + TG icon + icon-only mode/help). Fixes "Driving/Planning button cut off" on iPad mini landscape.
  - **Tab panel overflow fixed**: Added `overflow-x: hidden` and `box-sizing: border-box` to `.tab-panel` — prevents right-edge card cutoff on dashboard, route planner, and scheduler at all viewport sizes.
  - **Share route fixed**: `_copyShareLink()` no longer stuck in "login and sync" loop. When no Supabase trip ID (legacy family-password users), falls back to copying the main app URL with a message that viewers need the viewer password. `_fallbackCopy()` updated to accept a message param.

- Session 18 continued (2026-03-01):
  - **Netlify Forms + Supabase dual-submit for suggestions**: `_guestSubmit()` now POSTs to both Netlify Forms (for email notifications to Paul) AND inserts directly into Supabase `trip_suggestions` table (for in-app visibility). Falls back to localStorage cache as tertiary. Friends submitting via `?friends=1` link get `trip_id = 'local'` in Supabase.
  - **_loadFriendSuggestions fetches both trip IDs**: Updated Supabase query to use PostgREST OR filter: `or=(trip_id.eq.TRIPID,trip_id.eq.local)` so Paul sees ALL submissions regardless of which link friends used. Added Refresh button to header.
  - **Suggestions header redesign**: Cleaner header with Refresh + Share Link buttons. Better "How it works" explanation that mentions Explore This Idea button.
  - **`_exploreIdea(stopLabel, suggestionText)`**: Full implementation. Opens an 560px modal with: (1) quoted suggestion in a purple-border callout, (2) AI-generated info about the place/activity via Gemini API (3–4 paragraphs: what it is, family appeal, practical tips, nearby pairings), (3) "Add to Change Plan" button + "Dismiss" button. Background tap closes modal.
  - **`_exploreIdeaAddToPlan(suggestionText)`**: Closes explore modal, opens `openChangePlanModal()`, pre-fills `#adj-voice-ta` with `"A friend suggested: '[text]'\n\nCan you suggest how we could work this into our trip?"`.
  - **Guest map "We Are Here" pin**: `_initGuestMapInst(stops, arrivals)` now accepts an `arrivals` object. Finds the most recently arrived stop (latest `.time` timestamp) and renders a 44×44 orange RV emoji 🚐 marker with a pulsing animation (`@keyframes herePulse`). Popup shows "🚐 We're here right now! [city, state]". All other markers unchanged.
  - **`_initGuestMode` extracts arrivals**: For the `?guest=TRIPID` Supabase path, extracts `td.arrivals` from the trip data and passes to `_initGuestMapInst`. For the `?friends=1` local path, reads `appState.arrivals` (works when Paul is viewing it on his own device). `guestArrivals` passed to map function.
  - **Animation style injected once**: `@keyframes herePulse` style tag (id=herePulseStyle) added to `<head>` on first use, not duplicated on re-renders.
  - **exifr CDN MIME type fix**: Switched exifr CDN from `cdn.jsdelivr.net` (served `.cjs` with `application/node` MIME type, blocked by Chrome strict checking) to `unpkg.com` which serves all JS with correct `application/javascript`. Added `onerror` fallback so EXIF reads fail gracefully without crashing page load. This fixes the blank `?friends=1` page.
  - **Stop navigator date cascade fix**: `renderStopNavigator()` now pre-computes `_navStopOffset[stopId]` — cumulative sum of `phaseExtraDays` from all prior stops. Each stop's effective date range is offset by this cumulative value, so removing a day at stop N correctly shifts all subsequent stop date ranges forward/backward. Also fixed lastDate computation: derives from firstDate + (nights-1) days rather than raw TRIP_DAYS end date.
  - **`_refreshAll()` function**: New one-stop sync function calls `renderSchedule()` + `renderStopNavigator()` + `renderDashboard()` + `_clearAndRebuildMapMarkers()`. Shows "Views refreshed ↻" toast unless called silently. `addPhaseDay()` and `removePhaseDay()` now call `_refreshAll()` instead of manually calling render functions — ensures dashboard and map stay in sync after day changes.
  - **↻ Refresh button in header**: New `#refresh-btn` added to `header-right` (before dark-mode toggle). Calls `_refreshAll()`. Font Awesome `fa-rotate-right` icon. Provides one-tap sync of all views without navigating to Tools → Health Check.

- Session 18 continued (2026-03-01, second context):
  - **_refreshAll() + ↻ header button**: New `_refreshAll()` function syncs schedule, stop navigator, dashboard, and map markers in one call. `addPhaseDay()` / `removePhaseDay()` call it instead of manual render calls. ↻ button added to header right (before 🌙).
  - **ElevenLabs TTS + hands-free voice mode**: Complete voice system rewrite.
    - `_tgSpeakEL(text)` — async EL TTS using `eleven_turbo_v2_5` model; Sarah voice default. Creates singleton `<audio>` element, plays MP3 blob.
    - `_tgSpeakWebSpeech(text)` — Web Speech fallback (unchanged logic but now standalone).
    - `_tgSpeak(text)` — entry point: routes to EL if key set, else Web Speech.
    - `_tgAfterSpeak()` — called on audio end; if hands-free active, auto-starts mic after 650ms.
    - `_tgInterruptSpeak()` — pauses audio and cancels Web Speech; called when mic activates.
    - `_tgHandsFree` bool + `_tgToggleHandsFree()` — new hands-free loop. After Genie speaks → auto-listens → user speaks → auto-sends → loops. Retry on transient mic errors.
    - `_tgUpdateVoiceUI()` — syncs both header buttons (🔊 Voice + 🎙️ / 🔴 Live).
    - 🎙️ hands-free button added to TripGenie drawer header (between Voice toggle and 🗑️).
    - ElevenLabs section in Trip Settings: API key (password input + show toggle), voice selector (6 voices), ▶ Test Voice button. Saved as `appState.tripSettings.elApiKey` + `elVoiceId`.
    - `_tsTestElVoice()` — plays "Hi! I'm TripGenie…" via EL with the saved key/voice.
    - `saveTripSettings()` updated to persist `elApiKey` + `elVoiceId`.
  - **Print route legend vertical ordering**: Changed `.legend-grid` from CSS grid (fills left-to-right, row by row) to CSS `columns: 3` (fills top-to-bottom per column). Stop 1–N now read vertically: col 1 = stops 1–10, col 2 = stops 11–20, etc. Used `break-inside: avoid` on each item.

- Session 18 continued (2026-03-01, third context):
  - **Drive days protected from skipDayNums**: In `renderSchedule()`, the skipDayNums computation loop now skips days where `driveDay === true`. Drive days can never be hidden by the "−" button logic — they're the backbone of the itinerary. Fixes "Day 2 → Day 5" and "Day 9 → Day 11" gaps where drive days were being caught in the removal set.
  - **Sequential display day numbers**: Added `_dayDisplayNum` pre-computation map in `renderSchedule()`. Before the main loop, all visible (non-skipped, non-home) days are counted and given a sequential integer (1, 2, 3…). The "Day X" badge in each card now shows `_dayDisplayNum[d.day]` instead of the raw `d.day`. User always sees Day 1, 2, 3… regardless of which explore days were removed.
  - **`_tripDayCount` updated**: Header now shows `_dispCounter` (total visible days) instead of the old `TRIP_DAYS.filter()` count, so "X-Day Schedule" matches the sequential numbers shown.
  - **ElevenLabs test — 2-step validation**: `_tsTestElVoice()` now first validates the API key via `/v1/user` endpoint (lightweight, no characters consumed). Clear 401 error message: "❌ Invalid key — go to elevenlabs.io → Profile → API Keys and copy a fresh key". Checks remaining character quota — if < 100 chars left, warns instead of attempting TTS. Key length sanity check (< 20 chars rejects immediately). Step 2 is the actual TTS POST with specific 401 message for that layer too.
  - **Health check 12d — schedule date gaps**: New check in `refreshTripPlan()` computes which days are visible (mirrors renderSchedule's skipDayNums logic, with drive-day protection). Walks visible days in date order checking for calendar holes. If any gap > 1 day is found, warns with dates and gap count. Passes with "✓ All N visible days are consecutive" when clean.

- Session 18 continued (2026-03-01, eighth context):
  - **Booking Confirmations feature**: Upload a PDF or photo of any reservation and Gemini extracts all key details automatically.
    - `appState.bookingConfirmations = { [stopId]: [...] }` — stored per-stop, array of booking objects
    - `openBookingModal(stopId)` — bottom-sheet modal with upload area + list of saved confirmations
    - `_bcHandleFile(event)` — reads file as base64 DataURL, kicks off Gemini extraction
    - `_bcExtract(b64, mimeType, fileName)` — POSTs to Gemini proxy with `inline_data` for PDF/image; structured prompt extracts 12 fields: propertyName, address, phone, confirmationNumber, checkIn/checkOut date+time, totalCost, type, siteOrRoom, hookups, notes
    - `_bcShowExtracted(data)` — renders editable form pre-filled with extracted values so user can review/correct before saving
    - `_bcSave()` — reads form values, auto-detects type (campground/hotel/cabin/airbnb) from property name, saves to appState
    - `_bcDelete(bcId, stopId)` — removes a saved booking
    - `renderBookings()` — new Tools sub-tab showing all confirmations grouped by stop, with "add" buttons for each stop
    - `_bcCardHtml(bc)` — renders a booking card with check-in/out grid, phone link, confirmation # chip, notes
  - **🎫 button in phase headers**: Each stop's blue phase header now has a "🎫" button (turns gold with count badge when confirmations exist). Tapping opens `openBookingModal(stopId)` directly from the schedule.
  - **Tools tab "Bookings" sub-tab**: Added between Expenses and RV Log in the Tools tab bar.
  - **Weather accuracy fix**: `_loadStopWeatherSilent` (called when tapping weather pill) now fetches both historical archive AND live 16-day forecast in parallel. Historical data cannot overwrite `type:'forecast'` entries. Stops within forecast window now correctly show "Live" forecast instead of "Historical/Typical".

- Session 18 continued (2026-03-01, seventh context):
  - **Drive separator single-line pill**: Reverted from 2-row to 1-row `flex-wrap:wrap` pill per user feedback. `border-radius:100px` (full pill), `align-items:center;flex-wrap:wrap;gap:6px`. All chips wrap naturally on narrow screens.
  - **`_getDriveDayTitle` no truck-stop destination**: `destName` now always uses the stop name / phase (`destStop ? _sn(destStop) : d.phase`), never the sleep location. Removes "Wytheville → Truck Stop" style titles.
  - **`_getDriveDayTitle` Day 1 shows Home city**: When `prevDay === null` (first drive day), origin is now `_tripHomeStop()` name (e.g. "Warwick → Winchester, VA") instead of falling back to `d.title`.
  - **Dashboard `_gVisibleDayCount` inline compute**: `renderDashboard()` now computes `_gVisibleDayCount` itself when 0 (before `renderSchedule()` has run), so "Day X of N" is correct even on first load.
  - **`2h ea` → `2h drive` for short drives**: Drive label only shows "ea" (each leg) when `_splitResolved && d.driveHours > _maxDriveH`. Short drives that fit in one sitting now show "2h drive" not "2h ea".
  - **Virtual drive separators at all phase transitions**: New `_renderVirtualDriveSep(prevStop, destStop, d, effectiveDate, displayNum)` function. Uses haversine + 1.3x road factor + 55 mph to estimate drive time. Skips if < 1 hour. Renders same orange pill with "est." badge (so user knows it's inferred). Inserted in `renderSchedule` at every stop-change transition that has no explicit `driveDay:true` entry. Fixes missing Memphis→Austin separator.

- Session 18 continued (2026-03-01, sixth context):
  - **Dashboard "Day X of 52" fix**: Added `_gVisibleDayCount` global set by `renderSchedule()`. Dashboard shows `(_gVisibleDayCount || TRIP_DAYS.length)` so "Day 1 of 45" matches "45-Day Schedule".
  - **Transit day card title**: When `_isTransit`, shows "Morning in [City]" instead of "Explore [City]".
  - **"We've Left" correct next destination**: `_smRenderToday()` scans ahead to find next different stopId. Subtitle shows real next stop name.
  - **TripGenie concise responses**: "CRITICAL — BE CONCISE" added to Gemini prompt. Voice mode adds 1-sentence max instruction. No more itinerary recitation.
  - **TripGenie mic button removed**: Removed `tg-mic-btn` from input row (user uses keyboard mic). Hands-free loop and `_tgStartVoice` kept internally.
  - **Drive separator redesigned (2-row pill)**: Shows ⏰ Depart chip (tappable → `openDriveTimeModal`), → Arrive estimate, badges, ✕ delete. Arrival calc: depart time + drive hours + stop break time. `openDriveTimeModal` saves to `appState.dayOverrides[d.day].departTime`. `_deleteDriveBar` flips driveDay off.
  - **Header Plan a New Trip → icon only**: Header pill shows just `fa-map-location-dot` icon. Hamburger still shows full label.
  - **?friends=1 blank page root-cause fixed**: `guest-overlay` div is after both `<script>` blocks in HTML. IIFE ran before DOM parsed so `getElementById` returned null. Fix: deferred with `DOMContentLoaded` listener. Login screen hidden synchronously (it precedes the script tag).

- Session 18 continued (2026-03-01, fifth context):
  - **TripGenie input row redesign**: Waveform hands-free button moved from drawer header to input row (alongside upload, mic, send). Upload button changed from 📷 camera emoji to Font Awesome `fa-arrow-up-from-bracket` icon. File input `accept` expanded to `image/*,application/pdf`. Photo preview strip updated with `tg-pdf-icon` (📄 emoji), `tg-attach-label`, `tg-attach-sub` elements.
  - **PDF support in TripGenie**: `handleTripGeniePhoto()` detects `application/pdf` MIME type. PDF attachment shows 📄 icon + filename in the preview strip instead of an image thumbnail. `_tgFileName` variable stores the original filename for display. `removeTripGeniePhoto()` clears both thumb and PDF icon. `askTripGenie()` shows a purple pill chip "📄 filename.pdf" in the user bubble for PDFs (instead of image preview). Gemini inline_data already accepted PDFs — no API change needed.
  - **Waveform button CSS class-based styling**: `#tg-hf-btn.tg-icon-btn` styled purple (background:#f0e8ff, color:#7B2FBE). Active state via `.hf-active` class (background:#7B2FBE, color:#fff, box-shadow). `_tgUpdateVoiceUI()` now uses `classList.add/remove('hf-active')` instead of inline style manipulation.
  - **ElevenLabs runtime 401 handling**: `_elDisabled` session flag; on first 401, disables EL for the session and shows toast directing user to Trip Settings → ElevenLabs. `_elKey()` returns `''` when `_elDisabled=true`, auto-routing to Web Speech fallback. Voice toggle removed from TG header; `_tgVoiceMode = true` by default.
  - **ElevenLabs API key permissions**: Only "Text to Speech → Access" needed. All other endpoint permissions (Speech to Speech, STT, Sound Effects, Music, etc.) can remain "No Access".

- Session 18 continued (2026-03-01, fourth context):
  - **Option A drive separator in schedule**: Drive days no longer render as full cards. `_renderDriveSepA()` renders an orange road-ribbon separator: dashed orange lines + centered pill with 🚐 + "City A → City B" + "Day X · Mon Mar 3 · 445 mi · ~7h". No driver name. Tappable → opens day detail. Long drive shows ⚠ Split button; split-resolved shows ✓ Split badge. Past drives shown grey.
  - **Phase header ordering fixed**: Drive days defer their destination phase header until AFTER the separator. `_phaseJustChanged` flag tracks the change; non-drive days render phase header before card (unchanged behavior). `continue` skips full card for drive days.
  - **`mobile-web-app-capable` meta tag**: Added non-deprecated meta tag alongside Apple-specific one.
  - **Guest map invalidateSize fix**: `_initGuestMapInst` now calls `invalidateSize()` + fitBounds after 120ms to resolve blank-tile issue when container transitions from `display:none` to `display:flex`.

- Session 18 continued (2026-03-02, ninth context):
  - **Drive separator duplicate fix**: Fixed AI-generated trips where a non-driveDay appeared at a stop BEFORE the explicit driveDay entry for that same stop — causing "Winchester → Wytheville" to appear twice (once as virtual separator, once as the real drive day rendered mid-stop). Fix: in the phase-change non-driveDay block, look ahead in `_sortedDays` for a real driveDay with the same `stopId`. If found, render that real drive entry's separator (with actual miles/hours) BEFORE the phase header and mark it `_preRenderedDriveDays[day] = true`. When the loop reaches that day, it skips it. If no real drive entry found, fall back to haversine virtual estimate (unchanged).
  - **Daily Agenda view (Calendar tab)**: New "📅 Calendar" sub-tab added to Tools. Shows every trip day as a time-blocked agenda card:
    - Drive days: 7:00 AM Breakfast & Pack Up → Departure time (from drivingPrefs) + 🚗 Drive block with miles/hours/arrival → Check In → Afternoon Explore → 6:30 PM Dinner
    - Explore days: 7:30 AM Breakfast → 9:00 AM Main Activity (extracted from day title) → 12:30 PM Lunch → 1:30 PM Afternoon → 5:00 PM Back at Camp → 6:30 PM Dinner
    - Shows weather pill if available, TODAY badge, stop break time on drive days
    - Month headers, phase name labels, "Full day detail →" button on explore days
    - Helper functions: `_calFmtTime(h, m)`, `_calAddHours(h, m, float)`, `_calActivity(title)`

- Session 18 continued (2026-03-02, tenth context):
  - **Agenda view in Planner tab**: New "📅 Agenda" button added to Planner segmented control (between Schedule and Day Planner). Renders `renderPlannerAgenda()` into a new `#agenda-content` div. Same Google Calendar–style time blocks as Tools Calendar but lives in the Planner tab for quick access during trip planning. Drive days show departure → drive → check-in → explore → dinner blocks; explore days show breakfast → main activity → lunch → afternoon → camp → dinner.
  - **`_homeId` fix in `_recalcDriveMiles`**: Line 7465 referenced `_homeId` which was not defined in that function's scope. Fixed to `var _recalcHome = _tripHomeStop(); var homeId = _recalcHome ? _recalcHome.id : 15;` — resolves "ReferenceError: _homeId is not defined" Promise rejection when tapping "Recalculate Drive Miles".
  - **Drive bar origin state fix**: `_getDriveDayTitle` was using raw `prevPhase` string (which lacks state suffix) as the origin city label, producing "Winchester → Wytheville, VA" (Winchester missing state). Fixed: prefer `_sn(getStop(prevDay.stopId))` which appends state via `_inferStopState` lookup, falling back to `prevPhase` only if no stop object found.

## Suggested Next Steps
- **Postcard flip animation**: User wants postcard to be "flippable" (front = photo, back = classic back) with a 3D CSS flip when tapped/shared — not yet built
- **Postcard sharing**: User wants postcard shareable as a viewable link (not just image download) — would require server-side storage or Supabase
- **0-day waypoint stops**: User wants stops with 0 nights for driving waypoints (fuel, Walmart overnight, route planning) — not yet built
- Push to GitHub (git push) when network is available — commits pending from sessions 8+
- User needs to create Mapbox public token at mapbox.com (no secret scopes), then enter it in Trip Settings → RV Profile & Map Routing
- User needs to run Supabase SQL (in PROJECT_CONTEXT) to create `trips` table with RLS for multi-user support AND the `trip_suggestions` table (see Suggestions tab setup instructions) for in-app suggestion syncing
- User needs to add `SUPABASE_URL` + `SUPABASE_ANON_KEY` env vars to Netlify for multi-user auth + suggestion syncing to work
- Consider adding "Nashville" and "Fredericksburg" as proper TRIP_STOPS entries (currently inferred from TRIP_DAYS but no markers on map)
- Test voice chat on actual iPhone/iPad — may need microphone permission prompt handling
- `_initDragDrop` is guarded but never implemented — drag-to-reorder time blocks in DDM could be a future feature
- **Drive-home planning**: Help Paul figure out actual drive-time per day for the return trip (days 40–43). Currently 3 explore days + 1 drive day; likely needs 2–3 transit days with overnight hotel/campground stops.

### Session 22 (continued) — 2026-03-08 (Production Hardening)

**Full regression audit + production fixes.**

- **Audit log coverage**: Added `_audit()` calls to all major state-change functions that were previously untracked: `_doRemoveStop` (stop removed), `restoreStopToTrip` (stop restored), `_toggleWaypoint` (waypoint set/cleared), `_toggleTransitDay` (transit day set/cleared), `_mapAddStopSave` (stop added via map). Every significant user action is now timestamped in the Change History log.
- **iOS input auto-zoom fix**: Added `@media (max-width:768px) { input, select, textarea { font-size: max(16px, 1em) !important; } }` — prevents iOS Safari from zooming in when tapping any of the 74+ inline-styled inputs that were below the 16px zoom threshold.
- **Leaflet memory leak fixed**: `renderPlannerAgenda()` now iterates `window._agMap_*` keys and calls `.remove()` on each Leaflet instance before replacing the DOM. Prevents orphaned map instances from accumulating on every `_refreshAll` call.
- **What's New updated**: Added "Today's Updates" card (Mar 8, 2026) covering all 7 session changes.
- **Regression audit confirmed**:
  - Node.js `--check` syntax: ✅ clean (27,670 JS lines)
  - 695 function definitions, all critical functions present
  - All onclick references resolve to defined functions  
  - No `eval()` usage, no `document.write()` to main doc
  - `saveState()` has try/catch for localStorage quota errors
  - `_isViewer` blocks all write operations for read-only links
  - All 77 fetch() calls have `.catch()` handlers
  - Supabase snapshot save/restore working with conflict detection
  - Supabase saves a local backup BEFORE applying any cloud restore
