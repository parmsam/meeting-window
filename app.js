'use strict';

// ── Theme ─────────────────────────────────────────────────────────────────────

function isDarkActive() {
  const stored = document.documentElement.dataset.theme;
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function updateThemeBtn() {
  const btn = document.getElementById('theme-btn');
  if (!btn) return;
  const dark = isDarkActive();
  btn.textContent = dark ? '☀' : '☾';
  btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  btn.setAttribute('aria-label', btn.title);
}

function toggleTheme() {
  const next = isDarkActive() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  updateThemeBtn();
}

// ─────────────────────────────────────────────────────────────────────────────

const WORK_START = 8;
const WORK_END = 17;

let cityA = null;
let cityB = null;

// ── Timezone math ─────────────────────────────────────────────────────────────

function getUTCOffsetHours(tz, date) {
  // Compare formatted UTC vs local to get exact offset (handles DST + fractional offsets)
  const fmt = (timeZone) => new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(date);

  const toUTCMs = (parts) => {
    const v = (type) => +parts.find(p => p.type === type).value;
    return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'));
  };

  return (toUTCMs(fmt(tz)) - toUTCMs(fmt('UTC'))) / 3600000;
}

function localHourToUTC(refDate, hour, tz) {
  // Get today's calendar date in the target timezone
  const dp = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(refDate);
  const year  = +dp.find(p => p.type === 'year').value;
  const month = +dp.find(p => p.type === 'month').value;
  const day   = +dp.find(p => p.type === 'day').value;

  const offset = getUTCOffsetHours(tz, refDate);
  // UTC = local - offset; anchor to midnight of target date
  return new Date(Date.UTC(year, month - 1, day, 0) + (hour - offset) * 3600000);
}

function getBusinessWindow(refDate, tz) {
  return {
    start: localHourToUTC(refDate, WORK_START, tz).getTime(),
    end:   localHourToUTC(refDate, WORK_END,   tz).getTime()
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtTime(ms, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true
  }).formatToParts(new Date(ms));
  const h   = parts.find(p => p.type === 'hour').value;
  const m   = parts.find(p => p.type === 'minute').value;
  const ap  = parts.find(p => p.type === 'dayPeriod').value;
  return m === '00' ? `${h} ${ap}` : `${h}:${m} ${ap}`;
}

function fmtCurrentTime(tz) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true
  }).format(new Date());
}

function fmtHours(h) {
  if (h <= 0) return '0 h';
  const whole = Math.floor(h);
  const mins  = Math.round((h % 1) * 60);
  if (mins === 0) return `${whole}h`;
  if (whole === 0) return `${mins}m`;
  return `${whole}h ${mins}m`;
}

function shortOffset(tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, timeZoneName: 'shortOffset'
  }).formatToParts(new Date());
  return parts.find(p => p.type === 'timeZoneName')?.value ?? '';
}

// ── City search ───────────────────────────────────────────────────────────────

function searchCities(q) {
  if (!q.trim()) return [];
  const lq = q.toLowerCase();
  const matches = CITIES.filter(c =>
    c.name.toLowerCase().includes(lq) || c.country.toLowerCase() === lq
  );
  matches.sort((a, b) => {
    const aStart = a.name.toLowerCase().startsWith(lq);
    const bStart = b.name.toLowerCase().startsWith(lq);
    if (aStart !== bStart) return aStart ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return matches.slice(0, 8);
}

function guessUserCity() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return CITIES.find(c => c.tz === tz) ??
           CITIES.find(c => c.tz.split('/')[0] === tz.split('/')[0]);
  } catch { return null; }
}

// ── Autocomplete picker ───────────────────────────────────────────────────────

