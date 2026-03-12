# TripGenie — Maass Family RV Adventure 2026

Personal RV trip planner. Static HTML/CSS/JS, no build step, hosted on Netlify at [maass5.com](https://www.maass5.com).

---

## Testing

### Quick start

```bash
npm install        # install Playwright
npm test           # run the full fast test suite (smoke + unit + regression)
```

### All test commands

| Command | What it does |
|---|---|
| `npm test` | **Full fast suite** — runs smoke, unit, and regression tests (no login required). This is the primary command. Blocks commit via pre-commit hook. |
| `npm run test:watch` | **Watch / interactive mode** — opens Playwright's UI (a browser-based test runner that re-runs affected tests automatically on file save). Best for development. |
| `npm run test:coverage` | **Coverage report** — runs the full fast suite and generates an HTML test-results report plus a terminal summary showing pass/fail counts and which tests cover which behaviors. Run `npm run report` afterward to open the HTML report. |
| `npm run test:smoke` | Smoke tests only (7 fast checks, no auth) |
| `npm run test:unit` | Unit tests only (pure function tests, no auth) |
| `npm run test:regression` | Regression tests only (REG-* checks, no auth) |
| `npm run test:integration` | Integration tests — requires Supabase login (run `npm run test:all` first) |
| `npm run test:e2e` | End-to-end tests — requires Supabase login |
| `npm run test:all` | Everything — all projects including auth-dependent tests |
| `npm run test:ui` | Playwright interactive UI (same as `test:watch`) |
| `npm run test:headed` | Run with visible browser windows |
| `npm run test:debug` | Run with Playwright debugger attached |
| `npm run report` | Open the last HTML test report in your browser |

### Test files

All test files live in `tests/`:

| File | Project | Auth? | Description |
|---|---|---|---|
| `smoke.spec.js` | smoke | ❌ No | 7 fast sanity checks — page loads, key elements present |
| `unit.spec.js` | smoke | ❌ No | 140+ pure-function tests — date math, formatting, calculations |
| `regression.spec.js` | smoke | ❌ No | REG-* checks — every past bug has a regression test |
| `integration.spec.js` | chromium | ✅ Yes | Data flow + Supabase persistence tests |
| `e2e.spec.js` | chromium | ✅ Yes | Full user workflow tests |
| `auth.setup.js` | setup | ✅ Yes | One-time auth setup — runs first, saves session |
| `helpers.js` | — | — | Shared utilities: `login()`, `openTab()`, `callFn()`, `waitForToast()` |

### About `npm run test:coverage`

The coverage report shows **test coverage** (which behaviors are exercised by the test suite), not line-level code coverage. It tells you:
- How many tests passed / failed / skipped
- Which test files ran
- Which REG-* regression checks passed

For true **line-level code coverage** (which JS lines in `index.html` were actually executed), you would need to instrument the JavaScript using Istanbul before serving. This is possible but has not been set up yet — the app has no build step and is a single large HTML file. See `scripts/coverage-summary.js` for the current implementation.

---

## Pre-commit hook

A git pre-commit hook is installed at `.git/hooks/pre-commit`. It runs `npm test` before every commit and **blocks the commit if any test fails**.

**On a fresh clone**, re-install the hook:
```bash
cp scripts/pre-commit.hook .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

To bypass in an emergency (not recommended):
```bash
git commit --no-verify
```

---

## Deployment

```bash
npm run predeploy   # pre-deploy checks (runs scripts/pre-deploy-check.sh)
git push            # Netlify auto-deploys from main branch
```

---

## Project structure

```
tripgenie/
├── index.html          # Main app (~34,000 lines — entire app in one file)
├── tests/              # Playwright test suite
│   ├── smoke.spec.js   # Fast sanity checks
│   ├── unit.spec.js    # Pure function tests
│   ├── regression.spec.js  # REG-* regression tests
│   ├── integration.spec.js # Auth-required integration tests
│   ├── e2e.spec.js     # Auth-required end-to-end tests
│   ├── auth.setup.js   # Auth state setup
│   └── helpers.js      # Shared test utilities
├── scripts/
│   ├── pre-deploy-check.sh   # Pre-deploy validation script
│   ├── pre-commit.hook       # Git hook source (copy to .git/hooks/pre-commit)
│   └── coverage-summary.js  # Test results summary script
├── playwright.config.js  # Playwright configuration
├── package.json          # Scripts + dependencies
├── CLAUDE.md             # Claude session instructions
└── PROJECT_CONTEXT.md    # Current project state (updated before every commit)
```

---

## Tech stack

- **Vanilla JS / HTML / CSS** — no build step, no framework
- **Leaflet.js** — interactive map
- **Font Awesome 6.5** — icons
- **Supabase** — auth + cloud persistence
- **Netlify** — static hosting + CI/CD
- **Playwright** — end-to-end + regression test suite
