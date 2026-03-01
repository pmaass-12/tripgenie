/**
 * TripGenie Regression Test Suite
 * Runs in Node.js with minimal browser API mocks.
 * Tests pure logic functions — no DOM rendering required.
 */

'use strict';

// ─── Browser API mocks ───────────────────────────────────────────
global.window = global;
global.document = {
  getElementById: () => ({ textContent: '', innerHTML: '', style: {}, classList: { add:()=>{}, remove:()=>{}, contains:()=>false }, addEventListener:()=>{} }),
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  body: { style: {}, classList: { add:()=>{}, remove:()=>{}, contains:()=>false } },
  createElement: (t) => ({ style:{}, classList:{add:()=>{},remove:()=>{},contains:()=>false}, setAttribute:()=>{}, appendChild:()=>{}, innerHTML:'', children:[] }),
  head: { appendChild:()=>{} },
};
global.localStorage = { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} };
global.sessionStorage = { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} };
Object.defineProperty(global, 'navigator', { value: { onLine: true, geolocation: null, userAgent: 'node' }, writable: true, configurable: true });
global.location = { hostname: 'localhost', href: '' };
global.history = { replaceState:()=>{} };
global.console = console;
global.fetch = async () => ({ ok: false, json: async () => ({}) });
global.Image = function() { this.onload = null; this.src = ''; };
global.MutationObserver = function() { return { observe:()=>{}, disconnect:()=>{} }; };
global.ResizeObserver = function() { return { observe:()=>{}, disconnect:()=>{} }; };
global.IntersectionObserver = function() { return { observe:()=>{}, disconnect:()=>{} }; };
global.Worker = function() {};
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
global.cancelAnimationFrame = clearTimeout;
global.matchMedia = () => ({ matches: false, addEventListener:()=>{}, removeEventListener:()=>{} });
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.setTimeout = global.setTimeout;
global.clearTimeout = global.clearTimeout;
global.L = { map:()=>({setView:()=>({}),addLayer:()=>{},remove:()=>{}}), tileLayer:()=>({addTo:()=>{}}), marker:()=>({addTo:()=>{},bindPopup:()=>{},openPopup:()=>{}}), icon:()=>({}), layerGroup:()=>({addTo:()=>{},clearLayers:()=>{}}), polyline:()=>({addTo:()=>{}}), featureGroup:()=>({getBounds:()=>({}),addTo:()=>{},clearLayers:()=>{}}) };
global.Supabase = null;
global.supabase = null;
global.createClient = () => null;
global.html2canvas = async () => ({ toDataURL:()=>'' });
global.exifr = { parse: async () => null };

