# CLAUDE.md — TripGenie Persistent Instructions

> These instructions apply to every Cowork session on every device.
> Read this file at the start of every session, then read PROJECT_CONTEXT.md.

---

## Session Start Checklist
1. Read `PROJECT_CONTEXT.md` to orient yourself on current project state
2. Acknowledge what you've loaded so the user knows you're up to speed

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

## Project Overview
- **Project:** TripGenie — Maass Family RV Adventure 2026 trip planner
- **Type:** Static HTML/CSS/JS (single-file pages, no build step)
- **Repo:** https://github.com/pmaass-12/tripgenie
- **Stack:** Vanilla JS, Leaflet.js (maps), Font Awesome icons, html2canvas, exifr (EXIF photo reading)

## General Coding Preferences
- Keep everything in single self-contained HTML files where possible
- Use the CSS custom property (variable) system already established in index.html
- Mobile-first, with desktop layouts as an enhancement
- Prefer existing color variables: --orange, --blue, --green, --purple, --red, --gold
