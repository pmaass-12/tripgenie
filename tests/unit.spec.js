/**
 * Unit tests — pure functions tested via page.evaluate()
 *
 * Calls window globals directly in a real browser context (no mocking needed).
 * All 25 groups are tagged @unit.
 *
 * Run:  npm run test:unit
 */

const { test, expect } = require('@playwright/test');

// All unit tests share ONE page load — dramatically faster than reloading per test.
test.describe('Unit — pure functions @unit', () => {
  /** @type {import('@playwright/test').Page} */
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    // Wait for critical globals to be defined before any test runs
    await page.waitForFunction(
      () => typeof window._sha256 === 'function' && typeof window.TRIP_STOPS !== 'undefined',
      { timeout: 15_000 }
    );
  });

  test.afterAll(async () => { await page.close(); });

  // ═══════════════════════════════════════════════════════════════════
  // 1. _sha256 — async crypto hash
  // ═══════════════════════════════════════════════════════════════════
  test.describe('_sha256', () => {

    test('returns the correct SHA-256 hex digest for "hello"', async () => {
      const hash = await page.evaluate(() => _sha256('hello'));
      expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    test('returns a Promise', async () => {
      const isPromise = await page.evaluate(() => _sha256('test') instanceof Promise);
      expect(isPromise).toBe(true);
    });

    test('different inputs produce different hashes', async () => {
      const [h1, h2] = await page.evaluate(() =>
        Promise.all([_sha256('hello'), _sha256('world')])
      );
      expect(h1).not.toBe(h2);
    });

    test('same input always produces the same hash (deterministic)', async () => {
      const [h1, h2] = await page.evaluate(() =>
        Promise.all([_sha256('consistent-input'), _sha256('consistent-input')])
      );
      expect(h1).toBe(h2);
    });

    test('empty string returns known SHA-256 value', async () => {
      const hash = await page.evaluate(() => _sha256(''));
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    test('result is always a 64-character lowercase hex string', async () => {
      const hash = await page.evaluate(() => _sha256('any string here'));
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 2. _escHtml — HTML entity escaping
  // ═══════════════════════════════════════════════════════════════════
  test.describe('_escHtml', () => {

    test('escapes < and > angle brackets', async () => {
      const result = await page.evaluate(() => _escHtml('<b>bold</b>'));
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).not.toContain('<b>');
    });

    test('escapes ampersand &', async () => {
      const result = await page.evaluate(() => _escHtml('cats & dogs'));
      expect(result).toContain('&amp;');
      expect(result).not.toContain(' & ');
    });

    test('escapes double quotes', async () => {
      const result = await page.evaluate(() => _escHtml('say "hello"'));
      expect(result).not.toMatch(/"hello"/);
    });

    test('returns empty string unchanged', async () => {
      const result = await page.evaluate(() => _escHtml(''));
      expect(result).toBe('');
    });

    test('returns plain text unchanged', async () => {
      const result = await page.evaluate(() => _escHtml('Hello World 123'));
      expect(result).toBe('Hello World 123');
    });

    test('neutralises a complete XSS payload', async () => {
      const result = await page.evaluate(() => _escHtml('<script>alert(1)</script>'));
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script');
    });

    test('handles null/undefined without throwing', async () => {
      const result = await page.evaluate(() => {
        try { return typeof _escHtml(null); } catch(e) { return 'threw'; }
      });
      expect(result).not.toBe('threw');
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 3. formatDate — date string → human-readable label
  // ═══════════════════════════════════════════════════════════════════
  test.describe('formatDate', () => {

    test('formats a standard date to a readable locale string', async () => {
      const result = await page.evaluate(() => formatDate('2026-03-01'));
      expect(result).toMatch(/Mar/);
      expect(result).toMatch(/1/);
    });

    test('formats the trip start date (Feb 28)', async () => {
      const result = await page.evaluate(() => formatDate('2026-02-28'));
      expect(result).toMatch(/Feb/);
      expect(result).toMatch(/28/);
    });

    test('formats the trip end date (Apr 14)', async () => {
      const result = await page.evaluate(() => formatDate('2026-04-14'));
      expect(result).toMatch(/Apr/);
      expect(result).toMatch(/14/);
    });

    test('always returns a non-empty string', async () => {
      const result = await page.evaluate(() => formatDate('2026-06-15'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(3);
    });

    test('includes a weekday abbreviation', async () => {
      // 2026-03-09 is a Monday
      const result = await page.evaluate(() => formatDate('2026-03-09'));
      expect(result).toMatch(/Mon/);
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 4. isSpringBreak — date range check
  // ═══════════════════════════════════════════════════════════════════
  test.describe('isSpringBreak', () => {

    test('returns true for the first day of spring break (Mar 30)', async () => {
      const result = await page.evaluate(() => isSpringBreak('2026-03-30'));
      expect(result).toBe(true);
    });

    test('returns true for the last day of spring break (Apr 3)', async () => {
      const result = await page.evaluate(() => isSpringBreak('2026-04-03'));
      expect(result).toBe(true);
    });

    test('returns true for a mid-spring-break date (Apr 1)', async () => {
      const result = await page.evaluate(() => isSpringBreak('2026-04-01'));
      expect(result).toBe(true);
    });

    test('returns false for the day before spring break (Mar 29)', async () => {
      const result = await page.evaluate(() => isSpringBreak('2026-03-29'));
      expect(result).toBe(false);
    });

    test('returns false for the day after spring break (Apr 4)', async () => {
      const result = await page.evaluate(() => isSpringBreak('2026-04-04'));
      expect(result).toBe(false);
    });

    test('returns false for an empty string', async () => {
      const result = await page.evaluate(() => isSpringBreak(''));
      expect(result).toBe(false);
    });

    test('returns false for a completely unrelated date', async () => {
      const result = await page.evaluate(() => isSpringBreak('2026-01-15'));
      expect(result).toBe(false);
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 5. tripDay / tripIsLive / pct — live trip progress
  // ═══════════════════════════════════════════════════════════════════
  test.describe('tripDay / tripIsLive / pct', () => {

    test('tripDay returns a number', async () => {
      const result = await page.evaluate(() => typeof tripDay());
      expect(result).toBe('number');
    });

    test('tripDay is clamped to [1, CONFIG.totalDays]', async () => {
      const { day, totalDays } = await page.evaluate(() => ({
        day: tripDay(),
        totalDays: CONFIG.totalDays,
      }));
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(totalDays);
    });

    test('tripIsLive returns a boolean', async () => {
      const result = await page.evaluate(() => typeof tripIsLive());
      expect(result).toBe('boolean');
    });

    test('tripIsLive returns true — trip started Feb 28 2026, today is Mar 10', async () => {
      // This test is date-sensitive: passes as long as we are between Feb 28 and trip end
      const result = await page.evaluate(() => tripIsLive());
      expect(result).toBe(true);
    });

    test('pct returns an integer 0–100', async () => {
      const result = await page.evaluate(() => pct());
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    test('pct is > 0 when trip is live', async () => {
      const [isLive, progress] = await page.evaluate(() => [tripIsLive(), pct()]);
      if (isLive) {
        expect(progress).toBeGreaterThan(0);
      }
    });

    test('pct formula: round(tripDay / CONFIG.totalDays * 100)', async () => {
      const { calculated, fromFn } = await page.evaluate(() => ({
        calculated: Math.round((tripDay() / CONFIG.totalDays) * 100),
        fromFn: pct(),
      }));
      expect(fromFn).toBe(calculated);
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 6. totalMilesDriven
  // ═══════════════════════════════════════════════════════════════════
  test.describe('totalMilesDriven', () => {

    test('returns a positive number', async () => {
      const result = await page.evaluate(() => totalMilesDriven());
      expect(result).toBeGreaterThan(0);
    });

    test('equals the manual sum of all TRIP_DAYS.miles', async () => {
      const { fn, manual } = await page.evaluate(() => ({
        fn: totalMilesDriven(),
        manual: TRIP_DAYS.reduce((s, d) => s + d.miles, 0),
      }));
      expect(fn).toBe(manual);
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 7. getStop / getDay
  // ═══════════════════════════════════════════════════════════════════
  test.describe('getStop / getDay', () => {

    test('getStop returns the matching stop for a valid ID', async () => {
      const result = await page.evaluate(() => {
        const first = TRIP_STOPS[0];
        const found = getStop(first.id);
        return { id: found && found.id, expected: first.id };
      });
      expect(result.id).toBe(result.expected);
    });

    test('getStop returns null for an unknown ID', async () => {
      const result = await page.evaluate(() => getStop('nonexistent-stop-xyz-99'));
      expect(result).toBeNull();
    });

    test('getStop returns null for empty string', async () => {
      const result = await page.evaluate(() => getStop(''));
      expect(result).toBeNull();
    });

    test('getStop returns null for null', async () => {
      const result = await page.evaluate(() => getStop(null));
      expect(result).toBeNull();
    });

    test('getDay returns the correct day entry', async () => {
      const result = await page.evaluate(() => {
        const d = getDay(1);
        return d ? d.day : null;
      });
      expect(result).toBe(1);
    });

    test('getDay returns undefined for a non-existent day', async () => {
      const result = await page.evaluate(() => getDay(9999));
      expect(result).toBeUndefined();
    });

    test('getDay returns undefined for day 0', async () => {
      const result = await page.evaluate(() => getDay(0));
      expect(result).toBeUndefined();
    });

    test('getDay returns undefined for negative day', async () => {
      const result = await page.evaluate(() => getDay(-1));
      expect(result).toBeUndefined();
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 8. getDayState / getDayDriver
  // ═══════════════════════════════════════════════════════════════════
  test.describe('getDayState / getDayDriver', () => {

    test('getDayState returns an object', async () => {
      const result = await page.evaluate(() => {
        window.appState = window.appState || {};
        window.appState.days = window.appState.days || {};
        return typeof getDayState(1);
      });
      expect(result).toBe('object');
    });

    test('getDayState returns empty object for a day with no saved state', async () => {
      const result = await page.evaluate(() => {
        const saved = window.appState.days;
        window.appState.days = {};
        const out = getDayState(999);
        window.appState.days = saved;
        return out;
      });
      expect(result).toEqual({});
    });

    test('getDayState returns saved state for a day that has one', async () => {
      const result = await page.evaluate(() => {
        window.appState.days = window.appState.days || {};
        window.appState.days[42] = { notes: 'test-note', sleep: 'Walmart' };
        return getDayState(42);
      });
      expect(result.notes).toBe('test-note');
      expect(result.sleep).toBe('Walmart');
    });

    test('getDayDriver returns a string', async () => {
      const result = await page.evaluate(() => typeof getDayDriver(1));
      expect(result).toBe('string');
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 9. sleepIcon
  // ═══════════════════════════════════════════════════════════════════
  test.describe('sleepIcon', () => {

    test('rv_park → fa-campground icon', async () => {
      const result = await page.evaluate(() => sleepIcon('rv_park'));
      expect(result).toContain('fa-campground');
    });

    test('walmart → fa-store icon', async () => {
      const result = await page.evaluate(() => sleepIcon('walmart'));
      expect(result).toContain('fa-store');
    });

    test('home → fa-house icon', async () => {
      const result = await page.evaluate(() => sleepIcon('home'));
      expect(result).toContain('fa-house');
    });

    test('campground → fa-tree icon', async () => {
      const result = await page.evaluate(() => sleepIcon('campground'));
      expect(result).toContain('fa-tree');
    });

    test('unknown type → fa-bed fallback', async () => {
      const result = await page.evaluate(() => sleepIcon('glamping-yurt'));
      expect(result).toContain('fa-bed');
    });

    test('empty string → fa-bed fallback', async () => {
      const result = await page.evaluate(() => sleepIcon(''));
      expect(result).toContain('fa-bed');
    });

    test('undefined → fa-bed fallback', async () => {
      const result = await page.evaluate(() => sleepIcon(undefined));
      expect(result).toContain('fa-bed');
    });

    test('all results are valid Font Awesome <i> strings', async () => {
      const results = await page.evaluate(() =>
        ['rv_park', 'walmart', 'home', 'campground', 'other'].map(sleepIcon)
      );
      results.forEach(r => {
        expect(typeof r).toBe('string');
        expect(r).toContain('<i class="fa-solid');
        expect(r).toContain('</i>');
      });
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 10. _normState — state abbreviation normalisation
  // ═══════════════════════════════════════════════════════════════════
  test.describe('_normState', () => {

    test('returns empty string for null', async () => {
      const result = await page.evaluate(() => _normState(null));
      expect(result).toBe('');
    });

    test('returns empty string for undefined', async () => {
      const result = await page.evaluate(() => _normState(undefined));
      expect(result).toBe('');
    });

    test('uppercases a 2-char abbreviation', async () => {
      const result = await page.evaluate(() => _normState('ny'));
      expect(result).toBe('NY');
    });

    test('maps "New York" (full name) to "NY"', async () => {
      const result = await page.evaluate(() => _normState('New York'));
      expect(result).toBe('NY');
    });

    test('maps "Texas" to "TX"', async () => {
      const result = await page.evaluate(() => _normState('Texas'));
      expect(result).toBe('TX');
    });

    test('trims leading/trailing whitespace', async () => {
      const result = await page.evaluate(() => _normState('  CA  '));
      expect(result).toBe('CA');
    });

    test('already-abbreviated 3-char state is uppercased', async () => {
      const result = await page.evaluate(() => _normState('dcx'));
      // <= 3 chars → uppercase as-is
      expect(result).toBe('DCX');
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 11. _sn — stop name with state suffix
  // ═══════════════════════════════════════════════════════════════════
  test.describe('_sn', () => {

    test('returns empty string for null', async () => {
      const result = await page.evaluate(() => _sn(null));
      expect(result).toBe('');
    });

    test('returns stop name for stop with no state info', async () => {
      const result = await page.evaluate(() => _sn({ name: 'Yellowstone' }));
      expect(result).toContain('Yellowstone');
    });

    test('does not duplicate state when already in stop name', async () => {
      const result = await page.evaluate(() => _sn({ name: 'Nashville, TN', state: 'TN' }));
      const count = (result.match(/TN/g) || []).length;
      expect(count).toBe(1);
    });

    test('appends state abbreviation when not already present', async () => {
      const result = await page.evaluate(() => _sn({ name: 'Denver', state: 'Colorado' }));
      expect(result).toContain('CO');
    });

    test('returns a string', async () => {
      const result = await page.evaluate(() => typeof _sn({ name: 'Miami', state: 'FL' }));
      expect(result).toBe('string');
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 12. _makeCloudSafeState — strip large dataUrls before cloud save
  // ═══════════════════════════════════════════════════════════════════
  test.describe('_makeCloudSafeState', () => {

    test('sets dataUrl to null in photoPool', async () => {
      const result = await page.evaluate(() => {
        const state = { photoPool: [{ id: 'p1', dataUrl: 'data:image/jpeg;base64,BIGSTRING', thumb: 'data:thumb' }] };
        return _makeCloudSafeState(state);
      });
      expect(result.photoPool[0].dataUrl).toBeNull();
    });

    test('preserves thumb in photoPool', async () => {
      const result = await page.evaluate(() => {
        const state = { photoPool: [{ id: 'p1', dataUrl: 'data:img', thumb: 'data:thumb123' }] };
        return _makeCloudSafeState(state);
      });
      expect(result.photoPool[0].thumb).toBe('data:thumb123');
    });

    test('preserves photo metadata (id, caption, dayNum)', async () => {
      const result = await page.evaluate(() => {
        const state = { photoPool: [{ id: 'abc', dataUrl: 'data:x', caption: 'My photo', dayNum: 5 }] };
        return _makeCloudSafeState(state);
      });
      expect(result.photoPool[0].id).toBe('abc');
      expect(result.photoPool[0].caption).toBe('My photo');
      expect(result.photoPool[0].dayNum).toBe(5);
    });

    test('does NOT mutate the original state object', async () => {
      const originalDataUrl = await page.evaluate(() => {
        const state = { photoPool: [{ id: 'p1', dataUrl: 'data:KEEP_ME' }] };
        _makeCloudSafeState(state);
        return state.photoPool[0].dataUrl;
      });
      expect(originalDataUrl).toBe('data:KEEP_ME');
    });

    test('handles empty photoPool array', async () => {
      const result = await page.evaluate(() => _makeCloudSafeState({ photoPool: [] }));
      expect(result.photoPool).toEqual([]);
    });

    test('handles state with no photoPool key', async () => {
      const result = await page.evaluate(() => _makeCloudSafeState({ someKey: 'someValue' }));
      expect(result.someKey).toBe('someValue');
    });

    test('strips dataUrl from all photos (not just first)', async () => {
      const result = await page.evaluate(() => {
        const state = {
          photoPool: [
            { id: 'p1', dataUrl: 'data:img1' },
            { id: 'p2', dataUrl: 'data:img2' },
            { id: 'p3', dataUrl: null },
          ]
        };
        return _makeCloudSafeState(state);
      });
      expect(result.photoPool).toHaveLength(3);
      result.photoPool.forEach(p => expect(p.dataUrl).toBeNull());
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 13. _smartMergeStates — merge local + cloud state without data loss
  // ═══════════════════════════════════════════════════════════════════
  test.describe('_smartMergeStates', () => {

    test('uses cloud scalar values when cloud is newer', async () => {
      const result = await page.evaluate(() => {
        const local = { _savedAt: '2026-03-01T10:00:00Z', notes: 'old', photoPool: [] };
        const cloud = { _savedAt: '2026-03-01T11:00:00Z', notes: 'new', photoPool: [] };
        return _smartMergeStates(local, cloud);
      });
      expect(result.notes).toBe('new');
    });

    test('restores local dataUrl into cloud-stripped photo entry', async () => {
      const merged = await page.evaluate(() => {
        const local = {
          _savedAt: '2026-03-01T10:00:00Z',
          photoPool: [{ id: 'p1', dataUrl: 'data:local-fullres', thumb: 't1' }],
        };
        const cloud = {
          _savedAt: '2026-03-01T11:00:00Z',
          photoPool: [
            { id: 'p1', dataUrl: null, thumb: 't1' },
            { id: 'p2', dataUrl: null, thumb: 't2' },
          ],
        };
        return _smartMergeStates(local, cloud);
      });
      const p1 = merged.photoPool.find(p => p.id === 'p1');
      expect(p1.dataUrl).toBe('data:local-fullres');
    });

    test('includes cloud-only photos not present locally', async () => {
      const merged = await page.evaluate(() => {
        const local = {
          _savedAt: '2026-03-01T10:00:00Z',
          photoPool: [],
        };
        const cloud = {
          _savedAt: '2026-03-01T11:00:00Z',
          photoPool: [{ id: 'cloud-only', dataUrl: null }],
        };
        return _smartMergeStates(local, cloud);
      });
      expect(merged.photoPool.find(p => p.id === 'cloud-only')).toBeTruthy();
    });

    test('includes local-only photos not present in cloud', async () => {
      const merged = await page.evaluate(() => {
        const local = {
          _savedAt: '2026-03-01T09:00:00Z',
          photoPool: [{ id: 'local-only', dataUrl: 'data:x' }],
        };
        const cloud = { _savedAt: '2026-03-01T11:00:00Z', photoPool: [] };
        return _smartMergeStates(local, cloud);
      });
      expect(merged.photoPool.find(p => p.id === 'local-only')).toBeTruthy();
    });

    test('handles both states having null _savedAt without throwing', async () => {
      const result = await page.evaluate(() => {
        try {
          const r = _smartMergeStates({ _savedAt: null, photoPool: [] }, { _savedAt: null, photoPool: [] });
          return r !== null;
        } catch(e) { return false; }
      });
      expect(result).toBe(true);
    });

    test('returns an object with a photoPool array', async () => {
      const result = await page.evaluate(() => {
        const r = _smartMergeStates(
          { _savedAt: '2026-01-01T00:00:00Z', photoPool: [] },
          { _savedAt: '2026-01-02T00:00:00Z', photoPool: [] }
        );
        return Array.isArray(r.photoPool);
      });
      expect(result).toBe(true);
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 14. saveState / loadState — localStorage persistence
  // ═══════════════════════════════════════════════════════════════════
  test.describe('saveState / loadState', () => {

    test('saveState writes state to localStorage', async () => {
      const stored = await page.evaluate(() => {
        window._isViewer = false;
        window._sbUser = null;
        window._currentTripId = null;
        const state = { testMarker: 'unit-test-value' };
        saveState(state);
        const raw = localStorage.getItem('rv_state');
        return raw ? JSON.parse(raw) : null;
      });
      expect(stored).not.toBeNull();
      expect(stored.testMarker).toBe('unit-test-value');
    });

    test('saveState stamps a _savedAt ISO timestamp', async () => {
      const savedAt = await page.evaluate(() => {
        window._isViewer = false;
        window._sbUser = null;
        window._currentTripId = null;
        saveState({});
        const raw = localStorage.getItem('rv_state');
        return raw ? JSON.parse(raw)._savedAt : null;
      });
      expect(savedAt).not.toBeNull();
      expect(isNaN(new Date(savedAt))).toBe(false);
    });

    test('saveState in viewer mode does NOT write the new state', async () => {
      const afterRaw = await page.evaluate(() => {
        window._isViewer = true;
        saveState({ shouldNotAppear: true });
        window._isViewer = false;
        return localStorage.getItem('rv_state');
      });
      if (afterRaw) {
        const after = JSON.parse(afterRaw);
        expect(after.shouldNotAppear).toBeUndefined();
      }
    });

    test('loadState reads back what saveState wrote', async () => {
      const result = await page.evaluate(() => {
        window._isViewer = false;
        window._sbUser = null;
        window._currentTripId = null;
        const state = { loadTestKey: 'load-me-123' };
        saveState(state);
        const loaded = loadState();
        return loaded ? loaded.loadTestKey : null;
      });
      expect(result).toBe('load-me-123');
    });

    test('loadState returns null when localStorage key is absent', async () => {
      const result = await page.evaluate(() => {
        localStorage.removeItem('rv_state');
        return loadState();
      });
      expect(result).toBeNull();
    });

    test('loadState handles corrupted JSON without throwing', async () => {
      const result = await page.evaluate(() => {
        localStorage.setItem('rv_state', 'not!!valid-json');
        try { return loadState() === null ? 'null' : 'value'; } catch(e) { return 'threw'; }
      });
      expect(result).not.toBe('threw');
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 15. _getVoterId — voter identity (Supabase uid or localStorage uuid)
  // ═══════════════════════════════════════════════════════════════════
  test.describe('_getVoterId', () => {

    test('returns _sbUser.id when a user is authenticated', async () => {
      const id = await page.evaluate(() => {
        window._sbUser = { id: 'supabase-uuid-5678' };
        const result = _getVoterId();
        window._sbUser = null;
        return result;
      });
      expect(id).toBe('supabase-uuid-5678');
    });

    test('falls back to localStorage when _sbUser is null', async () => {
      const id = await page.evaluate(() => {
        window._sbUser = null;
        localStorage.removeItem('rv_voter_id');
        return _getVoterId();
      });
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(8);
    });

    test('returns the same ID on repeated calls (no _sbUser)', async () => {
      const [id1, id2] = await page.evaluate(() => {
        window._sbUser = null;
        return [_getVoterId(), _getVoterId()];
      });
      expect(id1).toBe(id2);
    });

    test('persists the generated ID to localStorage', async () => {
      await page.evaluate(() => {
        window._sbUser = null;
        localStorage.removeItem('rv_voter_id');
        _getVoterId();
      });
      const stored = await page.evaluate(() => localStorage.getItem('rv_voter_id'));
      expect(stored).not.toBeNull();
      expect(stored.length).toBeGreaterThan(8);
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 16. _initSbClient — Supabase JS client singleton
  // ═══════════════════════════════════════════════════════════════════
  test.describe('_initSbClient', () => {

    test('returns a non-null client when supabase-js CDN is loaded', async () => {
      const result = await page.evaluate(() => {
        window._sbClient = null;
        return _initSbClient() !== null;
      });
      expect(result).toBe(true);
    });

    test('returns the same client instance on repeated calls (singleton)', async () => {
      const same = await page.evaluate(() => {
        window._sbClient = null;
        const c1 = _initSbClient();
        const c2 = _initSbClient();
        return c1 === c2;
      });
      expect(same).toBe(true);
    });

    test('client exposes an auth object', async () => {
      const hasAuth = await page.evaluate(() => {
        window._sbClient = null;
        const c = _initSbClient();
        return c !== null && typeof c.auth === 'object';
      });
      expect(hasAuth).toBe(true);
    });

    test('client exposes auth.getSession function', async () => {
      const hasFn = await page.evaluate(() => {
        window._sbClient = null;
        const c = _initSbClient();
        return c !== null && typeof c.auth.getSession === 'function';
      });
      expect(hasFn).toBe(true);
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 17. _saveLocalBackup — 3-slot localStorage rotation
  // ═══════════════════════════════════════════════════════════════════
  test.describe('_saveLocalBackup', () => {

    test('writes state to rv_backup_1 when no Supabase user', async () => {
      const result = await page.evaluate(() => {
        window._sbUser = null;
        window._currentTripId = null;
        localStorage.removeItem('rv_backup_1');
        _saveLocalBackup({ backupTest: true });
        const raw = localStorage.getItem('rv_backup_1');
        return raw ? JSON.parse(raw) : null;
      });
      expect(result).not.toBeNull();
      expect(result.state.backupTest).toBe(true);
    });

    test('backup_1 is promoted to backup_2 on second save', async () => {
      const backup2 = await page.evaluate(() => {
        window._sbUser = null;
        window._currentTripId = null;
        localStorage.removeItem('rv_backup_1');
        localStorage.removeItem('rv_backup_2');
        _saveLocalBackup({ slot: 'first' });
        _saveLocalBackup({ slot: 'second' });
        const raw = localStorage.getItem('rv_backup_2');
        return raw ? JSON.parse(raw) : null;
      });
      expect(backup2).not.toBeNull();
      expect(backup2.state.slot).toBe('first');
    });

    test('3-slot rotation: oldest ends up in backup_3', async () => {
      const backup3 = await page.evaluate(() => {
        window._sbUser = null;
        window._currentTripId = null;
        ['rv_backup_1', 'rv_backup_2', 'rv_backup_3'].forEach(k => localStorage.removeItem(k));
        _saveLocalBackup({ slot: 'first' });
        _saveLocalBackup({ slot: 'second' });
        _saveLocalBackup({ slot: 'third' });
        const raw = localStorage.getItem('rv_backup_3');
        return raw ? JSON.parse(raw) : null;
      });
      expect(backup3).not.toBeNull();
      expect(backup3.state.slot).toBe('first');
    });

    test('backup includes a ts (ISO timestamp)', async () => {
      const ts = await page.evaluate(() => {
        window._sbUser = null;
        window._currentTripId = null;
        localStorage.removeItem('rv_backup_1');
        _saveLocalBackup({ sample: true });
        const raw = localStorage.getItem('rv_backup_1');
        return raw ? JSON.parse(raw).ts : null;
      });
      expect(ts).not.toBeNull();
      expect(isNaN(new Date(ts))).toBe(false);
    });

    test('skips localStorage when Supabase user is logged in', async () => {
      const stored = await page.evaluate(() => {
        window._sbUser = { id: 'real-user' };
        window._currentTripId = 'real-trip';
        localStorage.removeItem('rv_backup_1');
        _saveLocalBackup({ cloudUser: true });
        const result = localStorage.getItem('rv_backup_1');
        window._sbUser = null;
        window._currentTripId = null;
        return result;
      });
      // Cloud path was taken — localStorage backup should NOT be written
      expect(stored).toBeNull();
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 18. showToast / _showLoginError — UI notifications
  // ═══════════════════════════════════════════════════════════════════
  test.describe('showToast', () => {

    test('sets message text in #toast element', async () => {
      await page.evaluate(() => showToast('Unit test: hello toast', 500));
      const text = await page.locator('#toast').textContent();
      expect(text).toContain('Unit test: hello toast');
    });

    test('toast is visible (not hidden) after call', async () => {
      await page.evaluate(() => showToast('Visibility check toast', 500));
      const visible = await page.evaluate(() => {
        const t = document.getElementById('toast');
        return t && !t.classList.contains('hidden') &&
               t.textContent.includes('Visibility check toast');
      });
      expect(visible).toBe(true);
    });

    test('toast accepts text with emoji', async () => {
      await page.evaluate(() => showToast('✅ Saved successfully', 500));
      const text = await page.locator('#toast').textContent();
      expect(text).toContain('Saved successfully');
    });

  });

  test.describe('_showLoginError', () => {

    test('sets error message in #login-error', async () => {
      await page.evaluate(() => _showLoginError('Test error 123'));
      const text = await page.evaluate(() => {
        const el = document.getElementById('login-error');
        return el ? el.textContent : '';
      });
      expect(text).toBe('Test error 123');
    });

    test('accepts success-style message (no restriction on content)', async () => {
      await page.evaluate(() => _showLoginError('✅ Check your email!'));
      const text = await page.evaluate(() =>
        (document.getElementById('login-error') || {}).textContent || ''
      );
      expect(text).toContain('Check your email');
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 19. _toggleShowPassword
  // ═══════════════════════════════════════════════════════════════════
  test.describe('_toggleShowPassword', () => {

    test('toggles #password-input type from password → text → password', async () => {
      const types = await page.evaluate(() => {
        const input = document.getElementById('password-input');
        if (!input) return null;
        // Ensure we start at 'password'
        input.type = 'password';
        const before = input.type;
        _toggleShowPassword();
        const middle = input.type;
        _toggleShowPassword(); // reset
        const after = input.type;
        return { before, middle, after };
      });
      if (types !== null) {
        expect(types.before).toBe('password');
        expect(types.middle).toBe('text');
        expect(types.after).toBe('password');
      }
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 20. _doSetNewPassword — validation (no real Supabase call needed)
  // ═══════════════════════════════════════════════════════════════════
  test.describe('_doSetNewPassword validation', () => {

    test.beforeEach(async () => {
      // Ensure the reset overlay is visible so form elements exist
      await page.evaluate(() => _showPasswordResetForm());
    });

    test('rejects password shorter than 6 characters', async () => {
      await page.evaluate(() => {
        document.getElementById('reset-password-input').value = '12345';
        document.getElementById('reset-password-confirm').value = '12345';
      });
      await page.evaluate(() => _doSetNewPassword());
      await page.waitForTimeout(150);
      const err = await page.evaluate(() =>
        document.getElementById('reset-password-error').textContent
      );
      expect(err).toContain('6');
    });

    test('rejects mismatched passwords', async () => {
      await page.evaluate(() => {
        document.getElementById('reset-password-input').value = 'validPass1';
        document.getElementById('reset-password-confirm').value = 'validPass2';
      });
      await page.evaluate(() => _doSetNewPassword());
      await page.waitForTimeout(150);
      const err = await page.evaluate(() =>
        document.getElementById('reset-password-error').textContent
      );
      expect(err).toMatch(/match/i);
    });

    test('rejects empty password', async () => {
      await page.evaluate(() => {
        document.getElementById('reset-password-input').value = '';
        document.getElementById('reset-password-confirm').value = '';
      });
      await page.evaluate(() => _doSetNewPassword());
      await page.waitForTimeout(150);
      const err = await page.evaluate(() =>
        document.getElementById('reset-password-error').textContent
      );
      expect(err.length).toBeGreaterThan(0);
    });

    test('shows "Saving…" before validation passes', async () => {
      // Give it a valid password — it will show Saving… before the session check
      await page.evaluate(() => {
        document.getElementById('reset-password-input').value = 'ValidPass1!';
        document.getElementById('reset-password-confirm').value = 'ValidPass1!';
      });
      // Kick off the async function (don't await — it polls for _sbUser)
      await page.evaluate(() => _doSetNewPassword());
      await page.waitForTimeout(50);
      const err = await page.evaluate(() =>
        document.getElementById('reset-password-error').textContent
      );
      // Could show "Saving…" or an expired-link error — either is correct
      expect(err).toBeTruthy();
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 21. _showPasswordResetForm
  // ═══════════════════════════════════════════════════════════════════
  test.describe('_showPasswordResetForm', () => {

    test('removes hidden class from #password-reset-overlay', async () => {
      await page.evaluate(() => {
        const ov = document.getElementById('password-reset-overlay');
        if (ov) { ov.classList.add('hidden'); ov.style.display = 'none'; }
        _showPasswordResetForm();
      });
      const visible = await page.evaluate(() => {
        const ov = document.getElementById('password-reset-overlay');
        return ov && !ov.classList.contains('hidden');
      });
      expect(visible).toBe(true);
    });

    test('sets display to "flex"', async () => {
      await page.evaluate(() => _showPasswordResetForm());
      const display = await page.evaluate(() => {
        const ov = document.getElementById('password-reset-overlay');
        return ov ? ov.style.display : '';
      });
      expect(display).toBe('flex');
    });

    test('#reset-password-input exists and is visible after call', async () => {
      await page.evaluate(() => _showPasswordResetForm());
      await expect(page.locator('#reset-password-input')).toBeVisible();
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 22. CONFIG / TRIP_STOPS / TRIP_DAYS — data integrity
  // ═══════════════════════════════════════════════════════════════════
  test.describe('CONFIG / TRIP_STOPS / TRIP_DAYS data integrity', () => {

    test('CONFIG.startDate is a valid YYYY-MM-DD string', async () => {
      const result = await page.evaluate(() => CONFIG.startDate);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(isNaN(new Date(result))).toBe(false);
    });

    test('CONFIG.totalDays is a positive integer', async () => {
      const result = await page.evaluate(() => CONFIG.totalDays);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThan(0);
    });

    test('TRIP_STOPS is a non-empty array', async () => {
      const result = await page.evaluate(() => TRIP_STOPS.length);
      expect(result).toBeGreaterThan(0);
    });

    test('all TRIP_STOPS have id and name', async () => {
      const invalid = await page.evaluate(() =>
        TRIP_STOPS.filter(s => !s.id || !s.name)
      );
      expect(invalid).toHaveLength(0);
    });

    test('TRIP_STOPS ids are unique', async () => {
      const hasDupes = await page.evaluate(() => {
        const ids = TRIP_STOPS.map(s => s.id);
        return ids.length !== new Set(ids).size;
      });
      expect(hasDupes).toBe(false);
    });

    test('TRIP_DAYS is a non-empty array', async () => {
      const result = await page.evaluate(() => TRIP_DAYS.length);
      expect(result).toBeGreaterThan(0);
    });

    test('all TRIP_DAYS have a day number and a date', async () => {
      const invalid = await page.evaluate(() =>
        TRIP_DAYS.filter(d => !d.day || !d.date)
      );
      expect(invalid).toHaveLength(0);
    });

    test('TRIP_DAYS are sequential starting from day 1', async () => {
      const valid = await page.evaluate(() => {
        const sorted = [...TRIP_DAYS].sort((a, b) => a.day - b.day);
        return sorted.every((d, i) => d.day === i + 1);
      });
      expect(valid).toBe(true);
    });

    test('TRIP_DAYS count matches CONFIG.totalDays', async () => {
      const match = await page.evaluate(() => TRIP_DAYS.length === CONFIG.totalDays);
      expect(match).toBe(true);
    });

    test('all TRIP_DAYS have non-negative miles', async () => {
      const valid = await page.evaluate(() =>
        TRIP_DAYS.every(d => typeof d.miles === 'number' && d.miles >= 0)
      );
      expect(valid).toBe(true);
    });

    test('all TRIP_DAYS dates are valid date strings', async () => {
      const invalid = await page.evaluate(() =>
        TRIP_DAYS.filter(d => isNaN(new Date(d.date)))
      );
      expect(invalid).toHaveLength(0);
    });

    test('TRIP_DAYS dates are in ascending order', async () => {
      const valid = await page.evaluate(() => {
        const sorted = [...TRIP_DAYS].sort((a, b) => a.day - b.day);
        return sorted.every((d, i, arr) => {
          if (i === 0) return true;
          return d.date >= arr[i - 1].date;
        });
      });
      expect(valid).toBe(true);
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 23. IndexedDB helpers
  // ═══════════════════════════════════════════════════════════════════
  test.describe('IndexedDB helpers (_idbOpen, _idbSave, _idbGet, _idbDelete)', () => {

    test('_idbOpen calls back with a non-null database handle', async () => {
      const hasDb = await page.evaluate(() =>
        new Promise(resolve => _idbOpen(db => resolve(db !== null)))
      );
      expect(hasDb).toBe(true);
    });

    test('_idbSave + _idbGet round-trips a data URL', async () => {
      const retrieved = await page.evaluate(() =>
        new Promise(resolve => {
          const id = 'unit-test-idb-' + Date.now();
          _idbSave(id, 'data:image/jpeg;base64,TESTPAYLOAD', () =>
            _idbGet(id, url => resolve(url))
          );
        })
      );
      expect(retrieved).toBe('data:image/jpeg;base64,TESTPAYLOAD');
    });

    test('_idbGet returns null for a non-existent ID', async () => {
      const result = await page.evaluate(() =>
        new Promise(resolve => _idbGet('definitely-does-not-exist-xyz99', url => resolve(url)))
      );
      expect(result).toBeNull();
    });

    test('_idbDelete removes an entry (get returns null after delete)', async () => {
      const result = await page.evaluate(() =>
        new Promise(resolve => {
          const id = 'delete-test-' + Date.now();
          _idbSave(id, 'data:to-delete', () =>
            _idbDelete(id, () =>
              _idbGet(id, url => resolve(url))
            )
          );
        })
      );
      expect(result).toBeNull();
    });

    test('_idbSave overwrites an existing entry', async () => {
      const result = await page.evaluate(() =>
        new Promise(resolve => {
          const id = 'overwrite-' + Date.now();
          _idbSave(id, 'data:original', () =>
            _idbSave(id, 'data:updated', () =>
              _idbGet(id, url => resolve(url))
            )
          );
        })
      );
      expect(result).toBe('data:updated');
    });

    test('_idbDelete on a non-existent ID does not throw', async () => {
      const result = await page.evaluate(() =>
        new Promise(resolve => {
          try {
            _idbDelete('never-existed', () => resolve('ok'));
          } catch(e) {
            resolve('threw: ' + e.message);
          }
        })
      );
      expect(result).toBe('ok');
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 24. _copyGalleryLinkFallback
  // ═══════════════════════════════════════════════════════════════════
  test.describe('_copyGalleryLinkFallback', () => {

    test('does not throw for a valid URL', async () => {
      const result = await page.evaluate(() => {
        try { _copyGalleryLinkFallback('https://example.com/test'); return 'ok'; }
        catch(e) { return 'threw: ' + e.message; }
      });
      expect(result).toBe('ok');
    });

    test('does not throw for empty string', async () => {
      const result = await page.evaluate(() => {
        try { _copyGalleryLinkFallback(''); return 'ok'; }
        catch(e) { return 'threw: ' + e.message; }
      });
      expect(result).toBe('ok');
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // 25. _saveSession / _tryAutoLogin — legacy auth path
  // ═══════════════════════════════════════════════════════════════════
  test.describe('_saveSession / _tryAutoLogin', () => {

    test('_saveSession writes mode and userName to localStorage', async () => {
      await page.evaluate(() => _saveSession('family', 'TestUser'));
      const session = await page.evaluate(() => {
        const raw = localStorage.getItem('rv_session');
        return raw ? JSON.parse(raw) : null;
      });
      expect(session).not.toBeNull();
      expect(session.mode).toBe('family');
      expect(session.name).toBe('TestUser');
    });

    test('_saveSession stamps a timestamp', async () => {
      await page.evaluate(() => _saveSession('viewer', 'Guest'));
      const ts = await page.evaluate(() => {
        const raw = localStorage.getItem('rv_session');
        return raw ? JSON.parse(raw).ts : null;
      });
      expect(ts).toBeTruthy();
      expect(ts).toBeGreaterThan(0);
    });

    test('_tryAutoLogin runs without throwing when no session exists', async () => {
      const result = await page.evaluate(() => {
        localStorage.removeItem('rv_session');
        try { _tryAutoLogin(); return 'ok'; } catch(e) { return 'threw: ' + e.message; }
      });
      expect(result).toBe('ok');
    });

    test('_tryAutoLogin runs without throwing when a session exists', async () => {
      const result = await page.evaluate(() => {
        localStorage.setItem('rv_session', JSON.stringify({
          mode: 'family', name: 'AutoUser', ts: Date.now()
        }));
        try { _tryAutoLogin(); return 'ok'; } catch(e) { return 'threw: ' + e.message; }
      });
      expect(result).toBe('ok');
    });

    test('_tryAutoLogin handles malformed session gracefully', async () => {
      const result = await page.evaluate(() => {
        localStorage.setItem('rv_session', 'not-json!');
        try { _tryAutoLogin(); return 'ok'; } catch(e) { return 'threw'; }
      });
      expect(result).toBe('ok');
    });

  });

});