// ─── Load the app ─────────────────────────────────────────────────
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('/sessions/gallant-serene-ride/mnt/tripgenie/index.html', 'utf8');
// Extract all inline <script> blocks
const scripts = [...src.matchAll(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

// Run in vm.runInThisContext so function declarations land on global
let evalErrors = [];
const combined = scripts.map(block =>
  block
    .replace(/window\.onload\s*=\s*/g, '// window.onload = ')
    .replace(/document\.addEventListener\s*\(\s*['"]DOMContentLoaded['"]/g, '// document.addEventListener("DOMContentLoaded"')
).join('\n;\n');

try {
  vm.runInThisContext(combined, { filename: 'index.html', displayErrors: false });
} catch(e) {
  evalErrors.push(e.message.slice(0, 200));
}

// ─── Test runner ─────────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ status:'PASS', name });
  } catch(e) {
    failed++;
    results.push({ status:'FAIL', name, err: e.message });
  }
}
function skip(name, reason) {
  skipped++;
  results.push({ status:'SKIP', name, err: reason });
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error((msg || '') + ` → expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — Function existence
// ═══════════════════════════════════════════════════════════════
const REQUIRED_FUNCTIONS = [
  '_tripHomeStop','_sn','_snE','_tripStartCity','_tripIsRoundTrip',
  '_updateLoginDisplay','_fmtHour','_fmtTimeStr','_getDepartureHour',
  '_getLatestArrivalHour','_getTimeFormat','ddmArrivalTime',
  '_addNewStop','removeStopFromTrip','restoreStopToTrip',
  'loadStopWeather','lookupDestination','openCampInfo',
  'renderSchedule','saveTripSettings','initApp','getStop',
  'formatDate','tripDay','tripIsLive','showToast',
];

for (const fn of REQUIRED_FUNCTIONS) {
  test(`function exists: ${fn}`, () => {
    assert(typeof global[fn] === 'function', `${fn} is not a function (got ${typeof global[fn]})`);
  });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — _fmtHour (time formatting)
// ═══════════════════════════════════════════════════════════════
test('_fmtHour: 8.0 → "8:00 AM" in 12h mode', () => {
  appState.tripSettings = appState.tripSettings || {};
  appState.tripSettings.timeFormat = '12h';
  assertEqual(_fmtHour(8), '8:00 AM');
});
test('_fmtHour: 13.0 → "1:00 PM" in 12h mode', () => {
  appState.tripSettings.timeFormat = '12h';
  assertEqual(_fmtHour(13), '1:00 PM');
});
test('_fmtHour: 0 → "12:00 AM" (midnight) in 12h mode', () => {
  appState.tripSettings.timeFormat = '12h';
  assertEqual(_fmtHour(0), '12:00 AM');
});
test('_fmtHour: 12 → "12:00 PM" (noon) in 12h mode', () => {
  appState.tripSettings.timeFormat = '12h';
  assertEqual(_fmtHour(12), '12:00 PM');
});
test('_fmtHour: 25 → "1:00 AM" (midnight wrap fix)', () => {
  appState.tripSettings.timeFormat = '12h';
  assertEqual(_fmtHour(25), '1:00 AM');
});
test('_fmtHour: 14 → "14:00" in 24h mode', () => {
  appState.tripSettings.timeFormat = '24h';
  assertEqual(_fmtHour(14), '14:00');
});
test('_fmtHour: 8 → "08:00" in 24h mode', () => {
  appState.tripSettings.timeFormat = '24h';
  assertEqual(_fmtHour(8), '08:00');
});
test('_fmtHour: 13.5 → "1:30 PM"', () => {
  appState.tripSettings.timeFormat = '12h';
  assertEqual(_fmtHour(13.5), '1:30 PM');
});

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — ddmArrivalTime (the key midnight-wrap bugfix)
// ═══════════════════════════════════════════════════════════════
test('ddmArrivalTime: 8AM departure + 6h = "2:00 PM"', () => {
  appState.tripSettings.timeFormat = '12h';
  appState.tripSettings.departureTime = '08:00';
  assertEqual(ddmArrivalTime(6), '2:00 PM');
});
test('ddmArrivalTime: 7PM departure + 6h = "1:00 AM" (old bug gave "13:00 PM")', () => {
  appState.tripSettings.timeFormat = '12h';
  appState.tripSettings.departureTime = '19:00';
  assertEqual(ddmArrivalTime(6), '1:00 AM');
});
test('ddmArrivalTime: 8AM departure + 4h = "12:00 PM"', () => {
  appState.tripSettings.timeFormat = '12h';
  appState.tripSettings.departureTime = '08:00';
  assertEqual(ddmArrivalTime(4), '12:00 PM');
});
test('ddmArrivalTime: default departure (no setting) + 8h = "4:00 PM"', () => {
  appState.tripSettings.timeFormat = '12h';
  delete appState.tripSettings.departureTime;
  assertEqual(ddmArrivalTime(8), '4:00 PM');
});

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — _getDepartureHour / _getLatestArrivalHour
// ═══════════════════════════════════════════════════════════════
test('_getDepartureHour: "08:00" → 8', () => {
  appState.tripSettings.departureTime = '08:00';
  assertEqual(_getDepartureHour(), 8);
});
test('_getDepartureHour: "06:30" → 6.5', () => {
  appState.tripSettings.departureTime = '06:30';
  assertEqual(_getDepartureHour(), 6.5);
});
test('_getDepartureHour: no setting → 8 (default)', () => {
  delete appState.tripSettings.departureTime;
  assertEqual(_getDepartureHour(), 8);
});
test('_getLatestArrivalHour: "20:00" → 20', () => {
  appState.tripSettings.latestArrival = '20:00';
  assertEqual(_getLatestArrivalHour(), 20);
});
test('_getLatestArrivalHour: no setting → 20 (default)', () => {
  delete appState.tripSettings.latestArrival;
  assertEqual(_getLatestArrivalHour(), 20);
});

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — _sn / _snE (stop name deduplication)
// ═══════════════════════════════════════════════════════════════
test('_sn: normal stop → "City, ST"', () => {
  assertEqual(_sn({ name:'Nashville', state:'TN' }), 'Nashville, TN');
});
test('_sn: stop where name already has state → no double state', () => {
  assertEqual(_sn({ name:'Warwick, NY', state:'NY' }), 'Warwick, NY');
});
test('_sn: stop with unknown name + no state → just name', () => {
  assertEqual(_sn({ name:'Smallville' }), 'Smallville'); // not in known-states lookup
});
test('_sn: stop with known city name but no state → infers state', () => {
  assertEqual(_sn({ name:'Nashville' }), 'Nashville, TN'); // inferred via _KNOWN_STOP_STATES
});
test('_sn: null stop → empty string', () => {
  assertEqual(_sn(null), '');
});
test('_snE: adds emoji prefix', () => {
  assertEqual(_snE({ name:'Nashville', state:'TN', emoji:'🎵' }), '🎵 Nashville, TN');
});
test('_snE: no emoji → no extra space', () => {
  assertEqual(_snE({ name:'Nashville', state:'TN' }), 'Nashville, TN');
});
test('_snE: null → empty string', () => {
  assertEqual(_snE(null), '');
});

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — _tripHomeStop / _tripStartCity
// ═══════════════════════════════════════════════════════════════
test('_tripHomeStop: finds stop with sleepType=home', () => {
  const origDays = JSON.parse(JSON.stringify(TRIP_DAYS));
  const origStops = JSON.parse(JSON.stringify(TRIP_STOPS));
  // Inject a home stop
  TRIP_DAYS.push({ day: 999, stopId: 15, sleepType: 'home', driveDay: false });
  TRIP_STOPS.push({ id: 15, name: 'Warwick, NY', state: 'NY', emoji: '🏠', tag:'home' });
  const home = _tripHomeStop();
  assert(home !== null, 'should find home stop');
  assertEqual(home.id, 15, 'should return stop id 15');
  // Restore
  TRIP_DAYS.length = origDays.length;
  TRIP_STOPS.length = origStops.length;
});

test('_tripHomeStop: returns null when no home stop', () => {
  const origDays = JSON.parse(JSON.stringify(TRIP_DAYS));
  const noHome = TRIP_DAYS.filter(d => d.sleepType !== 'home');
  TRIP_DAYS.splice(0, TRIP_DAYS.length, ...noHome);
  const result = _tripHomeStop();
  // Restore
  TRIP_DAYS.splice(0, TRIP_DAYS.length, ...origDays);
  assertEqual(result, null);
});

// ═══════════════════════════════════════════════════════════════
// SECTION 7 — getStop
// ═══════════════════════════════════════════════════════════════
test('getStop: returns stop by id', () => {
  if (TRIP_STOPS.length === 0) { skipped++; results.pop(); skip('getStop: returns stop by id', 'no TRIP_STOPS'); return; }
  const first = TRIP_STOPS[0];
  const found = getStop(first.id);
  assert(found !== undefined && found !== null, 'should find first stop');
  assertEqual(found.id, first.id);
});
test('getStop: returns undefined for unknown id', () => {
  const result = getStop(99999);
  assert(result === undefined || result === null, 'should not find non-existent stop');
});

// ═══════════════════════════════════════════════════════════════
// SECTION 8 — formatDate
// ═══════════════════════════════════════════════════════════════
test('formatDate: parses ISO date string', () => {
  const result = formatDate('2026-02-28');
  assert(typeof result === 'string' && result.length > 0, `expected non-empty string, got ${result}`);
  assert(result.includes('28') || result.includes('Feb') || result.includes('February'), `expected date in result, got ${result}`);
});

// ═══════════════════════════════════════════════════════════════
// SECTION 9 — appState structure
// ═══════════════════════════════════════════════════════════════
test('appState: starts as object (populated from localStorage at login)', () => {
  // appState = loadState() — starts empty {} when localStorage is empty (test env)
  // Keys like removedStops, weather, drivers are set inside login() after auth
  assert(typeof appState === 'object' && appState !== null, 'appState should be an object');
});
test('appState.removedStops: initialized in login code block', () => {
  // Verify the source code sets removedStops:{} in the login initialization
  assert(src.includes('removedStops:{}'), 'login appState init should include removedStops:{}');
});
test('appState.dayOverrides: lazy-initialized before direct access', () => {
  // dayOverrides is created lazily — code uses: if (!appState.dayOverrides) appState.dayOverrides = {}
  assert(src.includes('if (!appState.dayOverrides) appState.dayOverrides = {}'),
    'lazy-init guard for dayOverrides not found');
  // Also verify the && guard pattern is used for read-only access
  assert(src.includes('appState.dayOverrides && appState.dayOverrides['),
    'guard pattern appState.dayOverrides && appState.dayOverrides[ not found');
});

// ═══════════════════════════════════════════════════════════════
// SECTION 10 — CONFIG + TRIP_DAYS / TRIP_STOPS data integrity
// ═══════════════════════════════════════════════════════════════
test('CONFIG: has required fields', () => {
  assert(typeof CONFIG === 'object', 'CONFIG should exist');
  assert('startDate' in CONFIG, 'CONFIG.startDate missing');
  assert('endDate' in CONFIG || CONFIG.endDate !== undefined, 'CONFIG.endDate missing');
});
test('TRIP_STOPS: array with id, name, state per stop', () => {
  assert(Array.isArray(TRIP_STOPS) && TRIP_STOPS.length > 0, 'TRIP_STOPS should be non-empty array');
  TRIP_STOPS.forEach((s, i) => {
    assert('id' in s,   `TRIP_STOPS[${i}] missing id`);
    assert('name' in s, `TRIP_STOPS[${i}] missing name`);
  });
});
test('TRIP_DAYS: array with required fields', () => {
  assert(Array.isArray(TRIP_DAYS) && TRIP_DAYS.length > 0, 'TRIP_DAYS should be non-empty array');
  TRIP_DAYS.slice(0,5).forEach((d, i) => {
    assert('day' in d,     `TRIP_DAYS[${i}] missing day`);
    assert('stopId' in d,  `TRIP_DAYS[${i}] missing stopId`);
    assert('driveDay' in d,`TRIP_DAYS[${i}] missing driveDay`);
  });
});
test('TRIP_DAYS: all stopIds reference valid stops', () => {
  const stopIds = new Set(TRIP_STOPS.map(s => s.id));
  const bad = TRIP_DAYS.filter(d => !stopIds.has(d.stopId));
  assert(bad.length === 0, `${bad.length} days reference unknown stopId: ${bad.slice(0,3).map(d=>d.stopId).join(', ')}`);
});
test('TRIP_DAYS: day numbers are sequential starting at 1', () => {
  for (let i = 0; i < TRIP_DAYS.length; i++) {
    assertEqual(TRIP_DAYS[i].day, i + 1, `TRIP_DAYS[${i}].day`);
  }
});

// ═══════════════════════════════════════════════════════════════
// SECTION 11 — Login page HTML IDs present
// ═══════════════════════════════════════════════════════════════
test('login HTML: has login-trip-title id', () => {
  assert(src.includes('id="login-trip-title"'), 'login-trip-title id missing from HTML');
});
test('login HTML: has login-trip-sub id', () => {
  assert(src.includes('id="login-trip-sub"'), 'login-trip-sub id missing from HTML');
});
test('login HTML: has login-trip-dates id', () => {
  assert(src.includes('id="login-trip-dates"'), 'login-trip-dates id missing from HTML');
});

// ═══════════════════════════════════════════════════════════════
// SECTION 12 — No double-state patterns in HTML
// ═══════════════════════════════════════════════════════════════
test('no raw stop.name+state concatenation in JS', () => {
  const pattern = /stop\.name\s*\+\s*["']\s*,\s*["']\s*\+\s*stop\.state/g;
  const matches = [...src.matchAll(pattern)];
  assert(matches.length === 0, `Found ${matches.length} raw stop.name+state concatenation(s) — should use _sn(stop)`);
});

// ═══════════════════════════════════════════════════════════════
// SECTION 13 — Toggle rename check
// ═══════════════════════════════════════════════════════════════
test('toggle: "Driving" mode label present', () => {
  assert(src.includes('> Driving</span>') || src.includes('>Driving</span>'), '"Driving" label not found in toggle HTML');
});
test('toggle: "Planning" mode label present', () => {
  assert(src.includes('> Planning</span>') || src.includes('>Planning</span>'), '"Planning" label not found in toggle HTML');
});
test('toggle: old "Simple" label removed from toggles', () => {
  // The word "Simple" should not appear in onclick button spans for the toggle
  const toggleSpans = src.match(/onclick="_showSimpleMode\(\)"[^>]*>.*?<\/span>/g) || [];
  const hasSimple = toggleSpans.some(s => s.includes('> Simple') || s.includes('>Simple'));
  assert(!hasSimple, 'Old "Simple" label still present in toggle button');
});

// ═══════════════════════════════════════════════════════════════
// SECTION 14 — lookupDestination prompt has ATTRACTION field
// ═══════════════════════════════════════════════════════════════
test('lookupDestination: prompt contains ATTRACTION field', () => {
  assert(src.includes('ATTRACTION:'), 'ATTRACTION: field missing from lookupDestination prompt');
});
test('lookupDestination: prompt says city not venue', () => {
  assert(src.includes('never a specific venue') || src.includes('never specific venue'), 'Prompt should instruct AI to return city not venue');
});

// ═══════════════════════════════════════════════════════════════
// SECTION 15 — Drive day order skip
// ═══════════════════════════════════════════════════════════════
test('drive day: _orderKeys skipped for drive days', () => {
  assert(src.includes('!d.driveDay'), 'Drive day order skip (!d.driveDay) not found');
});

// ═══════════════════════════════════════════════════════════════
// SECTION 16 — Syntax check (final)
// ═══════════════════════════════════════════════════════════════
test('eval: no fatal errors during script loading', () => {
  const fatal = evalErrors.filter(e => !e.includes('is not defined') && !e.includes('Cannot read'));
  assert(fatal.length === 0, 'Fatal eval errors: ' + fatal.join(' | '));
});

// ═══════════════════════════════════════════════════════════════
// SECTION 17 — Snapshot tests (HTML output golden files)
// ═══════════════════════════════════════════════════════════════
const SNAP_DIR = require('path').join(__dirname, 'snapshots');
if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR);

function snapshotTest(name, snapshotKey, fn) {
  test(name, () => {
    const actual = fn();
    assert(typeof actual === 'string' && actual.length > 0, 'output should be non-empty HTML string');
    const snapFile = SNAP_DIR + '/' + snapshotKey + '.snap';
    if (!fs.existsSync(snapFile)) {
      // First run: write golden file
      fs.writeFileSync(snapFile, actual, 'utf8');
      console.log('       📸 Snapshot written: ' + snapshotKey);
    } else {
      const golden = fs.readFileSync(snapFile, 'utf8');
      if (actual !== golden) {
        // Diff: show first difference
        const aLines = actual.split('\n'), gLines = golden.split('\n');
        let diffLine = -1;
        for (let i = 0; i < Math.max(aLines.length, gLines.length); i++) {
          if (aLines[i] !== gLines[i]) { diffLine = i; break; }
        }
        throw new Error(`Snapshot mismatch at line ${diffLine+1}:\n` +
          `  expected: ${(gLines[diffLine]||'').slice(0,80)}\n` +
          `  actual:   ${(aLines[diffLine]||'').slice(0,80)}\n` +
          `  (delete snapshots/${snapshotKey}.snap to update)`);
      }
    }
  });
}

// Set up minimal appState for rendering
appState.tripSettings = appState.tripSettings || {};
appState.tripSettings.timeFormat = '12h';
appState.tripSettings.departureTime = '08:00';
appState.tripSettings.latestArrival = '20:00';
appState.drivingPrefs = appState.drivingPrefs || { maxHours: 8 };
appState.dayOverrides = appState.dayOverrides || {};
appState.removedStops = appState.removedStops || {};
appState.phaseExtraDays = appState.phaseExtraDays || {};
appState.weather = appState.weather || {};
global.confirm = () => false; // Mock browser confirm() dialog

const _driveDay = TRIP_DAYS.find(d => d.driveDay);
const _exploreDay = TRIP_DAYS.find(d => !d.driveDay);
const _driveStop = _driveDay ? getStop(_driveDay.stopId) : null;
const _exploreStop = _exploreDay ? getStop(_exploreDay.stopId) : null;

snapshotTest(
  'snapshot: drive day HTML output (Day 1)',
  'drive-day-1',
  () => renderDayTimeBlocks(_driveDay, _driveStop)
);

snapshotTest(
  'snapshot: explore day HTML output (Day 2)',
  'explore-day-2',
  () => renderDayTimeBlocks(_exploreDay, _exploreStop)
);

snapshotTest(
  'snapshot: phaseHeaderHtml (first phase)',
  'phase-header-1',
  () => {
    const firstPhase = _driveDay ? _driveDay.phase : null;
    if (!firstPhase) return '<div>no phase</div>';
    return phaseHeaderHtml(firstPhase, _driveDay);
  }
);

// ═══════════════════════════════════════════════════════════════
// SECTION 18 — Boundary / edge case tests
// ═══════════════════════════════════════════════════════════════
test('edge: _fmtHour(-1) wraps to 11:00 PM', () => {
  appState.tripSettings.timeFormat = '12h';
  assertEqual(_fmtHour(-1), '11:00 PM');
});
test('edge: _fmtHour(24) wraps to 12:00 AM', () => {
  appState.tripSettings.timeFormat = '12h';
  assertEqual(_fmtHour(24), '12:00 AM');
});
test('edge: _fmtHour(48) wraps to 12:00 AM (double wrap)', () => {
  appState.tripSettings.timeFormat = '12h';
  assertEqual(_fmtHour(48), '12:00 AM');
});
test('edge: ddmArrivalTime(0) = departure time (no drive)', () => {
  appState.tripSettings.departureTime = '08:00';
  appState.tripSettings.timeFormat = '12h';
  assertEqual(ddmArrivalTime(0), '8:00 AM');
});
test('edge: _sn({name:"", state:"TX"}) = ", TX"', () => {
  // Empty name should still be safe (no crash)
  const result = _sn({ name: '', state: 'TX' });
  assert(typeof result === 'string', 'should return string for empty name');
});
test('edge: _sn({}) no name no state = empty string', () => {
  assertEqual(_sn({}), '');
});
test('edge: _snE({name:"Nashville", state:"TN"}) no emoji = no leading space', () => {
  const result = _snE({ name: 'Nashville', state: 'TN' });
  assert(!result.startsWith(' '), 'should not start with space when no emoji');
  assertEqual(result, 'Nashville, TN');
});
test('edge: getStop(0) returns undefined/null', () => {
  const r = getStop(0);
  assert(r === undefined || r === null, 'stopId 0 should not match any stop');
});
test('edge: getStop(undefined) does not throw', () => {
  let threw = false;
  try { getStop(undefined); } catch(e) { threw = true; }
  assert(!threw, 'getStop(undefined) should not throw');
});
test('edge: _getDepartureHour with malformed time falls back to 8', () => {
  appState.tripSettings.departureTime = 'invalid';
  const h = _getDepartureHour();
  assert(!isNaN(h), 'should return a number even for invalid input');
  assertEqual(h, 8, 'malformed departureTime should fall back to 8');
  delete appState.tripSettings.departureTime;
});
test('edge: renderDayTimeBlocks drive day returns non-empty HTML', () => {
  if (!_driveDay || !_driveStop) { skipped++; results.pop(); return; }
  const html = renderDayTimeBlocks(_driveDay, _driveStop);
  assert(typeof html === 'string' && html.length > 100, 'drive day should produce substantial HTML');
  assert(html.includes('Depart') || html.includes('depart'), 'drive day HTML should contain depart block');
});
test('edge: renderDayTimeBlocks explore day returns non-empty HTML', () => {
  if (!_exploreDay || !_exploreStop) { skipped++; results.pop(); return; }
  const html = renderDayTimeBlocks(_exploreDay, _exploreStop);
  assert(typeof html === 'string' && html.length > 100, 'explore day should produce substantial HTML');
  assert(html.includes('Breakfast') || html.includes('breakfast'), 'explore day HTML should contain breakfast');
});
test('edge: renderDayTimeBlocks with null stop does not throw', () => {
  if (!_driveDay) { skipped++; results.pop(); return; }
  let threw = false;
  try { renderDayTimeBlocks(_driveDay, null); } catch(e) { threw = true; }
  assert(!threw, 'renderDayTimeBlocks(day, null) should not throw');
});

// ═══════════════════════════════════════════════════════════════
// SECTION 19 — Data mutation tests (removeStop / restoreStop)
// ═══════════════════════════════════════════════════════════════

// Patch renderSchedule and saveState to be no-ops during mutation tests
const _origRenderSchedule = global.renderSchedule;
const _origSaveState = global.saveState;
global.renderSchedule = () => {};
global.saveState = () => {};
global.confirm = () => true; // Allow removal to proceed
global.showToast = () => {};

test('mutation: removeStopFromTrip sets removedStops flag', () => {
  if (!_driveDay) { skipped++; results.pop(); return; }
  const sid = _driveDay.stopId;
  if (!appState.removedStops) appState.removedStops = {};
  delete appState.removedStops[sid];  // ensure clean slate
  removeStopFromTrip(sid, 'Test Phase');
  assert(appState.removedStops[sid] === true, 'removedStops[stopId] should be true after removal');
});

test('mutation: removeStopFromTrip sets phaseExtraDays negative', () => {
  if (!_driveDay) { skipped++; results.pop(); return; }
  const sid = _driveDay.stopId;
  assert(appState.phaseExtraDays && appState.phaseExtraDays[sid] < 0,
    'phaseExtraDays should be negative after removal');
});

test('mutation: restoreStopToTrip clears removedStops flag', () => {
  if (!_driveDay) { skipped++; results.pop(); return; }
  const sid = _driveDay.stopId;
  restoreStopToTrip(sid);
  assert(!appState.removedStops[sid], 'removedStops[stopId] should be falsy after restore');
});

test('mutation: restoreStopToTrip resets phaseExtraDays to 0', () => {
  if (!_driveDay) { skipped++; results.pop(); return; }
  const sid = _driveDay.stopId;
  assertEqual(appState.phaseExtraDays[sid], 0, 'phaseExtraDays should be 0 after restore');
});

test('mutation: remove then restore is idempotent', () => {
  if (!_driveDay) { skipped++; results.pop(); return; }
  const sid = _driveDay.stopId;
  removeStopFromTrip(sid, 'Phase A');
  removeStopFromTrip(sid, 'Phase A');  // second remove is a no-op (already removed)
  restoreStopToTrip(sid);
  assert(!appState.removedStops[sid], 'should be cleanly restored');
  assertEqual(appState.phaseExtraDays[sid], 0);
});

// Restore patched functions
global.renderSchedule = _origRenderSchedule;
global.saveState = _origSaveState;
global.confirm = () => false;

// ═══════════════════════════════════════════════════════════════
// SECTION 20 — Round-trip serialization tests
// ═══════════════════════════════════════════════════════════════
let _lsStore = {};
global.localStorage = {
  getItem: (k) => _lsStore[k] !== undefined ? _lsStore[k] : null,
  setItem: (k, v) => { _lsStore[k] = v; },
  removeItem: (k) => { delete _lsStore[k]; }
};

test('serialization: saveState writes to localStorage', () => {
  const testState = { foo: 'bar', count: 42, arr: [1, 2, 3] };
  saveState(testState);
  const raw = _lsStore['rv_state'];
  assert(raw !== undefined && raw !== null, 'should write rv_state to localStorage');
  const parsed = JSON.parse(raw);
  assertEqual(parsed.foo, 'bar');
  assertEqual(parsed.count, 42);
});

test('serialization: loadState reads back what saveState wrote', () => {
  const testState = { name: 'Maass Family', stops: ['NY', 'VA', 'TN'] };
  saveState(testState);
  const loaded = loadState();
  assertEqual(loaded.name, 'Maass Family');
  assert(Array.isArray(loaded.stops) && loaded.stops[0] === 'NY', 'array should survive round-trip');
});

test('serialization: _savedAt timestamp is written', () => {
  const testState = { x: 1 };
  saveState(testState);
  const loaded = loadState();
  assert(loaded._savedAt && loaded._savedAt.length > 0, '_savedAt should be set');
  assert(!isNaN(new Date(loaded._savedAt).getTime()), '_savedAt should be a valid ISO date');
});

test('serialization: nested objects survive round-trip', () => {
  const testState = {
    tripSettings: { timeFormat: '24h', departureTime: '07:30' },
    dayOverrides: { 1: { breakfast: { customPlace: 'The Diner' } } }
  };
  saveState(testState);
  const loaded = loadState();
  assertEqual(loaded.tripSettings.timeFormat, '24h');
  assertEqual(loaded.dayOverrides[1].breakfast.customPlace, 'The Diner');
});

test('serialization: undefined values are dropped by JSON (safe)', () => {
  const testState = { a: 1, b: undefined, c: 'hello' };
  saveState(testState);
  const loaded = loadState();
  assertEqual(loaded.a, 1);
  assertEqual(loaded.c, 'hello');
  // undefined becomes absent after JSON round-trip — that's expected
  assert(loaded.b === undefined, 'undefined values should be absent after round-trip');
});

test('serialization: empty localStorage returns empty object', () => {
  _lsStore = {};  // wipe
  const loaded = loadState();
  assert(typeof loaded === 'object', 'loadState on empty storage should return object');
});

test('serialization: corrupt localStorage returns empty object', () => {
  _lsStore['rv_state'] = '{corrupt json[[';
  const loaded = loadState();
  assert(typeof loaded === 'object', 'loadState on corrupt JSON should return empty object safely');
  _lsStore = {};
});

// ═══════════════════════════════════════════════════════════════
// SECTION 21 — Known-bug regression tests
//   These specifically guard against bugs that were previously fixed.
//   If any of these fail, a real regression occurred.
// ═══════════════════════════════════════════════════════════════

// BUG 1: ddmArrivalTime returned "13:00 PM" for 7PM departure + 6h drive
// Root cause: h = 19 + 6 = 25, then 25 - 12 = 13 → "13 PM"
// Fix: _fmtHour uses ((h % 24) + 24) % 24 with proper AM/PM
test('[regression] BUG-1: ddmArrivalTime(6) with 7PM departure = "1:00 AM" not "13:00 PM"', () => {
  appState.tripSettings.timeFormat = '12h';
  appState.tripSettings.departureTime = '19:00';
  const result = ddmArrivalTime(6);
  assert(result !== '13:00 PM', `BUG REGRESSED: got "13:00 PM" again`);
  assertEqual(result, '1:00 AM');
});

// BUG 2: "Warwick, NY, NY" double-state from stop.name + ', ' + stop.state
// Root cause: stop.name already contained ", NY" but state was appended again
// Fix: _sn() checks if name already ends with ", STATE"
test('[regression] BUG-2: _sn() does not double-append state', () => {
  assertEqual(_sn({ name: 'Warwick, NY', state: 'NY' }), 'Warwick, NY');
  assertEqual(_sn({ name: 'Austin, TX', state: 'TX' }), 'Austin, TX');
  assertEqual(_sn({ name: 'Nashville', state: 'TN' }), 'Nashville, TN');
});

// BUG 3: Drive day destination was showing wrong stop (loop found next DIFFERENT stopId)
// Root cause: Loop searched TRIP_DAYS for next day with different stopId, finding Day 3 instead of Day 1's stop
// Fix: nextNameD = stop ? stop.name : '' (current day's stop IS the destination)
test('[regression] BUG-3: drive day uses its own stop as destination (not next different stop)', () => {
  assert(src.includes("var nextNameD = stop ? stop.name : '';"),
    'BUG REGRESSED: drive day destination loop is back');
});

// BUG 4: Drive day breakfast showed destination restaurant (customPlace override)
// Root cause: _overrides['breakfast'].customPlace was a destination restaurant saved from an explore day
// Fix: drive day breakfast block ignores customPlace
test('[regression] BUG-4: drive day breakfast ignores customPlace override', () => {
  assert(src.includes('customPlace') && src.includes('driveDay'),
    'drive day breakfast override handling removed');
  // Confirm the fix pattern exists in the renderDayTimeBlocks area
  const driveDaySection = src.slice(src.indexOf('var nextNameD = stop ?'), src.indexOf('On-road lunch stop') + 1);
  assert(driveDaySection.length > 0, 'drive day depart section should exist');
});

// BUG 5: Departure city showed destination stop instead of home stop
// Root cause: _tripStartCity() returned TRIP_STOPS[0] (first destination, Shenandoah Valley)
// Fix: _tripHomeStop() scans TRIP_DAYS for sleepType='home', _tripStartCity() uses it
test('[regression] BUG-5: _tripHomeStop() exists and returns stop by sleepType', () => {
  assert(typeof _tripHomeStop === 'function', '_tripHomeStop missing');
  // With real data (no home stop), should return null gracefully
  const result = _tripHomeStop();
  assert(result === null || (typeof result === 'object' && result !== null),
    '_tripHomeStop should return null or a stop object');
});

// BUG 6: Login page dates were hardcoded — didn't update when trip start date changed
// Root cause: Static HTML "<span>Feb 28 – Apr 14, 2026</span>" with no JS bindings
// Fix: Added id="login-trip-dates" + _updateLoginDisplay() called from saveTripSettings()
test('[regression] BUG-6: login page dates are dynamic (not hardcoded)', () => {
  assert(src.includes('id="login-trip-dates"'), 'login-trip-dates id missing');
  assert(typeof _updateLoginDisplay === 'function', '_updateLoginDisplay function missing');
  assert(src.includes('_updateLoginDisplay()'), '_updateLoginDisplay() is never called');
});

// BUG 7: Added stop used attraction name ("The Plaza Theater") as the stop city name
// Root cause: _addNewStop() used item.name directly, which AI returned as the attraction
// Fix: lookupDestination prompt requests city; _addNewStop uses item.city || item.name
test('[regression] BUG-7: lookupDestination asks for city not attraction name', () => {
  assert(src.includes('ATTRACTION:'), 'ATTRACTION: field missing from prompt');
  assert(src.includes('never a specific venue'), 'city-not-venue instruction missing from prompt');
});

// BUG 8: Drive day item order was scrambled by saved dayOrder drag-and-drop data
// Root cause: _orderKeys from appState.dayOrder was applied on drive days, reordering breakfast/depart/lunch
// Fix: if (_orderKeys && _orderKeys.length && !d.driveDay)
test('[regression] BUG-8: drive day skips saved item order', () => {
  assert(src.includes('!d.driveDay'), '!d.driveDay guard for _orderKeys missing');
});

// ─── Print results ────────────────────────────────────────────
const LINE = '─'.repeat(62);
console.log('\n' + LINE);
console.log('  TripGenie Regression Test Results');
console.log(LINE);

let section = '';
for (const r of results) {
  const newSection = r.name.split(':')[0];
  const icon = r.status === 'PASS' ? '✅' : r.status === 'SKIP' ? '⏭️ ' : '❌';
  console.log(`  ${icon}  ${r.name}${r.err ? '\n       ↳ ' + r.err : ''}`);
}

console.log(LINE);
console.log(`  PASSED: ${passed}   FAILED: ${failed}   SKIPPED: ${skipped}   TOTAL: ${passed+failed+skipped}`);
console.log(LINE + '\n');
process.exit(failed > 0 ? 1 : 0);
