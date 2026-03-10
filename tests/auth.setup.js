/**
 * Auth setup — runs ONCE before the full test suite.
 * Logs in and saves the browser storage state so every other test
 * starts already authenticated without repeating the login flow.
 *
 * playwright.config.js references this as the 'setup' project.
 */

const { test: setup } = require('@playwright/test');
const path = require('path');
const { login } = require('./helpers');

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

setup('authenticate and save session', async ({ page }) => {
  await login(page);

  // Save cookies + localStorage so subsequent tests start logged in
  await page.context().storageState({ path: AUTH_FILE });
});
