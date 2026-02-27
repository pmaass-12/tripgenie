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
├── index.html                    # Main app (primary working file)
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
- Session 3 (2026-02-27): Fixed trip start date not updating schedule — saveTripSettings() now re-dates all TRIP_DAYS entries from new start date; initApp() also re-dates on reload from saved tripSettings
- Session 3: Fixed mobile bottom nav button bunching — added @media (max-width: 380px) rule to shrink nav buttons on very small screens
- Session 3: Combined Schedule + Stops into single "Planner" tab — bottom nav now has 4 tabs (Today, Planner, Journal, School); Planner tab has a segmented Days/Stops toggle at top; _smSeg() function controls visibility

---

## Key Decisions
- Single self-contained HTML files (no separate CSS/JS files) for simplicity and portability
- Multiple mockup versions kept for reference rather than deleted
- Mobile-first design with desktop enhancements
- Leaflet chosen for mapping (open source, no API key required)

---

## Known Issues / In Progress
- Multiple mockup versions exist — needs consolidation decision (which is canonical?)
- `saveTripSettings()` re-dates TRIP_DAYS in memory only; custom trip (AI-built) trips have their own date logic via `customTripData` — date change behavior for custom trips not yet tested
- rv-app.zip contents unknown — may be redundant

---

## Suggested Next Steps
- Decide which HTML file is the primary/canonical app going forward
- Clean up or archive older mockup versions
- Add more trip data / stops to the planner
- Push latest index.html to GitHub → auto-deploys to Netlify (run: git add index.html PROJECT_CONTEXT.md && git commit -m "..." && git push)
- Test the new Planner tab (Days/Stops toggle) on mobile
- Consider adding a map view as a third segment in the Planner tab
