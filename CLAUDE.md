# CLAUDE.md — TripGenie Persistent Instructions

> These instructions apply to every Cowork session on every device.
> Read this file at the start of every session, then read the files below.

---

## Session Start Checklist
1. Read `CONTRACTS.md` — locked names, signatures, appState fields, DOM IDs
2. Read `ARCHITECTURE.md` — system relationships, known failure modes, gotchas
3. Read `PROJECT_CONTEXT.md` — current state, recent changes, known issues
4. Acknowledge what you've loaded so the user knows you're up to speed

## Session End / Before Every Git Commit
Before running any `git commit`, always:
1. Update `PROJECT_CONTEXT.md` with:
   - **Last updated** date
   - **Recent changes** made this session (what was built/changed and why)
   - **Current file structure** (if anything was added or removed)
   - **Key decisions** made and the reasoning
   - **Known issues / in progress** items
   - **Suggested next steps**
2. Stage `PROJECT_CONTEXT.md` along with the other changed files
3. Then commit everything together

---

## Project Overview
- **Project:** TripGenie — Maass Family RV Adventure 2026 trip planner
- **Type:** Static HTML/CSS/JS (single-file SPA, no build step)
- **Repo:** https://github.com/pmaass-12/tripgenie
- **Stack:** Vanilla JS, Supabase (auth + storage + realtime), Leaflet.js (maps),
  Gemini AI (via Netlify function proxy), Font Awesome icons, html2canvas, exifr

## General Coding Preferences
- Keep everything in single self-contained HTML files where possible
- Use the CSS custom property (variable) system already established in index.html
- Mobile-first, with desktop layouts as an enhancement
- Prefer existing color variables: --orange, --blue, --green, --purple, --red, --gold
- Surgical changes only — never refactor working code as a side effect of a fix
- No new external dependencies without explicit approval

## Before Writing Any Code
1. Confirm the function/field/ID you're touching exists in CONTRACTS.md
2. If touching sync/merge/realtime, re-read ARCHITECTURE.md §1–3 first
3. If touching stop panels (Events/Attractions/Restaurants), re-read ARCHITECTURE.md §4 first
4. If touching drive time display, re-read ARCHITECTURE.md §5 first

## Verification Standard
Before saying a fix is done, you must:
1. Describe the exact failure sequence that caused the bug
2. Confirm the fix addresses the root cause, not just the symptom
3. List the specific steps you took to verify it works
4. Confirm no existing tests fail (`npm test` if applicable)
