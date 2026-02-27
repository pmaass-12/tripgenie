# PROJECT_CONTEXT.md — TripGenie

> Auto-updated by Claude before each commit. Read this at the start of every session.

---

## Last Updated
2026-02-27 (Session 5)

## What This Project Is
A personal RV trip planner web app for the Maass Family RV Adventure 2026. Static HTML/JS/CSS, no build step, hosted via GitHub. Built and iterated with Claude Cowork.

---

## Current File Structure

```
tripgenie/
├── index.html                    # Main app (primary working file, ~16,700 lines)
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
- Session 4 (2026-02-27): Drive day schedule logic overhaul — mornings now show departure context (leave ~8 AM), on-road lunch stop, arrival at destination; explore days unchanged. Fixed ddmArrivalTime midnight wrap bug ("13:00 PM" → correct "1:00 AM"). Added time format setting (12h/24h), departure time setting, and latest arrival time setting to Trip Settings. Added weather highs/lows to blue phase header bars (shows avg high/low from loaded weather data, with 🌡️ load button if no data). Added Escape key to close all modals. Added 🗑️ Remove button to phase headers to fully remove a stop from the schedule (with ↩ Restore capability).
- Session 5 (2026-02-27): Fixed Drive Time Split not reflecting in day detail modal. `renderDayTimeBlocks` now reads `_overrides.splitResolved` and `_overrides.splitHours` to compute `_dispHours`; depart subtitle shows "225 mi · ~3.5h (Leg 1 of 2) · Arrive midpoint ~11:30 AM" when split is active. Also: renamed Simple→Driving / Advanced→Planning mode toggle labels; fixed Gemini API key leak (revoked key + Netlify serverless proxy + env var); built 110-test regression suite (regression_test.js) with snapshots, edge cases, mutation, serialization, and CI (GitHub Actions); fixed _getDepartureHour() NaN on invalid input.
- Session 4 continued: Fixed "Starts in X days" banner departure city (was "Shenandoah Valley", now correctly shows home stop "Warwick, NY" via _tripHomeStop() scanning TRIP_DAYS for sleepType='home'). Fixed "Warwick, NY, NY" double-state everywhere via _sn(stop)/_snE(stop) helpers. Fixed drive day item order (saved dayOrder skipped for drive days). Fixed drive day destination name (was finding wrong stop, now uses current day's stop). Fixed drive day breakfast showing destination restaurant name (ignores customPlace override on drive days). Fixed login page dates not updating (now dynamic via _updateLoginDisplay() called from saveTripSettings and initApp). Fixed Add Destination flow: AI now returns city/region not attraction name; ATTRACTION field parsed and stored; stop created with city name, attraction added as first activity.

---

## Key Decisions
- Single self-contained HTML files (no separate CSS/JS files) for simplicity and portability
- Multiple mockup versions kept for reference rather than deleted
- Mobile-first design with desktop enhancements
- Leaflet chosen for mapping (open source, no API key required)
- Drive day schedule: depart at configurable time (default 8 AM), on-road meals, destination activities only post-arrival
- Time helpers: `_fmtHour(h)`, `_fmtTimeStr(str)` centralize all time display formatting respecting user's 12h/24h preference
- Stop removal: `appState.removedStops[stopId]` flag + `phaseExtraDays[stopId] = -allDays` hides entire phase; restore clears both

---

## Known Issues / In Progress
- Multiple mockup versions exist — needs consolidation decision (which is canonical?)
- `saveTripSettings()` re-dates TRIP_DAYS in memory only; custom trip (AI-built) trips have their own date logic via `customTripData` — date change behavior for custom trips not yet tested
- rv-app.zip contents unknown — may be redundant
- **User must set up new Gemini API key**: old key was revoked (leaked in public repo). Get a new key at aistudio.google.com/apikey, then add `GEMINI_KEY` env var in Netlify dashboard (Site Settings → Environment Variables), then trigger a redeploy.
- Drive Time Split: Leg 2 arrival time not displayed in the schedule (only Leg 1 is shown); a full "Leg 2" row could be added in a future session
- Regression test snapshots may need regeneration after drive time split fix (drive day HTML changed)

---

## Suggested Next Steps
- **Set up new Gemini API key** (required for all AI features): aistudio.google.com/apikey → Netlify env var `GEMINI_KEY` → redeploy
- Push current index.html to GitHub → auto-deploys to Netlify
- Test Day 7 (Gatlinburg → Ozarks) in the app: day detail modal should now show "225 mi · ~3.5h (Leg 1 of 2) · Arrive midpoint ~11:30 AM"
- Optionally add a "Leg 2" drive row in the schedule for the afternoon portion of split drive days
- Delete or archive old snapshots dir and regenerate with `node regression_test.js` after pushing
