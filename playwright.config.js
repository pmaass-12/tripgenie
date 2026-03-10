// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * TripGenie Playwright config
 * Docs: https://playwright.dev/docs/test-configuration
 *
 * Run against live Netlify:  npm test
 * Run against local file:    BASE_URL=file:///path/to/index.html npm test
 */
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,          // 30s per test
  expect: { timeout: 5_000 },
  fullyParallel: false,     // Auth tests share Supabase state — run serially
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['list'], ['json', { outputFile: 'test-results/results.json' }]]
    : [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.BASE_URL || 'https://www.maass5.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // ── Auth state setup ─────────────────────────────────────────────
    // Runs once, logs in, saves auth state to file so other tests reuse it
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },

    // ── No-auth tests: smoke, unit, regression (fast, no login) ─────
    // All three test files run in this project — no auth needed.
    {
      name: 'smoke',
      testMatch: /smoke\.spec\.js|unit\.spec\.js|regression\.spec\.js/,
    },

    // ── Full test suite (reuses saved login state) ───────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json', // logged-in session
      },
      dependencies: ['setup'],
      testIgnore: /smoke\.spec\.js|unit\.spec\.js|regression\.spec\.js|auth\.setup\.js/,
    },

    // ── Mobile (uses same auth state) ────────────────────────────────
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 14'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /smoke\.spec\.js|schedule\.spec\.js/,
    },
  ],
});
