# COWORK PROMPT — Add drive time lookup to departure modal

Read CLAUDE.md, CONTRACTS.md, ARCHITECTURE.md, and PROJECT_CONTEXT.md first.

## What this does

Adds a "🗺 Get Drive Time" button to the existing departure modal
(openDriveTimeModal). When tapped, it calls Gemini to estimate real drive time
for that specific leg — accounting for RV type and route — and fills in the
result. The user can accept it or ignore it. Saves the confirmed time to
dayOverrides so it overrides the stale cached/placeholder value on the
separator bar.

No OSRM, no external routing APIs, no new dependencies.

---

## CHANGE 1 — Add driveHours/miles override to _renderDriveSepA

In `_renderDriveSepA`, the current `_dHours` priority chain is:
  osrmVirtualCache → osrmDriveCache → d.driveHours

Add `dayOverrides` at the TOP of this chain so a user-confirmed value always
wins:

```js
// Add immediately after the _dHours / _dMiles lines:
var _ovDrive = appState.dayOverrides && appState.dayOverrides[d.day];
if (_ovDrive && _ovDrive.driveHours) {
  _dHours = _ovDrive.driveHours;
  if (_ovDrive.miles) _dMiles = _ovDrive.miles;
}
```

Do the same in `_renderVirtualDriveSep` — same pattern, same position after
`_estHours`/`_estMiles` are resolved.

---

## CHANGE 2 — Update _saveDriveTime to also save driveHours/miles

In `_saveDriveTime(dayNum)`, after saving `departTime`, also save any
drive time that was confirmed in the modal:

```js
function _saveDriveTime(dayNum) {
  var sel = document.getElementById('drive-time-sel');
  if (!sel) return;
  var val = sel.value;
  if (!appState.dayOverrides) appState.dayOverrides = {};
  if (!appState.dayOverrides[dayNum]) appState.dayOverrides[dayNum] = {};
  appState.dayOverrides[dayNum].departTime = val;

  /* Save confirmed drive time if user fetched one */
  var _confirmedH = parseFloat(document.getElementById('dtm-confirmed-hours')
    && document.getElementById('dtm-confirmed-hours').value || '');
  var _confirmedM = parseInt(document.getElementById('dtm-confirmed-miles')
    && document.getElementById('dtm-confirmed-miles').value || '0', 10);
  if (_confirmedH > 0) {
    appState.dayOverrides[dayNum].driveHours = _confirmedH;
    if (_confirmedM > 0) appState.dayOverrides[dayNum].miles = _confirmedM;
    /* Also write into osrmVirtualCache so virtual separators on same leg update */
    var _dtmFromId = document.getElementById('dtm-from-id') &&
                     document.getElementById('dtm-from-id').value;
    var _dtmToId   = document.getElementById('dtm-to-id') &&
                     document.getElementById('dtm-to-id').value;
    if (_dtmFromId && _dtmToId) {
      if (!appState.osrmVirtualCache) appState.osrmVirtualCache = {};
      appState.osrmVirtualCache[_dtmFromId + '_' + _dtmToId] =
        { miles: _confirmedM || 0, driveHours: _confirmedH };
    }
  }

  saveState(appState);
  var h = parseInt(val.split(':')[0],10), m = parseInt(val.split(':')[1]||'0',10);
  var ampm = h >= 12 ? 'PM' : 'AM'; h = h%12||12;
  var disp = h + (m ? ':'+String(m).padStart(2,'0') : '') + ' ' + ampm;
  var timeMsg = _confirmedH > 0 ? ' · ' + _confirmedH + 'h drive saved' : '';
  showToast('🕐 Departure set to ' + disp + timeMsg, 2200);
  document.getElementById('drive-time-modal').remove();
  renderSchedule();
}
```

---

## CHANGE 3 — Add drive time lookup section to openDriveTimeModal

In `openDriveTimeModal`, add the following section to the modal HTML
**between** the Departure Time select and the Cancel/Save buttons.

Also add four hidden inputs to carry state through to `_saveDriveTime`:
- `dtm-confirmed-hours` — float, the fetched drive hours
- `dtm-confirmed-miles` — int, the fetched miles
- `dtm-from-id` — origin stop ID string
- `dtm-to-id` — dest stop ID string

Add the hidden inputs right after the modal container div opens:

```js
+ '<input type="hidden" id="dtm-confirmed-hours" value="">'
+ '<input type="hidden" id="dtm-confirmed-miles" value="">'
+ '<input type="hidden" id="dtm-from-id" value="' + (originStopId || '') + '">'
+ '<input type="hidden" id="dtm-to-id" value="' + (destStopId || '') + '">'
```

Add the drive time lookup section between the time select and the buttons:

