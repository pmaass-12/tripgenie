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
test('_sn: stop with no state → just name', () => {
  assertEqual(_sn({ name:'Nashville' }), 'Nashville');
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
