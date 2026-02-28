# PROJECT_CONTEXT.md — TripGenie

> Auto-updated by Claude before each commit. Read this at the start of every session.

---

## Last Updated
2026-02-28 (Session 7)

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

## Known Issues / In Progress
- Multiple mockup versions exist — needs consolidation decision (which is canonical?)
- `saveTripSettings()` re-dates TRIP_DAYS in memory only; custom trip (AI-built) trips have their own date logic via `customTripData` — date change behavior for custom trips not yet tested
- rv-app.zip contents unknown — may be redundant
- Regression test snapshots need regeneration after session 7 changes (drive day HTML changed significantly)
- Future: fetch actual check-in time from campground/hotel data to replace hardcoded 3 PM floor
- Gallery/Journal unification requested (all photos in one pool, accessible from either tab) — noted for next session
- `getRestaurantPrefContext()` currently only injected into the adjustments AI prompt; could be added to campground/area info prompts as well

---

## Suggested Next Steps
- Push to GitHub (git push) when network is available — several commits pending
- Regenerate regression_test.js snapshots with `node regression_test.js`
- Implement Gallery/Journal photo unification (user requested: upload to gallery, all photos available in journal entry)
- Inject `getRestaurantPrefContext()` into campground + area info AI prompts alongside `getDietContext()`
- Consider adding "Nashville" and "Fredericksburg" as proper TRIP_STOPS entries (currently inferred from TRIP_DAYS but no markers on map)
- User's existing "Plaza Theater" stop in the trip was added incorrectly (venue name as stop name). User should use 🗑️ Remove on that phase, then use Change Plan again — new prompt will correctly create an "El Paso, TX" stop with the theater as an activity