```js
+ '<div style="margin-bottom:18px;">'
+ '<div style="font-size:.68rem;font-weight:800;text-transform:uppercase;'
+ 'letter-spacing:.08em;color:var(--text-3);margin-bottom:6px;">Drive Time</div>'

/* Show current saved value if any */
+ (function() {
    var _ov = appState.dayOverrides && appState.dayOverrides[dayNum];
    if (_ov && _ov.driveHours) {
      return '<div id="dtm-result" style="font-size:.83rem;color:var(--green);'
        + 'font-weight:700;margin-bottom:8px;">✓ ' + _ov.driveHours + 'h'
        + (_ov.miles ? ' · ' + _ov.miles + ' mi' : '') + ' (saved)</div>';
    }
    return '<div id="dtm-result" style="font-size:.83rem;color:var(--text-3);'
      + 'margin-bottom:8px;">Not set — tap below to look up</div>';
  }())

+ '<button id="dtm-lookup-btn" onclick="event.stopPropagation();_dtmLookup('
+   dayNum + ',\'' + (originStopId||'') + '\',\'' + (destStopId||'') + '\')" '
+ 'style="width:100%;display:flex;align-items:center;justify-content:center;'
+ 'gap:7px;background:var(--blue);color:#fff;border:none;border-radius:9px;'
+ 'padding:9px 16px;font-size:.82rem;font-weight:700;cursor:pointer;'
+ 'font-family:var(--font);">🗺 Get Drive Time</button>'
+ '</div>'
```

---

## CHANGE 4 — Add _dtmLookup function

Add this new function near `openDriveTimeModal` (not inside it):

```js
function _dtmLookup(dayNum, originStopId, destStopId) {
  var btn = document.getElementById('dtm-lookup-btn');
  var result = document.getElementById('dtm-result');
  if (!btn || !result) return;

  var originStop = originStopId ? getStop(originStopId) : null;
  var destStop   = destStopId   ? getStop(destStopId)   : null;
  if (!originStop || !destStop) {
    result.textContent = '⚠️ Could not identify stops';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Looking up…';

  var _rvCtx = (typeof getRVContext === 'function') ? getRVContext() : '';
  var prompt = 'Give me the driving distance and estimated drive time by road '
    + 'from ' + _sn(originStop) + ' to ' + _sn(destStop) + '. '
    + (_rvCtx ? _rvCtx + ' ' : '')
    + 'Reply with ONLY these two lines, no explanation:\n'
    + 'MILES: [number]\n'
    + 'HOURS: [decimal number, e.g. 3.5]';

  fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 60, temperature: 0.1 }
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var text = '';
    try { text = data.candidates[0].content.parts[0].text || ''; } catch(e) {}
    var milesMatch = text.match(/MILES:\s*([\d.]+)/i);
    var hoursMatch = text.match(/HOURS:\s*([\d.]+)/i);
    var miles = milesMatch ? Math.round(parseFloat(milesMatch[1])) : 0;
    var hours = hoursMatch ? Math.round(parseFloat(hoursMatch[1]) * 4) / 4 : 0;

    if (hours > 0) {
      /* Store in hidden inputs so _saveDriveTime picks them up */
      var hEl = document.getElementById('dtm-confirmed-hours');
      var mEl = document.getElementById('dtm-confirmed-miles');
      if (hEl) hEl.value = hours;
      if (mEl) mEl.value = miles;

      result.innerHTML = '<span style="color:var(--green);font-weight:700;">'
        + '✓ ' + hours + 'h drive · ' + miles + ' mi'
        + '</span> <span style="font-size:.7rem;color:var(--text-3);">'
        + '— will save when you tap Save Time</span>';
      btn.innerHTML = '🔄 Re-check';
      btn.disabled = false;
    } else {
      result.textContent = '⚠️ Could not parse response — try again';
      btn.innerHTML = '🗺 Get Drive Time';
      btn.disabled = false;
    }
  })
  .catch(function() {
    result.textContent = '⚠️ Could not reach AI — check connection';
    btn.innerHTML = '🗺 Get Drive Time';
    btn.disabled = false;
  });
}
```

---

## VERIFICATION

1. Open any orange drive separator bar → modal opens.
2. Tap "🗺 Get Drive Time" → spinner shows → result appears within 5 seconds
   showing miles and hours (e.g. "✓ 5.5h drive · 340 mi").
3. Tap "Save Time" → toast confirms time + drive info saved.
4. Schedule re-renders with the correct hours on the separator bar —
   NOT 200mi/4h anymore.
5. Reload the page → the saved drive time persists (it's in dayOverrides
   which is in appState which syncs to Supabase).
6. For a leg where Gemini returns 0 hours (parse failure), show the error
   message — do not crash, do not save garbage to dayOverrides.
7. If drive time was already saved, the modal shows the existing value on open.
8. _renderVirtualDriveSep also respects the saved override (same leg, 
   different separator type).

Do not remove or disable _recalcDriveMiles — keep it for Health Check.
Do not modify any other functions. Surgical changes to the four locations
described above only.
