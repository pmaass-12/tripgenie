/**
 * TripGenie test helpers
 * Shared utilities used across all spec files.
 */

const TEST_EMAIL    = process.env.TEST_EMAIL    || 'pmaass@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';  // set via .env or env var

/**
 * Log into TripGenie and wait for the app to be ready.
 * If a profile picker appears, selects "Paul" automatically.
 */
async function login(page) {
  await page.goto('/');
  await page.waitForSelector('#login-screen:not(.hidden)', { timeout: 10_000 });

  await page.fill('#email-input', TEST_EMAIL);
  await page.fill('#password-input', TEST_PASSWORD);
  await page.click('#login-submit-btn');

  // Handle profile picker if shown
  const profilePicker = page.locator('#profile-picker-overlay').filter({ hasNot: page.locator('.hidden') });
  if (await profilePicker.isVisible({ timeout: 3_000 }).catch(() => false)) {
    // Click the first profile option (Paul)
    await page.locator('.profile-option').first().click();
  }

  // Wait for app to be visible
  await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
}

/**
 * Open a specific tab by name (matches data-tab attribute).
 */
async function openTab(page, tabName) {
  await page.click(`[data-tab="${tabName}"]`);
  await page.waitForSelector(`#tab-${tabName}.active`, { timeout: 5_000 });
}

/**
 * Call a global JS function in the page and return the result.
 * Use for unit-style testing of pure functions.
 *
 * Example:
 *   const hash = await callFn(page, '_sha256', 'hello');
 */
async function callFn(page, fnName, ...args) {
  return page.evaluate(
    ([fn, a]) => window[fn](...a),
    [fnName, args]
  );
}

/**
 * Get appState from the page.
 */
async function getAppState(page) {
  return page.evaluate(() => window.appState);
}

/**
 * Wait for a toast notification containing the given text.
 */
async function waitForToast(page, text) {
  await page.waitForFunction(
    (t) => document.querySelector('#toast')?.textContent?.includes(t),
    text,
    { timeout: 8_000 }
  );
}

module.exports = { login, openTab, callFn, getAppState, waitForToast, TEST_EMAIL, TEST_PASSWORD };
