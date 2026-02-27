# PROJECT_CONTEXT.md — TripGenie

> Auto-updated by Claude before each commit. Read this at the start of every session.

---

## Last Updated
2026-02-27

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
- AI info modal ("Could not load info") root cause not fully resolved — improved error diagnostics added but may need API key refresh or Gemini model URL update

---

## Suggested Next Steps
- Test drive day schedule on Day 1 (Warwick → Luray): should now show 7 AM breakfast before leaving, 8 AM depart, ~2 PM lunch on road, ~2 PM arrive
- Load weather for each stop via the 🌡️ button in the blue phase headers
- Test Escape key on all modals
- Test Remove Stop flow (remove Kansas City, verify days hidden, restore works)
- Push to GitHub → auto-deploys to Netlify
