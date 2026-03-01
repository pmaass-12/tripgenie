# PROJECT_CONTEXT.md — TripGenie

> Auto-updated by Claude before each commit. Read this at the start of every session.

---

## Last Updated
2026-03-01 (Session 18, sixth context)

## What This Project Is
A personal RV trip planner web app for the Maass Family RV Adventure 2026. Static HTML/JS/CSS, no build step, hosted via GitHub. Built and iterated with Claude Cowork.

---

## Current File Structure

```
tripgenie/
├── index.html                    # Main app (primary working file, ~17,500 lines)
├── index2.html                   # Alternate version / experiment
├── simple-mode.html              # Simplified mode variant
├── mockup_desktop_v2.html        # Desktop layout mockup v2
├── mockup_desktop_v3.html        # Desktop layout mockup v3
├── mockup_desktop_v4.html        # Desktop layout mockup v4
├── mockup_itinerary.html         # Itinerary view mockup
├── mockup_itinerary_desktop.html # Itinerary desktop mockup
├── rv-app.zip                    # Archived version
├── CLAUDE.md                     # Persistent Claude session instructions
└── PROJECT_CONTEXT.md            # This file
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

## Suggested Next Steps
- **0-day waypoint stops**: User wants stops with 0 nights for driving waypoints (fuel, Walmart overnight, route planning) — not yet built
- Push to GitHub (git push) when network is available — commits pending from sessions 8+
- User needs to create Mapbox public token at mapbox.com (no secret scopes), then enter it in Trip Settings → RV Profile & Map Routing
- User needs to run Supabase SQL (in PROJECT_CONTEXT) to create `trips` table with RLS for multi-user support AND the `trip_suggestions` table (see Suggestions tab setup instructions) for in-app suggestion syncing
- User needs to add `SUPABASE_URL` + `SUPABASE_ANON_KEY` env vars to Netlify for multi-user auth + suggestion syncing to work
- Consider adding "Nashville" and "Fredericksburg" as proper TRIP_STOPS entries (currently inferred from TRIP_DAYS but no markers on map)
- Test voice chat on actual iPhone/iPad — may need microphone permission prompt handling
- `_initDragDrop` is guarded but never implemented — drag-to-reorder time blocks in DDM could be a future feature
- **Drive-home planning**: Help Paul figure out actual drive-time per day for the return trip (days 40–43). Currently 3 explore days + 1 drive day; likely needs 2–3 transit days with overnight hotel/campground stops.