function setupPicker(inputId, listId, onSelect) {
  const input = document.getElementById(inputId);
  const list  = document.getElementById(listId);
  let current = null;
  let activeIdx = -1;

  function displayName(city) {
    return city ? `${city.name}, ${city.country}` : '';
  }

  function renderList(cities) {
    list.innerHTML = '';
    if (!cities.length) { list.hidden = true; return; }
    cities.forEach((c, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="city-label">${c.name}<span class="city-country">${c.country}</span></span><span class="city-offset">${shortOffset(c.tz)}</span>`;
      li.addEventListener('mousedown', e => { e.preventDefault(); select(c); });
      list.appendChild(li);
    });
    list.hidden = false;
    activeIdx = -1;
  }

  function select(city) {
    current = city;
    input.value = displayName(city);
    list.hidden = true;
    onSelect(city);
  }

  function highlightItem(idx) {
    [...list.querySelectorAll('li')].forEach((li, i) =>
      li.classList.toggle('active', i === idx));
  }

  input.addEventListener('input', () => {
    if (!input.value.trim()) { current = null; onSelect(null); }
    renderList(searchCities(input.value));
  });

  input.addEventListener('focus', () => {
    if (input.value.trim()) renderList(searchCities(input.value));
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      list.hidden = true;
      // Restore to selected city's name if text was edited but no new selection made
      if (input.value.trim() !== displayName(current)) {
        input.value = displayName(current);
      }
    }, 150);
  });

  input.addEventListener('keydown', e => {
    const items = [...list.querySelectorAll('li')];
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
      highlightItem(activeIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
      highlightItem(activeIdx);
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      const cities = searchCities(input.value);
      if (cities[activeIdx]) select(cities[activeIdx]);
    } else if (e.key === 'Escape') {
      list.hidden = true;
      input.blur();
    }
  });

  return { select };
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function renderTimeline(now, wA, wB, overlap) {
  const midnightA = localHourToUTC(now, 0, cityA.tz).getTime();
  const dayMs = 24 * 3600000;

  function pct(ms) {
    return ((ms - midnightA) / dayMs * 100);
  }

  function bar(startMs, endMs, cls) {
    const l = Math.max(0, Math.min(100, pct(startMs)));
    const r = Math.max(0, Math.min(100, pct(endMs)));
    if (r <= l) return '';
    return `<div class="tl-bar ${cls}" style="left:${l.toFixed(2)}%;width:${(r - l).toFixed(2)}%"></div>`;
  }

  const hourLabels = Array.from({ length: 9 }, (_, i) => {
    const h = i * 3;
    const lbl = h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;
    return `<span class="h-lbl" style="left:${(h / 24 * 100).toFixed(2)}%">${lbl}</span>`;
  }).join('');

  const nowPct = pct(now.getTime());
  const nowLine = (nowPct >= 0 && nowPct <= 100)
    ? `<div class="now-line" style="left:${nowPct.toFixed(2)}%"><div class="now-dot"></div></div>`
    : '';

  return `
<div class="timeline">
  <div class="tl-row">
    <div class="tl-lbl">${cityA.name}</div>
    <div class="tl-track">
      ${bar(wA.start, wA.end, 'bar-a')}
      ${overlap ? bar(overlap.start, overlap.end, 'bar-overlap') : ''}
      ${nowLine}
    </div>
  </div>
  <div class="tl-row">
    <div class="tl-lbl">${cityB.name}</div>
    <div class="tl-track">
      ${bar(wB.start, wB.end, 'bar-b')}
      ${overlap ? bar(overlap.start, overlap.end, 'bar-overlap') : ''}
      ${nowLine}
    </div>
  </div>
  <div class="tl-row tl-hour-row">
    <div class="tl-lbl"></div>
    <div class="tl-track tl-hours">${hourLabels}</div>
  </div>
</div>
<p class="tl-caption">${cityA.name} local time &middot; <span id="live-time"></span></p>`;
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  const area = document.getElementById('result');

  if (!cityA || !cityB) {
    area.innerHTML = '<p class="hint">Select both cities to find the meeting window.</p>';
    return;
  }

  const now = new Date();
  const wA = getBusinessWindow(now, cityA.tz);
  const wB = getBusinessWindow(now, cityB.tz);

  const overlapStart = Math.max(wA.start, wB.start);
  const overlapEnd   = Math.min(wA.end,   wB.end);
  const hasOverlap   = overlapStart < overlapEnd;
  const overlapHrs   = hasOverlap ? (overlapEnd - overlapStart) / 3600000 : 0;
  const overlap      = hasOverlap ? { start: overlapStart, end: overlapEnd } : null;

  const sameTZ = cityA.tz === cityB.tz;

  let summaryHtml;
  if (sameTZ) {
    summaryHtml = `
      <div class="overlap-num">9h overlap</div>
      <div class="overlap-times">
        <div class="ot-row">
          <span class="dot dot-a"></span>
          <span class="ot-city">${cityA.name} &amp; ${cityB.name}</span>
          <span class="ot-range">8:00 AM – 5:00 PM (same timezone)</span>
        </div>
      </div>`;
  } else if (hasOverlap) {
    summaryHtml = `
      <div class="overlap-num">${fmtHours(overlapHrs)} overlap</div>
      <div class="overlap-times">
        <div class="ot-row">
          <span class="dot dot-a"></span>
          <span class="ot-city">${cityA.name}</span>
          <span class="ot-range">${fmtTime(overlapStart, cityA.tz)} – ${fmtTime(overlapEnd, cityA.tz)}</span>
        </div>
        <div class="ot-row">
          <span class="dot dot-b"></span>
          <span class="ot-city">${cityB.name}</span>
          <span class="ot-range">${fmtTime(overlapStart, cityB.tz)} – ${fmtTime(overlapEnd, cityB.tz)}</span>
        </div>
      </div>`;
  } else {
    const gap = Math.max(wA.start, wB.start) - Math.min(wA.end, wB.end);
    const gapHrs = gap / 3600000;
    summaryHtml = `
      <div class="no-overlap-num">No overlap</div>
      <p class="no-overlap-note">Business hours miss by ${fmtHours(gapHrs)}. Consider an early or late call.</p>`;
  }

  area.innerHTML = `
<div class="card">
  <div class="card-summary ${!hasOverlap && !sameTZ ? 'card-summary--none' : ''}">
    <div class="current-times">
      <div class="cur-city"><span class="dot dot-a"></span>${cityA.name} <span class="cur-t" id="cur-a"></span></div>
      <div class="cur-city"><span class="dot dot-b"></span>${cityB.name} <span class="cur-t" id="cur-b"></span></div>
    </div>
    ${summaryHtml}
  </div>
  <div class="card-timeline">
    ${renderTimeline(now, wA, wB, overlap)}
  </div>
</div>`;

  tickLiveTimes();
}

function tickLiveTimes() {
  const a = document.getElementById('cur-a');
  const b = document.getElementById('cur-b');
  const lt = document.getElementById('live-time');
  if (a && cityA) a.textContent = fmtCurrentTime(cityA.tz);
  if (b && cityB) b.textContent = fmtCurrentTime(cityB.tz);
  if (lt && cityA) lt.textContent = fmtCurrentTime(cityA.tz);
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  updateThemeBtn();
  document.getElementById('theme-btn').addEventListener('click', toggleTheme);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeBtn);

  const pickerA = setupPicker('input-a', 'list-a', city => { cityA = city; render(); });
  const pickerB = setupPicker('input-b', 'list-b', city => { cityB = city; render(); });

  // Auto-detect user's city for city A
  const userCity = guessUserCity();
  if (userCity) pickerA.select(userCity);

  document.getElementById('swap-btn').addEventListener('click', () => {
    [cityA, cityB] = [cityB, cityA];
    const a = document.getElementById('input-a');
    const b = document.getElementById('input-b');
    [a.value, b.value] = [b.value, a.value];
    render();
  });

  render();
  setInterval(() => {
    tickLiveTimes();
    // Re-render every minute to update the "now" marker position
    if (cityA && cityB) render();
  }, 60000);
});
