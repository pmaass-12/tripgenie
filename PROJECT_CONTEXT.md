# PROJECT_CONTEXT.md — TripGenie

> Auto-updated by Claude before each commit. Read this at the start of every session.

---

## Last Updated
2026-02-28 (Session 9)

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

## Suggested Next Steps
- Push to GitHub (git push) when network is available — commits pending from sessions 8-10
- User needs to create Mapbox public token at mapbox.com (no secret scopes), then enter it in Trip Settings → RV Profile & Map Routing
- Inject `_getStayContext(stopId)` into campground and area-info AI prompts (already written, just needs wiring)
- Inject `getRestaurantPrefContext()` into campground + area info AI prompts alongside `getDietContext()`
- Gallery/Journal photo unification (all photos in one pool, accessible from either tab)
- Consider adding "Nashville" and "Fredericksburg" as proper TRIP_STOPS entries (currently inferred from TRIP_DAYS but no markers on map)
