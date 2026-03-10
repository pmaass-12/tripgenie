/**
 * Smoke tests — @smoke tag
 * Fast checks that require NO login. Run these after every deploy.
 * These catch broken deploys, missing CDN scripts, and JS errors.
 *
 * Run:  npm run test:smoke
 */

const { test, expect } = require('@playwright/test');

test.describe('Smoke — page loads correctly @smoke', () => {

  test('login screen visible on first load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#login-screen')).toBeVisible();
    await expect(page.locator('#app')).toBeHidden();
  });

  test('supabase-js CDN loads — _initSbClient returns non-null', async ({ page }) => {
    await page.goto('/');
    // If supabase-js is missing, _initSbClient() returns null
    const clientLoaded = await page.evaluate(() => {
      return typeof window.supabase !== 'undefined';
    });
    expect(clientLoaded).toBe(true);
  });

  test('no uncaught JS errors on page load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    await page.waitForTimeout(2000); // let async init settle
    expect(errors).toHaveLength(0);
  });

  test('login form elements exist', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#email-input')).toBeVisible();
    await expect(page.locator('#password-input')).toBeVisible();
    await expect(page.locator('#login-submit-btn')).toBeVisible();
    await expect(page.locator('text=Forgot password?')).toBeVisible();
  });

  test('trip title and dates shown on login screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#login-trip-title')).not.toBeEmpty();
    await expect(page.locator('#login-trip-dates')).not.toBeEmpty();
  });

  test('_redirects — auth callback URL does not 404', async ({ page }) => {
    // Simulate what Supabase redirects to after password reset
    const response = await page.goto('/#access_token=fake&type=recovery');
    // Should load the page (not a Netlify 404)
    expect(response?.status()).not.toBe(404);
    await expect(page.locator('#login-screen')).toBeVisible();
  });

  test('password reset hash shows reset form', async ({ page }) => {
    // Simulate a recovery URL (fake token — just checks UI, not Supabase)
    await page.goto('/#access_token=faketoken123&type=recovery&refresh_token=x');
    await expect(page.locator('#password-reset-overlay')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#reset-password-input')).toBeVisible();
  });

});
