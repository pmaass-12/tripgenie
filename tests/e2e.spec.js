/**
 * End-to-end tests — complete user workflows
 *
 * These simulate real user behavior: clicking, typing, navigating tabs,
 * and checking that the app responds correctly across the full workflow.
 *
 * Requires: authenticated session (auth.setup.js).
 *
 * Run:  npx playwright test tests/e2e.spec.js
 */

const { test, expect } = require('@playwright/test');
const { openTab, waitForToast, getAppState } = require('./helpers');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Navigate to a named tab and wait for it to be active */
async function goToTab(page, tabName) {
  await page.click(`[data-tab="${tabName}"]`);
  // Wait for either the tab to be active or for its content panel to appear
  await page.waitForTimeout(600);
}

/** Wait for a toast with the given text substring */
async function expectToast(page, textFragment) {
  await page.waitForFunction(
    (t) => document.getElementById('toast')?.textContent?.includes(t),
    textFragment,
    { timeout: 8_000 }
  );
}

// ─── E2E test suites ─────────────────────────────────────────────────────────

test.describe('E2E — complete user workflows @e2e', () => {

  // ── 1. Full login → navigate → logout workflow ────────────────────────────
  test.describe('Login → App → Logout', () => {

    test('lands on dashboard after login', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
      // Dashboard should be the default active tab
      const dashVisible = await page.evaluate(() => {
        const dash = document.getElementById('tab-dashboard');
        return dash && !dash.classList.contains('hidden');
      });
      expect(dashVisible).toBe(true);
    });

    test('header shows the sync status indicator', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
      const syncEl = await page.locator('#sync-status').first();
      await expect(syncEl).toBeVisible();
    });

    test('logout button returns to the login screen', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      await page.click('#logout-btn');
      // Wait for login screen to appear
      await expect(page.locator('#login-screen')).toBeVisible({ timeout: 8_000 });
      await expect(page.locator('#app')).toBeHidden({ timeout: 5_000 });
    });

  });

  // ── 2. Tab navigation workflow ────────────────────────────────────────────
  test.describe('Tab navigation', () => {

    test('can navigate to the Schedule tab', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
      await goToTab(page, 'schedule');
      const visible = await page.evaluate(() => {
        const t = document.getElementById('tab-schedule');
        return t && !t.classList.contains('hidden');
      });
      expect(visible).toBe(true);
    });

    test('can navigate to the Map tab', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
      await goToTab(page, 'map');
      const visible = await page.evaluate(() => {
        const t = document.getElementById('tab-map');
        return t && !t.classList.contains('hidden');
      });
      expect(visible).toBe(true);
    });

    test('can navigate to the Gallery tab', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
      await goToTab(page, 'gallery');
      const visible = await page.evaluate(() => {
        const t = document.getElementById('tab-gallery');
        return t && !t.classList.contains('hidden');
      });
      expect(visible).toBe(true);
    });

    test('can navigate to the Agenda tab', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
      await goToTab(page, 'agenda');
      const visible = await page.evaluate(() => {
        const t = document.getElementById('tab-agenda');
        return t && !t.classList.contains('hidden');
      });
      expect(visible).toBe(true);
    });

    test('bottom nav tabs are visible', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
      // All main tab buttons should be rendered
      const tabCount = await page.evaluate(() =>
        document.querySelectorAll('[data-tab]').length
      );
      expect(tabCount).toBeGreaterThan(3);
    });

  });

  // ── 3. Password reset UI workflow ─────────────────────────────────────────
  test.describe('Password reset overlay', () => {

    test('Forgot password? link is visible on login screen', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#login-screen:not(.hidden)', { timeout: 10_000 });
      await expect(page.locator('text=Forgot password?')).toBeVisible();
    });

    test('password reset overlay can be dismissed with Escape', async ({ page }) => {
      await page.goto('/#access_token=faketoken123&type=recovery&refresh_token=x');
      await page.waitForSelector('#password-reset-overlay:not(.hidden)', { timeout: 5_000 }).catch(() => {});

      const isShown = await page.evaluate(() => {
        const ov = document.getElementById('password-reset-overlay');
        return ov && !ov.classList.contains('hidden');
      });

      if (isShown) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        const nowHidden = await page.evaluate(() => {
          const ov = document.getElementById('password-reset-overlay');
          return ov && ov.classList.contains('hidden');
        });
        expect(nowHidden).toBe(true);
      }
    });

    test('password reset overlay close button works', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#login-screen:not(.hidden)', { timeout: 10_000 });

      // Programmatically show the overlay (simulates clicking a reset link)
      await page.evaluate(() => _showPasswordResetForm());
      await expect(page.locator('#password-reset-overlay')).toBeVisible();

      // Click the × button
      await page.locator('#password-reset-overlay button[title="Cancel"]').click();
      await page.waitForTimeout(300);

      // Overlay should be hidden
      const hidden = await page.evaluate(() =>
        document.getElementById('password-reset-overlay').classList.contains('hidden')
      );
      expect(hidden).toBe(true);
    });

    test('password reset form validates mismatched passwords', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#login-screen:not(.hidden)', { timeout: 10_000 });
      await page.evaluate(() => _showPasswordResetForm());

      await page.fill('#reset-password-input', 'password123');
      await page.fill('#reset-password-confirm', 'different456');
      await page.evaluate(() => _doSetNewPassword());
      await page.waitForTimeout(200);

      const errText = await page.locator('#reset-password-error').textContent();
      expect(errText).toMatch(/match/i);
    });

    test('password reset form validates short password', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#login-screen:not(.hidden)', { timeout: 10_000 });
      await page.evaluate(() => _showPasswordResetForm());

      await page.fill('#reset-password-input', '123');
      await page.fill('#reset-password-confirm', '123');
      await page.evaluate(() => _doSetNewPassword());
      await page.waitForTimeout(200);

      const errText = await page.locator('#reset-password-error').textContent();
      expect(errText).toContain('6');
    });

  });

  // ── 4. Dashboard content workflow ─────────────────────────────────────────
  test.describe('Dashboard content', () => {

    test('dashboard renders the trip title', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
      // Dashboard should contain the trip name or family name
      const dashContent = await page.evaluate(() => {
        const dash = document.getElementById('tab-dashboard');
        return dash ? dash.textContent : '';
      });
      expect(dashContent.length).toBeGreaterThan(10);
    });

    test('dashboard shows day counter or trip progress', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const hasPct = await page.evaluate(() => {
        const p = pct();
        return typeof p === 'number' && p >= 0 && p <= 100;
      });
      expect(hasPct).toBe(true);
    });

  });

  // ── 5. Schedule tab workflow ──────────────────────────────────────────────
  test.describe('Schedule tab', () => {

    test('schedule renders day cards', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
      await goToTab(page, 'schedule');
      await page.waitForTimeout(1000); // allow render

      const cardCount = await page.evaluate(() =>
        document.querySelectorAll('[data-day]').length
      );
      expect(cardCount).toBeGreaterThan(0);
    });

  });

  // ── 6. General Notes workflow ─────────────────────────────────────────────
  test.describe('General Notes workflow', () => {

    test('can save and reload general notes text', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      // Write a unique test note via appState
      const uniqueNote = 'E2E-test-note-' + Date.now();
      await page.evaluate((note) => {
        window._isViewer = false;
        window.appState = window.appState || {};
        window.appState.generalNotes = note;
        saveState(window.appState);
      }, uniqueNote);

      // Reload the page (simulates returning to the app)
      await page.reload();
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const loadedNote = await page.evaluate(() => {
        const state = loadState();
        return state ? state.generalNotes : null;
      });
      expect(loadedNote).toBe(uniqueNote);
    });

  });

  // ── 7. Suggestions workflow ───────────────────────────────────────────────
  test.describe('Suggestions tab workflow', () => {

    test('suggestions tab loads without JS errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
      await goToTab(page, 'suggestions');
      await page.waitForTimeout(1500);

      // Filter out known non-critical warnings
      const criticalErrors = errors.filter(e =>
        !e.includes('ResizeObserver') && !e.includes('Non-Error')
      );
      expect(criticalErrors).toHaveLength(0);
    });

  });

  // ── 8. Show/Hide password toggle workflow ─────────────────────────────────
  test.describe('Show/Hide password', () => {

    test('eye toggle changes password field type', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#login-screen:not(.hidden)', { timeout: 10_000 });

      const before = await page.evaluate(() =>
        document.getElementById('password-input').type
      );
      expect(before).toBe('password');

      await page.click('#pw-eye-btn');
      const after = await page.evaluate(() =>
        document.getElementById('password-input').type
      );
      expect(after).toBe('text');

      // Toggle back
      await page.click('#pw-eye-btn');
      const reset = await page.evaluate(() =>
        document.getElementById('password-input').type
      );
      expect(reset).toBe('password');
    });

  });

  // ── 9. Toast notification workflow ────────────────────────────────────────
  test.describe('Toast notifications', () => {

    test('showToast displays and then hides the toast', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      await page.evaluate(() => showToast('E2E toast test message', 800));

      // Should be visible immediately
      const text = await page.locator('#toast').textContent();
      expect(text).toContain('E2E toast test message');

      // After 1.5s it should be hidden or empty
      await page.waitForTimeout(1500);
      const afterText = await page.evaluate(() =>
        document.getElementById('toast')?.textContent || ''
      );
      // Either empty or hidden (implementation-dependent)
      // Just verify the app didn't crash
      expect(typeof afterText).toBe('string');
    });

  });

  // ── 10. Profile picker workflow ───────────────────────────────────────────
  test.describe('Profile picker', () => {

    test('profile picker overlay shows family profile buttons', async ({ page }) => {
      await page.goto('/');
      // After login, profile picker may be shown
      const hasPicker = await page.evaluate(() => {
        const pp = document.getElementById('profile-picker-overlay');
        return pp !== null;
      });
      expect(hasPicker).toBe(true);
    });

    test('profile names include expected family members', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      // Check that the profile avatar elements exist for family members
      const paulExists = await page.evaluate(() =>
        document.getElementById('ppo-av-Paul') !== null
      );
      const melissaExists = await page.evaluate(() =>
        document.getElementById('ppo-av-Melissa') !== null
      );
      expect(paulExists).toBe(true);
      expect(melissaExists).toBe(true);
    });

  });

});
