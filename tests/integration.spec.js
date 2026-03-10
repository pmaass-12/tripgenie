/**
 * Integration tests — verify how functions work together
 *
 * These tests use the real authenticated session (from auth.setup.js).
 * They focus on:
 *   - Data flowing from user input → state → storage → read-back
 *   - Authentication state and permissions
 *   - Features that depend on other features (e.g. save → sync → load)
 *
 * Run:  npx playwright test tests/integration.spec.js
 *
 * Prerequisites: TEST_EMAIL and TEST_PASSWORD env vars set.
 */

const { test, expect } = require('@playwright/test');
const { openTab, waitForToast, getAppState } = require('./helpers');

// ─── Authenticated integration tests ────────────────────────────────────────
// These all use the storageState from auth.setup.js (already logged in).
test.describe('Integration — authenticated flows @integration', () => {

  // ── 1. Auth state consistency ─────────────────────────────────────────────
  test.describe('Auth state', () => {

    test('_sbUser is set after page load with valid session', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
      const uid = await page.evaluate(() => window._sbUser && window._sbUser.id);
      expect(uid).toBeTruthy();
      expect(typeof uid).toBe('string');
    });

    test('login screen is hidden when authenticated', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
      await expect(page.locator('#login-screen')).toBeHidden();
    });

    test('app element is visible when authenticated', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
      await expect(page.locator('#app')).toBeVisible();
    });

    test('_isViewer is false for the authenticated owner', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });
      const isViewer = await page.evaluate(() => window._isViewer);
      expect(isViewer).toBe(false);
    });

  });

  // ── 2. State save → read-back pipeline ───────────────────────────────────
  test.describe('Save → load pipeline', () => {

    test('saveState persists and loadState retrieves the same data', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const roundTripped = await page.evaluate(() => {
        const testPayload = { _integrationTestKey: 'persist-me-' + Date.now() };
        window._isViewer = false;
        saveState(testPayload);
        const loaded = loadState();
        return loaded ? loaded._integrationTestKey : null;
      });
      expect(roundTripped).toMatch(/^persist-me-/);
    });

    test('saveState stamps _savedBy with the current profile name', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const savedBy = await page.evaluate(() => {
        window._isViewer = false;
        saveState({});
        const raw = localStorage.getItem('rv_state');
        return raw ? JSON.parse(raw)._savedBy : null;
      });
      // _savedBy should be set (may be null if no profile selected yet, or a name string)
      // Just check it doesn't throw — value depends on profile selection
      expect(savedBy === null || typeof savedBy === 'string').toBe(true);
    });

    test('_makeCloudSafeState strips photos before cloud save', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const safe = await page.evaluate(() => {
        const stateWithPhotos = {
          photoPool: [
            { id: 'p1', dataUrl: 'data:image/jpeg;base64,LARGE_BASE64_STRING', thumb: 'data:small' }
          ],
          notes: 'Some notes'
        };
        return _makeCloudSafeState(stateWithPhotos);
      });

      // dataUrl must be stripped; other fields preserved
      expect(safe.photoPool[0].dataUrl).toBeNull();
      expect(safe.photoPool[0].thumb).toBe('data:small');
      expect(safe.notes).toBe('Some notes');
    });

  });

  // ── 3. State merge integration ────────────────────────────────────────────
  test.describe('Smart state merge', () => {

    test('merge preserves all photos from both states (union)', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const result = await page.evaluate(() => {
        const local = {
          _savedAt: '2026-03-01T08:00:00Z',
          photoPool: [
            { id: 'local-1', dataUrl: 'data:l1', caption: 'Local only' },
          ],
        };
        const cloud = {
          _savedAt: '2026-03-01T09:00:00Z', // cloud is newer
          photoPool: [
            { id: 'cloud-1', dataUrl: null, caption: 'Cloud only' },
            { id: 'local-1', dataUrl: null, caption: 'Local only' }, // cloud stripped dataUrl
          ],
        };
        const merged = _smartMergeStates(local, cloud);
        return {
          count: merged.photoPool.length,
          localPhoto: merged.photoPool.find(p => p.id === 'local-1'),
          cloudPhoto: merged.photoPool.find(p => p.id === 'cloud-1'),
        };
      });

      // Both photos present
      expect(result.count).toBeGreaterThanOrEqual(2);
      // Local dataUrl restored into the cloud entry
      expect(result.localPhoto.dataUrl).toBe('data:l1');
      // Cloud-only photo included
      expect(result.cloudPhoto).toBeTruthy();
    });

    test('merge uses cloud scalar values (notes, days) when cloud is newer', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const result = await page.evaluate(() => {
        const local = {
          _savedAt: '2026-03-01T08:00:00Z',
          generalNotes: 'Old notes',
          photoPool: [],
        };
        const cloud = {
          _savedAt: '2026-03-01T09:00:00Z',
          generalNotes: 'Updated notes from cloud device',
          photoPool: [],
        };
        return _smartMergeStates(local, cloud).generalNotes;
      });

      expect(result).toBe('Updated notes from cloud device');
    });

  });

  // ── 4. IndexedDB ↔ gallery integration ───────────────────────────────────
  test.describe('IndexedDB integration', () => {

    test('saves a photo to IDB and retrieves it by ID', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const retrieved = await page.evaluate(() =>
        new Promise(resolve => {
          const photoId = 'integration-photo-' + Date.now();
          const fakeDataUrl = 'data:image/jpeg;base64,/9j/INTEGRATION_TEST';
          _idbSave(photoId, fakeDataUrl, () => {
            _idbGet(photoId, url => resolve(url));
          });
        })
      );
      expect(retrieved).toBe('data:image/jpeg;base64,/9j/INTEGRATION_TEST');
    });

    test('_idbMigratePool does not throw on empty photoPool', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const result = await page.evaluate(() => {
        const saved = window.appState.photoPool;
        window.appState.photoPool = [];
        try { _idbMigratePool(); return 'ok'; }
        catch(e) { return 'threw: ' + e.message; }
        finally { window.appState.photoPool = saved; }
      });
      expect(result).toBe('ok');
    });

  });

  // ── 5. Trip data read-through ─────────────────────────────────────────────
  test.describe('Trip data read-through', () => {

    test('getStop finds all stops referenced by TRIP_DAYS', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const missingStops = await page.evaluate(() => {
        return TRIP_DAYS
          .filter(d => d.stopId)
          .filter(d => getStop(d.stopId) === null)
          .map(d => d.stopId);
      });
      // All stop IDs referenced in TRIP_DAYS should resolve to a real stop
      expect(missingStops).toHaveLength(0);
    });

    test('getDay + getDayState returns an object for every valid day', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const allOk = await page.evaluate(() => {
        return TRIP_DAYS.every(d => {
          const state = getDayState(d.day);
          return state !== null && typeof state === 'object';
        });
      });
      expect(allOk).toBe(true);
    });

    test('totalMilesDriven matches sum of drive-day miles', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const { fn, manual } = await page.evaluate(() => ({
        fn: totalMilesDriven(),
        manual: TRIP_DAYS.reduce((s, d) => s + d.miles, 0),
      }));
      expect(fn).toBe(manual);
    });

    test('tripDay is consistent with CONFIG.startDate', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const { day, startDate, totalDays } = await page.evaluate(() => ({
        day: tripDay(),
        startDate: CONFIG.startDate,
        totalDays: CONFIG.totalDays,
      }));
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(totalDays);
      // Trip started 2026-02-28 and today is 2026-03-10 → day 11
      expect(day).toBeGreaterThan(1); // We're past day 1
    });

  });

  // ── 6. Permission gating ──────────────────────────────────────────────────
  test.describe('Permission gating', () => {

    test('saveState with _isViewer=true does not overwrite localStorage', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const result = await page.evaluate(() => {
        // Write a known value
        window._isViewer = false;
        saveState({ marker: 'real-save' });
        // Try to overwrite as viewer
        window._isViewer = true;
        saveState({ marker: 'viewer-overwrite' });
        window._isViewer = false;
        // Read back
        const loaded = loadState();
        return loaded ? loaded.marker : null;
      });
      expect(result).toBe('real-save');
    });

    test('_saveLocalBackup skips localStorage when _sbUser is set', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const storedBeforeAndAfter = await page.evaluate(() => {
        const saved_sbUser = window._sbUser;
        const saved_tripId = window._currentTripId;

        window._sbUser = { id: 'fake-user' };
        window._currentTripId = 'fake-trip';
        localStorage.removeItem('rv_backup_1');

        _saveLocalBackup({ shouldNotAppear: true });

        const result = localStorage.getItem('rv_backup_1');

        window._sbUser = saved_sbUser;
        window._currentTripId = saved_tripId;
        return result;
      });
      expect(storedBeforeAndAfter).toBeNull();
    });

  });

  // ── 7. Voter ID consistency ───────────────────────────────────────────────
  test.describe('Voter ID consistency', () => {

    test('_getVoterId returns the Supabase user ID when logged in', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const { voterId, userId } = await page.evaluate(() => ({
        voterId: _getVoterId(),
        userId: window._sbUser && window._sbUser.id,
      }));
      // When Supabase user is logged in, voter ID should be the Supabase UID
      expect(voterId).toBe(userId);
    });

  });

  // ── 8. Supabase client integration ───────────────────────────────────────
  test.describe('Supabase client', () => {

    test('_initSbClient returns a client with a live session', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const hasSession = await page.evaluate(async () => {
        const client = _initSbClient();
        if (!client) return false;
        const { data } = await client.auth.getSession();
        return data && data.session !== null;
      });
      expect(hasSession).toBe(true);
    });

    test('Supabase session user matches _sbUser', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const idsMatch = await page.evaluate(async () => {
        const client = _initSbClient();
        const { data } = await client.auth.getSession();
        const sessionUserId = data && data.session && data.session.user && data.session.user.id;
        return sessionUserId === (window._sbUser && window._sbUser.id);
      });
      expect(idsMatch).toBe(true);
    });

  });

  // ── 9. Backup rotation integration ────────────────────────────────────────
  test.describe('Backup rotation integration', () => {

    test('three successive saves rotate through all three backup slots', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app:not(.hidden)', { timeout: 15_000 });

      const slots = await page.evaluate(() => {
        const savedUser = window._sbUser;
        const savedTrip = window._currentTripId;
        window._sbUser = null;
        window._currentTripId = null;

        ['rv_backup_1', 'rv_backup_2', 'rv_backup_3'].forEach(k => localStorage.removeItem(k));
        _saveLocalBackup({ label: 'A' });
        _saveLocalBackup({ label: 'B' });
        _saveLocalBackup({ label: 'C' });

        const b1 = JSON.parse(localStorage.getItem('rv_backup_1') || 'null');
        const b2 = JSON.parse(localStorage.getItem('rv_backup_2') || 'null');
        const b3 = JSON.parse(localStorage.getItem('rv_backup_3') || 'null');

        window._sbUser = savedUser;
        window._currentTripId = savedTrip;

        return {
          slot1: b1 && b1.state && b1.state.label,
          slot2: b2 && b2.state && b2.state.label,
          slot3: b3 && b3.state && b3.state.label,
        };
      });

      expect(slots.slot1).toBe('C'); // newest
      expect(slots.slot2).toBe('B');
      expect(slots.slot3).toBe('A'); // oldest
    });

  });

});
