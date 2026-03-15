# COWORK PROMPT — Fix drive day separators: wrong titles, stale miles, wrong arrival times

Read CLAUDE.md, CONTRACTS.md, ARCHITECTURE.md, and PROJECT_CONTEXT.md first.

Three separate bugs all manifest on the orange drive day separator bars.
Fix all three as a unit — they share the same root cause pattern.

---

## ROOT CAUSE (read before touching anything)

The drive separator system has three functions that look up trip data:
  - `_getDriveDayTitle(d)` — constructs the "Origin → Destination" title
  - `_recalcDriveMiles()` — fetches real road distances from OSRM/Mapbox
  - `_renderDriveSepA()` and `_renderVirtualDriveSep()` — render the bar

When the user has made any trip edits, `appState.customTripData.days` diverges
from the builtin `TRIP_DAYS` array. Two of these functions hardcode `TRIP_DAYS`
instead of using the active days array — producing wrong titles and missed recalcs.
A third has an arithmetic bug in the arrival time calculation.

---

## BUG 1 — _getDriveDayTitle() scans TRIP_DAYS instead of active days

### Symptom
Drive bars show wrong origin city names — e.g. "Yellowstone → Warwick" for a
leg that is actually "Humboldt Redwoods → Winnemucca". This happens because the
backward scan for the previous day looks in TRIP_DAYS by array index, but the
schedule is rendering from customTripData.days which has different content at
the same indices after trip edits.

### Location
Function `_getDriveDayTitle(d)` — two array lookups:
  `var pd = TRIP_DAYS[pi];`   (backward scan for origin)
  `var prev = TRIP_DAYS[bi];` (phase-change scan fallback)

### Fix
At the top of `_getDriveDayTitle`, resolve the active days array:

```js
var _activeDays = (appState && appState.customTripData &&
                   appState.customTripData.days &&
                   appState.customTripData.days.length)
  ? appState.customTripData.days : TRIP_DAYS;
```

Replace both `TRIP_DAYS[pi]` with `_activeDays[pi]`
Replace both `TRIP_DAYS[bi]` with `_activeDays[bi]`

Do not change any other logic in this function.

---

## BUG 2 — _recalcDriveMiles() misses legs where getStop() returns null

### Symptom
Some drive bars permanently show "200 mi · 4h drive" (the hardcoded placeholder
value) even after running "Recalculate Drive Miles". This happens because
`getStop()` only searches builtin `TRIP_STOPS`. Stops added via the trip wizard
exist only in `appState.customTripData.stops` — getStop() returns null for them,
the leg is skipped with `failed++`, and the placeholder stays forever.

### Location
Function `getStop(id)` — searches only `TRIP_STOPS`.

### Fix
Update `getStop()` to fall back to `customTripData.stops`:

```js
function getStop(id) {
  var s = TRIP_STOPS.find(function(s) { return String(s.id) === String(id); });
  if (s) return s;
  // Also search customTripData stops (added via trip wizard or not in builtins)
  var custom = appState && appState.customTripData && appState.customTripData.stops;
  if (custom) return custom.find(function(s) { return String(s.id) === String(id); }) || null;
  return null;
}
```

This is a purely additive change — existing callers that found their stop in
TRIP_STOPS get the same result as before. No other changes needed.

---

## BUG 3 — Arrival time calculation drops departure minutes

### Symptom
Arrival estimates are off by up to 1 hour when departure is set to a non-zero
minute (e.g. 8:30 AM). The code uses `Math.floor(_departM / 60)` which is
always 0 for any minutes value under 60, silently discarding the minutes.

For an 8:30 AM departure + 4h drive, the code calculates:
  `8 + Math.floor(30/60) + 4 = 8 + 0 + 4 = 12` (shows 12–1 PM)
Correct answer: `8 + 0.5 + 4 = 12.5` (should show 12–1 PM but base is 12:30)

### Locations — TWO places with this same bug:
1. `_renderDriveSepA()`:
   `var _arrivalH = _departH + Math.floor(_departM / 60) + _driveH + _sbTotalH;`

2. `_renderVirtualDriveSep()`:
   `var _arrivalH = _departH + Math.floor(_departM / 60) + _estHours;`

### Fix — both locations
Replace `Math.floor(_departM / 60)` with `(_departM / 60)` in both places:

```js
// _renderDriveSepA:
var _arrivalH = _departH + (_departM / 60) + _driveH + _sbTotalH;

// _renderVirtualDriveSep:
var _arrivalH = _departH + (_departM / 60) + _estHours;
```

The `_arrivalLow` / `Math.floor(_arrivalH)` downstream already handles
fractional hours correctly — this is the only change needed.

---

## VERIFICATION — confirm ALL before saying done

**Bug 1:**
- Open the schedule. Every drive bar title must match the actual origin and
  destination for that day — check at least 5 drive bars spanning the middle
  and end of the trip.
- Specifically confirm no bar shows "Yellowstone → Warwick" or any other
  cross-trip nonsense title.
- Confirm the first drive day (day 1) still shows "Warwick → [first stop]".

**Bug 2:**
- Confirm `getStop('yellowstone')` returns the Yellowstone stop object.
- Confirm `getStop(1772297190951)` (Mount Rushmore) returns its stop object.
- If any stops exist in customTripData.stops that are NOT in TRIP_STOPS,
  confirm getStop() finds them by ID.
- After a manual Recalculate Drive Miles (Health Check tab), confirm that no
  drive bar shows exactly "200 mi · 4h drive" for a leg where both endpoints
  have valid lat/lng coordinates.

**Bug 3:**
- With departure time set to 8:30 AM and a 4h drive, arrival should display
  as ~12 PM–1 PM (base 12.5h from midnight = 12:30 PM).
- With departure time set to 8:00 AM (clean hour), arrival calculation is
  unchanged (0/60 = 0 either way).
- Both `_renderDriveSepA` and `_renderVirtualDriveSep` are fixed.

**General:**
- Run the full test suite — no existing tests should fail.
- No render functions other than the two named above are modified.
- `getStop()` change is the ONLY modification to that function.
- `_getDriveDayTitle()` change is limited to the two array references — no
  other logic changes.
