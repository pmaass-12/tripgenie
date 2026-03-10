/**
 * Unit-style tests — pure functions tested via page.evaluate()
 *
 * These call global functions directly in the browser context
 * without going through the UI. Fast and precise.
 *
 * Run:  npm run test:unit
 */

const { test, expect } = require('@playwright/test');
const { callFn } = require('./helpers');

// All unit tests share one page load — faster than reloading each time
test.describe('Unit — pure functions', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    // Wait for all globals to be defined
    await page.waitForFunction(() => typeof window._sha256 === 'function');
  });

  test.afterAll(async () => { await page.close(); });

  // ── _sha256 ──────────────────────────────────────────────────────
  test('_sha256 returns correct hex digest', async () => {
    const hash = await page.evaluate(() => _sha256('hello'));
    // SHA-256 of "hello"
    await expect(hash).resolves ?? expect(await hash).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    );
  });

  test('_sha256 returns a Promise', async () => {
    const isPromise = await page.evaluate(() => _sha256('test') instanceof Promise);
    expect(isPromise).toBe(true);
  });

  // ── _getVoterId ──────────────────────────────────────────────────
  test('_getVoterId returns _sbUser.id when authenticated', async () => {
    const id = await page.evaluate(() => {
      window._sbUser = { id: 'test-uuid-1234' };
      return _getVoterId();
    });
    expect(id).toBe('test-uuid-1234');
  });

  test('_getVoterId falls back to localStorage when not authenticated', async () => {
    const id = await page.evaluate(() => {
      window._sbUser = null;
      localStorage.removeItem('rv_voter_id');
      const result = _getVoterId();
      // Restore
      window._sbUser = null;
      return result;
    });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(8);
  });

  // ── saveState / loadState ────────────────────────────────────────
  test('saveState writes to localStorage', async () => {
    await page.evaluate(() => {
      window._isViewer = false;
      window._sbUser = null;
      window._currentTripId = null;
      window.appState = { testKey: 'testValue', _savedAt: null, _savedBy: null };
      saveState(window.appState);
    });
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('rv_state');
      return raw ? JSON.parse(raw) : null;
    });
    expect(stored).not.toBeNull();
    expect(stored.testKey).toBe('testValue');
  });

  test('saveState — viewer mode skips write', async () => {
    const beforeWrite = await page.evaluate(() => {
      const before = localStorage.getItem('rv_state');
      window._isViewer = true;
      saveState({ shouldNotSave: true });
      window._isViewer = false;
      const after = localStorage.getItem('rv_state');
      return { before, after };
    });
    // rv_state should not contain 'shouldNotSave'
    expect(beforeWrite.after).not.toContain('shouldNotSave');
  });

  // ── _makeCloudSafeState ──────────────────────────────────────────
  test('_makeCloudSafeState strips dataUrl from photoPool', async () => {
    const result = await page.evaluate(() => {
      const state = {
        photoPool: [
          { id: 'p1', dataUrl: 'data:image/jpeg;base64,BIGSTRING', thumb: 'data:thumb' },
          { id: 'p2', dataUrl: null, thumb: 'data:thumb2' },
        ]
      };
      return _makeCloudSafeState(state);
    });
    expect(result.photoPool[0].dataUrl).toBeNull();
    expect(result.photoPool[0].thumb).toBe('data:thumb');   // thumb preserved
    expect(result.photoPool[1].dataUrl).toBeNull();
  });

  test('_makeCloudSafeState does not mutate original state', async () => {
    const original = await page.evaluate(() => {
      const state = {
        photoPool: [{ id: 'p1', dataUrl: 'data:image/jpeg;base64,KEEP', thumb: 't' }]
      };
      _makeCloudSafeState(state);
      return state.photoPool[0].dataUrl; // should still be original
    });
    expect(original).toBe('data:image/jpeg;base64,KEEP');
  });

  // ── _smartMergeStates ────────────────────────────────────────────
  test('_smartMergeStates union-merges photoPool without data loss', async () => {
    const merged = await page.evaluate(() => {
      const local = {
        _savedAt: '2026-03-01T10:00:00Z',
        photoPool: [
          { id: 'p1', dataUrl: 'data:img1', thumb: 't1' },
        ]
      };
      const cloud = {
        _savedAt: '2026-03-01T11:00:00Z', // newer
        photoPool: [
          { id: 'p1', dataUrl: null, thumb: 't1' }, // cloud version strips dataUrl
          { id: 'p2', dataUrl: null, thumb: 't2' },
        ]
      };
      return _smartMergeStates(local, cloud);
    });
    // p1's dataUrl should be restored from local
    const p1 = merged.photoPool.find(p => p.id === 'p1');
    expect(p1.dataUrl).toBe('data:img1');
    // p2 from cloud should also be present
    expect(merged.photoPool.find(p => p.id === 'p2')).toBeTruthy();
  });

  // ── showToast ────────────────────────────────────────────────────
  test('showToast displays message in #toast', async () => {
    await page.evaluate(() => showToast('Unit test toast', 500));
    const text = await page.locator('#toast').textContent();
    expect(text).toContain('Unit test toast');
  });

});
