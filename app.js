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

// ── Constants ─────────────────────────────────────────────────────────────────

let workStart = 9;
let workEnd   = 17;
const MAX_COMP = 8; // max comparison cities (plus the anchor = 9 total)

// Colors: index 0 = anchor city (always blue), 1..4 = comparison slots
const CITY_COLORS = ['#2563eb', '#059669', '#d97706', '#0891b2', '#db2777', '#7c3aed', '#b45309', '#0e7490', '#be185d'];
const OVERLAP_COLOR = '#7c3aed';

// ── View mode ─────────────────────────────────────────────────────────────────

let viewMode = 'full'; // 'simple' | 'full'

function initViewMode() {
  const param = new URLSearchParams(location.search).get('mode');
  viewMode = param === 'simple' ? 'simple'
           : param === 'full'   ? 'full'
           : (localStorage.getItem('viewMode') ?? 'full');
}

function setViewMode(mode) {
  viewMode = mode;
  localStorage.setItem('viewMode', mode);
  updateURL();
  updateViewToggle();
  render();
}

function updateViewToggle() {
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === viewMode);
  });
}

// ── State ─────────────────────────────────────────────────────────────────────

let cityA      = null; // anchor ("your city")
let cityB      = null; // first comparison city (static HTML picker)
let extraCities = [];  // [{id, city}] for dynamically-added pickers
let extraCount = 0;

let scrubMs        = null;  // null = live; number = scrubbed UTC time in ms
let _scrubDragging = false;
let _scrubTrack    = null;

function allCompCities() {
  return [cityB, ...extraCities.map(e => e.city)].filter(Boolean);
}

// ── Timezone math ─────────────────────────────────────────────────────────────

function getUTCOffsetHours(tz, date) {
  const fmt = (timeZone) => new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(date);
  const toMs = (parts) => {
    const v = (type) => +parts.find(p => p.type === type).value;
    return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'));
  };
  return (toMs(fmt(tz)) - toMs(fmt('UTC'))) / 3600000;
}

function localHourToUTC(refDate, hour, tz) {
  const dp = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(refDate);
  const year  = +dp.find(p => p.type === 'year').value;
  const month = +dp.find(p => p.type === 'month').value;
  const day   = +dp.find(p => p.type === 'day').value;
  const offset = getUTCOffsetHours(tz, refDate);
  return new Date(Date.UTC(year, month - 1, day, 0) + (hour - offset) * 3600000);
}

function getBusinessWindow(refDate, tz) {
  return {
    start: localHourToUTC(refDate, workStart, tz).getTime(),
    end:   localHourToUTC(refDate, workEnd,   tz).getTime()
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtTime(ms, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true
  }).formatToParts(new Date(ms));
  const h  = parts.find(p => p.type === 'hour').value;
  const m  = parts.find(p => p.type === 'minute').value;
  const ap = parts.find(p => p.type === 'dayPeriod').value;
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

function tzAbbr(tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, timeZoneName: 'short'
  }).formatToParts(new Date());
  return parts.find(p => p.type === 'timeZoneName')?.value ?? '';
}

function tzLabel(tz) {
  const abbr   = tzAbbr(tz);
  const offset = shortOffset(tz);
  // Some zones return a GMT offset as their abbreviation (e.g. "GMT+5:30" for IST)
  // In that case just show the offset once rather than "GMT+5:30 · GMT+5:30"
  return abbr === offset ? offset : `${abbr} · ${offset}`;
}

// ── City search ───────────────────────────────────────────────────────────────

// Maps country name aliases → ISO 2-letter code
const COUNTRY_ALIASES = {
  'united states': 'US', 'usa': 'US', 'america': 'US', 'us': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'britain': 'GB', 'england': 'GB',
  'japan': 'JP', 'germany': 'DE', 'france': 'FR', 'italy': 'IT',
  'spain': 'ES', 'china': 'CN', 'india': 'IN', 'brazil': 'BR',
  'canada': 'CA', 'australia': 'AU', 'mexico': 'MX', 'russia': 'RU',
  'south korea': 'KR', 'korea': 'KR', 'netherlands': 'NL', 'holland': 'NL',
  'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK', 'finland': 'FI',
  'switzerland': 'CH', 'austria': 'AT', 'belgium': 'BE', 'poland': 'PL',
  'turkey': 'TR', 'israel': 'IL', 'uae': 'AE', 'emirates': 'AE',
  'saudi arabia': 'SA', 'egypt': 'EG', 'nigeria': 'NG', 'kenya': 'KE',
  'south africa': 'ZA', 'singapore': 'SG', 'thailand': 'TH',
  'indonesia': 'ID', 'malaysia': 'MY', 'philippines': 'PH',
  'vietnam': 'VN', 'pakistan': 'PK', 'bangladesh': 'BD',
  'new zealand': 'NZ', 'argentina': 'AR', 'chile': 'CL',
  'colombia': 'CO', 'portugal': 'PT', 'ireland': 'IE', 'greece': 'GR',
  'ukraine': 'UA', 'hong kong': 'HK', 'taiwan': 'TW', 'qatar': 'QA',
};

function searchCities(q) {
  if (!q.trim()) return [];
  const lq = q.toLowerCase().trim();
  // Check if query resolves to a country code
  const resolvedCC = COUNTRY_ALIASES[lq] ?? (lq.length === 2 ? lq.toUpperCase() : null);

  const matches = CITIES.filter(c => {
    if (resolvedCC) return c.country === resolvedCC;
    return c.name.toLowerCase().includes(lq);
  });
  matches.sort((a, b) => {
    if (resolvedCC) return a.name.localeCompare(b.name);
    const aS = a.name.toLowerCase().startsWith(lq);
    const bS = b.name.toLowerCase().startsWith(lq);
    if (aS !== bS) return aS ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return matches.slice(0, 8);
}

function guessUserCity() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Exact timezone match first
    const exact = CITIES.find(c => c.tz === tz);
    if (exact) return exact;
    // Fallback: match by timezone region (e.g. America/Columbus → America/New_York cities)
    const tzRegion = tz.split('/')[0];
    return CITIES.find(c => c.tz.split('/')[0] === tzRegion) ?? null;
  } catch { return null; }
}

// ── Autocomplete picker ───────────────────────────────────────────────────────

function setupPicker(inputId, listId, onSelect) {
  const input = document.getElementById(inputId);
  const list  = document.getElementById(listId);
  if (!input || !list) return { select: () => {} };

  let current = null;
  let activeIdx = -1;

  const displayName = (city) => city ? `${city.name}, ${city.country}` : '';

  function renderList(cities) {
    list.innerHTML = '';
    if (!cities.length) { list.hidden = true; return; }
    cities.forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="city-label">${c.name}<span class="city-country">${c.country}</span></span><span class="city-offset">${tzLabel(c.tz)}</span>`;
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

  function highlight(idx) {
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
      if (input.value.trim() !== displayName(current)) input.value = displayName(current);
    }, 150);
  });
  input.addEventListener('keydown', e => {
    const items = [...list.querySelectorAll('li')];
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); highlight(activeIdx); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); highlight(activeIdx); }
    else if (e.key === 'Enter' && activeIdx >= 0) { const c = searchCities(input.value); if (c[activeIdx]) select(c[activeIdx]); }
    else if (e.key === 'Escape') { list.hidden = true; input.blur(); }
  });

  return { select };
}

// ── Extra city pickers ────────────────────────────────────────────────────────

function colorForSlot(slotIdx) {
  // slotIdx 0 = cityB (green), 1+ = extra
  return CITY_COLORS[1 + slotIdx] ?? CITY_COLORS[(1 + slotIdx) % CITY_COLORS.length];
}

function addExtraCity(autoCity) {
  if (extraCities.length >= MAX_COMP - 1) return;
  const id    = `ex${++extraCount}`;
  const slot  = extraCities.length;
  const color = colorForSlot(1 + slot);

  extraCities.push({ id, city: autoCity ?? null });

  const container = document.getElementById('extra-pickers');
  const row = document.createElement('div');
  row.className = 'extra-picker-row';
  row.dataset.extraId = id;
  row.innerHTML = `
    <span class="extra-dot" style="background:${color}"></span>
    <div class="picker extra-picker-input" style="flex:1">
      <input type="text" id="input-${id}" placeholder="e.g. London" autocomplete="off" spellcheck="false">
      <ul class="picker-list" id="list-${id}" hidden></ul>
    </div>
    <div class="move-btns">
      <button class="move-btn move-up"   data-id="${id}" title="Move up">↑</button>
      <button class="move-btn move-down" data-id="${id}" title="Move down">↓</button>
    </div>
    <button class="remove-city-btn" title="Remove city">×</button>`;

  row.querySelector('.move-up').addEventListener('click',   () => moveExtraCity(id, -1));
  row.querySelector('.move-down').addEventListener('click', () => moveExtraCity(id,  1));
  row.querySelector('.remove-city-btn').addEventListener('click', () => removeExtraCity(id));
  container.appendChild(row);

  const picker = setupPicker(`input-${id}`, `list-${id}`, city => {
    const entry = extraCities.find(e => e.id === id);
    if (entry) { entry.city = city; updateURL(); render(); }
  });

  if (autoCity) picker.select(autoCity);
  else document.getElementById(`input-${id}`).focus();

  updateAddBtn();
  updateMoveButtons();
}

function moveExtraCity(id, direction) {
  const idx     = extraCities.findIndex(e => e.id === id);
  const swapIdx = idx + direction;
  if (swapIdx < 0 || swapIdx >= extraCities.length) return;

  const swapId = extraCities[swapIdx].id;

  // Swap city data between the two entries
  [extraCities[idx].city, extraCities[swapIdx].city] =
  [extraCities[swapIdx].city, extraCities[idx].city];

  // Swap displayed input values to match
  const inputA = document.getElementById(`input-${id}`);
  const inputB = document.getElementById(`input-${swapId}`);
  if (inputA && inputB) [inputA.value, inputB.value] = [inputB.value, inputA.value];

  updateMoveButtons();
  updateURL();
  render();
}

function updateMoveButtons() {
  extraCities.forEach(({ id }, idx) => {
    const up   = document.querySelector(`.move-up[data-id="${id}"]`);
    const down = document.querySelector(`.move-down[data-id="${id}"]`);
    if (up)   up.disabled   = idx === 0;
    if (down) down.disabled = idx === extraCities.length - 1;
  });
}

function removeExtraCity(id) {
  extraCities = extraCities.filter(e => e.id !== id);
  document.querySelector(`[data-extra-id="${id}"]`)?.remove();
  updateAddBtn();
  updateMoveButtons();
  updateURL();
  render();
}

function updateAddBtn() {
  const btn = document.getElementById('add-city-btn');
  if (btn) btn.hidden = extraCities.length >= MAX_COMP - 1;
  // Hide swap button when there are extra cities
  const swap = document.getElementById('swap-btn');
  if (swap) swap.hidden = extraCities.length > 0;
}

// ── URL sharing ───────────────────────────────────────────────────────────────

function updateURL() {
  const cities = [cityA, cityB, ...extraCities.map(e => e.city)].filter(Boolean);
  const params = new URLSearchParams();
  if (viewMode === 'simple') params.set('mode', 'simple');
  if (workStart !== 9) params.set('start', workStart);
  if (workEnd !== 17)  params.set('end',   workEnd);
  const qs = params.toString() ? '?' + params.toString() : '';
  if (!cities.length) { history.replaceState(null, '', location.pathname + qs); return; }
  const hash = cities.map(c => `${encodeURIComponent(c.name)},${c.country}`).join('|');
  history.replaceState(null, '', `${qs}#${hash}`);
}

function parseURL() {
  const raw = location.hash.slice(1);
  if (!raw) return [];
  return raw.split('|').map(seg => {
    const ci = seg.lastIndexOf(',');
    if (ci === -1) return null;
    const name    = decodeURIComponent(seg.slice(0, ci));
    const country = seg.slice(ci + 1);
    return CITIES.find(c => c.name === name && c.country === country) ?? null;
  }).filter(Boolean);
}

// ── Image download ────────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function buildCanvas() {
  if (!cityA || !cityB) return null;
  const dark = isDarkActive();
  const pal  = dark
    ? { bg: '#0f172a', card: '#1e293b', text: '#f1f5f9', muted: '#94a3b8', track: '#111827' }
    : { bg: '#f8fafc', card: '#ffffff', text: '#0f172a', muted: '#64748b', track: '#f1f5f9' };

  const allCities  = [cityA, cityB, ...extraCities.map(e => e.city)].filter(Boolean);
  const now        = new Date();
  const anchorNoon = localHourToUTC(now, 12, cityA.tz);
  const windows    = allCities.map(c => getBusinessWindow(anchorNoon, c.tz));
  const midnightA  = localHourToUTC(now, 0, cityA.tz).getTime();
  const dayMs     = 24 * 3600000;
  const pct       = (ms) => Math.max(0, Math.min(1, (ms - midnightA) / dayMs));

  const LABEL_W  = 110;
  const PAD      = 20;
  const TRACK_X  = PAD + LABEL_W + 8;
  const W        = 840;
  const TRACK_W  = W - TRACK_X - PAD;
  const TRACK_H  = 22;
  const ROW_H    = 40;
  const TOP      = 56;
  const H        = TOP + allCities.length * ROW_H + 36;

  const DPR = 2;
  const canvas = document.createElement('canvas');
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  // Background
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);

  // Card
  ctx.fillStyle = pal.card;
  roundRect(ctx, PAD - 4, PAD - 4, W - (PAD - 4) * 2, H - (PAD - 4) * 2, 10);
  ctx.fill();

  // Title
  ctx.fillStyle = pal.text;
  ctx.font = `bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('Meeting Window', PAD + 2, PAD + 18);

  // Overlap calculation
  const oStart = Math.max(...windows.map(w => w.start));
  const oEnd   = Math.min(...windows.map(w => w.end));
  const hasOverlap = oStart < oEnd;

  // Timeline rows
  allCities.forEach((city, i) => {
    const y   = TOP + i * ROW_H;
    const w   = windows[i];
    const col = CITY_COLORS[i] ?? CITY_COLORS[CITY_COLORS.length - 1];

    // Track
    ctx.fillStyle = pal.track;
    roundRect(ctx, TRACK_X, y, TRACK_W, TRACK_H, 4);
    ctx.fill();

    // Business hours bar
    const bx = TRACK_X + pct(w.start) * TRACK_W;
    const bw = (pct(w.end) - pct(w.start)) * TRACK_W;
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.28;
    roundRect(ctx, bx, y, bw, TRACK_H, 4);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Overlap highlight
    if (hasOverlap) {
      const ox = TRACK_X + pct(oStart) * TRACK_W;
      const ow = (pct(oEnd) - pct(oStart)) * TRACK_W;
      ctx.fillStyle = OVERLAP_COLOR;
      ctx.globalAlpha = 0.82;
      roundRect(ctx, ox, y, ow, TRACK_H, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // City label dot + name
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(PAD + 5, y + TRACK_H / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pal.text;
    ctx.font = `500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'left';
    const label = city.name.length > 13 ? city.name.slice(0, 12) + '…' : city.name;
    ctx.fillText(label, PAD + 14, y + TRACK_H / 2 + 4);

    // Local time during overlap (or current)
    ctx.fillStyle = pal.muted;
    ctx.font = `11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'right';
    if (hasOverlap) {
      ctx.fillText(`${fmtTime(oStart, city.tz)} – ${fmtTime(oEnd, city.tz)}`, W - PAD, y + TRACK_H / 2 + 4);
    } else {
      ctx.fillText(fmtCurrentTime(city.tz), W - PAD, y + TRACK_H / 2 + 4);
    }
  });

  // Hour labels
  const lblY = TOP + allCities.length * ROW_H + 14;
  ctx.fillStyle = pal.muted;
  ctx.font = `10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  [0, 3, 6, 9, 12, 15, 18, 21, 24].forEach(h => {
    const x   = TRACK_X + (h / 24) * TRACK_W;
    const lbl = h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;
    ctx.fillText(lbl, x, lblY);
  });

  // Overlap summary text
  if (hasOverlap) {
    const hrs = (oEnd - oStart) / 3600000;
    ctx.fillStyle = OVERLAP_COLOR;
    ctx.font = `600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`${fmtHours(hrs)} overlap`, PAD + 2, H - 10);
  }

  // Footer credit
  ctx.fillStyle = pal.muted;
  ctx.font = `10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('parmsam.github.io/meeting-window', W - PAD, H - 10);

  return canvas;
}

function downloadImage() {
  const canvas = buildCanvas();
  if (!canvas) return;
  const a = document.createElement('a');
  a.download = 'meeting-window.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
}

async function copyImageToClipboard() {
  const canvas = buildCanvas();
  if (!canvas) return;
  const btn = document.getElementById('copy-img-btn');
  try {
    // Pass the Promise directly to ClipboardItem — Safari requires clipboard.write()
    // to be called synchronously within the user gesture, so we cannot await the
    // blob first; instead we let the browser resolve the Promise internally.
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': new Promise((resolve, reject) =>
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png')
        )
      })
    ]);
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy image'; }, 2000); }
  } catch {
    downloadImage();
    if (btn) { btn.textContent = 'Saved instead'; setTimeout(() => { btn.textContent = 'Copy image'; }, 2000); }
  }
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function renderTimeline(now, cityWindows, overlap) {
  const midnightA = localHourToUTC(now, 0, cityA.tz).getTime();
  const dayMs = 24 * 3600000;

  function pct(ms) { return ((ms - midnightA) / dayMs * 100); }

  function bar(startMs, endMs, color, isOverlap) {
    const l = Math.max(0, Math.min(100, pct(startMs)));
    const r = Math.max(0, Math.min(100, pct(endMs)));
    if (r <= l) return '';
    const style = isOverlap
      ? `left:${l.toFixed(2)}%;width:${(r - l).toFixed(2)}%;background:${OVERLAP_COLOR};opacity:.85;z-index:2`
      : `left:${l.toFixed(2)}%;width:${(r - l).toFixed(2)}%;background:${color};opacity:.28`;
    return `<div class="tl-bar" style="${style}"></div>`;
  }

  const hourLabels = Array.from({ length: 9 }, (_, i) => {
    const h   = i * 3;
    const lbl = h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;
    return `<span class="h-lbl" style="left:${(h / 24 * 100).toFixed(2)}%">${lbl}</span>`;
  }).join('');

  const nowPct = pct(now.getTime());
  const nowLine = (nowPct >= 0 && nowPct <= 100)
    ? `<div class="now-line" style="left:${nowPct.toFixed(2)}%"><div class="now-dot"></div></div>`
    : '';

  const rows = cityWindows.map(({ city, window, color }) => `
    <div class="tl-row">
      <div class="tl-lbl">${city.name}<span class="tl-tz">${tzLabel(city.tz)}</span></div>
      <div class="tl-track">
        ${bar(window.start, window.end, color, false)}
        ${overlap ? bar(overlap.start, overlap.end, OVERLAP_COLOR, true) : ''}
        ${nowLine}
      </div>
    </div>`).join('');

  return `
<div class="timeline">
  ${rows}
  <div class="tl-row tl-hour-row">
    <div class="tl-lbl"></div>
    <div class="tl-track tl-hours">${hourLabels}</div>
  </div>
</div>
<p class="tl-caption">${cityA.name} local time &middot; <span id="live-time"></span></p>
<div class="legend">
  ${cityWindows.map(({ city, color }) =>
    `<span class="legend-item">
      <span class="legend-swatch" style="background:${color};opacity:.4"></span>
      ${city.name} <span class="legend-tz">${tzLabel(city.tz)}</span>
    </span>`
  ).join('')}
  <span class="legend-item"><span class="legend-swatch sw-overlap"></span>Overlap</span>
  <span class="legend-item"><span class="legend-now"></span>Now</span>
</div>`;
}

// ── Simple view ───────────────────────────────────────────────────────────────

function renderSimple(allCities, allWins, overlap, overlapHrs) {
  const now = new Date();

  const timeRows = allCities.map((city, i) => `
    <div class="simple-row">
      <span class="dot" style="background:${CITY_COLORS[i] ?? CITY_COLORS[CITY_COLORS.length-1]}"></span>
      <span class="simple-city">${city.name}</span>
      <span class="simple-tz">${tzLabel(city.tz)}</span>
      <span class="simple-time">${overlap
        ? `${fmtTime(overlap.start, city.tz)} – ${fmtTime(overlap.end, city.tz)}`
        : fmtCurrentTime(city.tz)}</span>
    </div>`).join('');

  // Single bar showing overlap position within the anchor's day with hour ticks
  let barHtml = '';
  if (cityA) {
    const midnightA = localHourToUTC(now, 0, cityA.tz).getTime();
    const dayMs = 24 * 3600000;
    const nowPct = ((now.getTime() - midnightA) / dayMs * 100);
    const nowLine = nowPct >= 0 && nowPct <= 100
      ? `<div class="now-line" style="left:${nowPct.toFixed(2)}%"><div class="now-dot"></div></div>` : '';
    const fillHtml = overlap
      ? `<div class="simple-bar-fill" style="left:${((overlap.start - midnightA) / dayMs * 100).toFixed(2)}%;width:${((overlap.end - overlap.start) / dayMs * 100).toFixed(2)}%"></div>`
      : '';
    const ticks = [0, 3, 6, 9, 12, 15, 18, 21, 24].map(h => {
      const lbl = h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;
      return `<span class="simple-tick" style="left:${(h / 24 * 100).toFixed(2)}%">${lbl}</span>`;
    }).join('');
    barHtml = `
      <div class="simple-bar-wrap">
        <div class="simple-bar-track">
          ${fillHtml}
          ${nowLine}
        </div>
        <div class="simple-ticks">${ticks}</div>
      </div>`;
  }

  return `
<div class="card">
  <div class="card-summary">
    <div class="current-times">
      ${allCities.map((city, i) => `
        <div class="cur-city">
          <span class="dot" style="background:${CITY_COLORS[i] ?? CITY_COLORS[CITY_COLORS.length-1]}"></span>
          ${city.name} <span class="cur-t" id="cur-${i}"></span>
        </div>`).join('')}
    </div>
    ${overlap
      ? `<div class="overlap-num">${fmtHours(overlapHrs)} overlap</div>`
      : `<div class="no-overlap-num">No overlap</div>`}
  </div>
  <div class="simple-times-block">${timeRows}</div>
  ${barHtml}
  <div class="card-actions">
    <button id="share-btn"    class="action-btn">Share link</button>
    <button id="dl-btn"       class="action-btn">Download image</button>
    <button id="copy-img-btn" class="action-btn">Copy image</button>
    <button id="reset-live-btn" class="action-btn action-btn--live" hidden>↺ Live</button>
  </div>
</div>`;
}

// ── Main render ───────────────────────────────────────────────────────────────

function render() {
  scrubMs = null; // any full re-render returns to live
  const area = document.getElementById('result');
  const comp = allCompCities();

  if (!cityA || comp.length === 0) {
    area.innerHTML = '<p class="hint">Select both cities to find the meeting window.</p>';
    return;
  }

  const now = new Date();
  // Use the anchor city's local noon as the reference for all business-hour calculations.
  // Midnight fails for cities behind the anchor (e.g. Dallas is still "yesterday" at
  // NY midnight). Noon is always the same calendar date across all practical timezones.
  const anchorNoon = localHourToUTC(now, 12, cityA.tz);
  const anchorW  = getBusinessWindow(anchorNoon, cityA.tz);
  const compWins = comp.map(c => getBusinessWindow(anchorNoon, c.tz));

  // Global overlap: intersection of anchor + all comparison windows
  const allWins = [anchorW, ...compWins];
  const oStart  = Math.max(...allWins.map(w => w.start));
  const oEnd    = Math.min(...allWins.map(w => w.end));
  const hasOverlap = oStart < oEnd;
  const overlapHrs = hasOverlap ? (oEnd - oStart) / 3600000 : 0;
  const overlap    = hasOverlap ? { start: oStart, end: oEnd } : null;

  // Build city-window list for timeline (anchor first, then comparisons)
  const allCities = [cityA, ...comp];
  const cityWindows = allCities.map((city, i) => ({
    city,
    window: allWins[i],
    color: CITY_COLORS[i] ?? CITY_COLORS[CITY_COLORS.length - 1]
  }));

  if (viewMode === 'simple') {
    area.innerHTML = renderSimple(allCities, allWins, overlap, overlapHrs);
    wireActionBtns();
    wireTimeline();
    tickLiveTimes(allCities);
    return;
  }

  // Current times (for display)
  const curTimesHtml = allCities.map((city, i) => `
    <div class="cur-city">
      <span class="dot" style="background:${CITY_COLORS[i] ?? CITY_COLORS[CITY_COLORS.length - 1]}"></span>
      ${city.name} <span class="cur-t" id="cur-${i}"></span>
    </div>`).join('');

  let summaryHtml;
  if (comp.length === 1 && cityA.tz === comp[0].tz) {
    summaryHtml = `
      <div class="overlap-num">${fmtHours(workEnd - workStart)} overlap</div>
      <div class="overlap-times">
        <div class="ot-row">
          <span class="dot dot-a"></span>
          <span class="ot-city">${cityA.name} &amp; ${comp[0].name}</span>
          <span class="ot-range">${fmtTime(anchorW.start, cityA.tz)} – ${fmtTime(anchorW.end, cityA.tz)} (same timezone)</span>
        </div>
      </div>`;
  } else if (hasOverlap) {
    const timeRows = allCities.map((city, i) => `
      <div class="ot-row">
        <span class="dot" style="background:${CITY_COLORS[i] ?? CITY_COLORS[CITY_COLORS.length-1]}"></span>
        <span class="ot-city">${city.name}</span>
        <span class="ot-range">${fmtTime(oStart, city.tz)} – ${fmtTime(oEnd, city.tz)}</span>
      </div>`).join('');
    summaryHtml = `
      <div class="overlap-num">${fmtHours(overlapHrs)} overlap</div>
      <div class="overlap-times">${timeRows}</div>`;
  } else {
    const gap = Math.max(...allWins.map(w => w.start)) - Math.min(...allWins.map(w => w.end));
    summaryHtml = `
      <div class="no-overlap-num">No overlap</div>
      <p class="no-overlap-note">Business hours miss by ${fmtHours(gap / 3600000)}. Consider an early or late call.</p>`;
  }

  area.innerHTML = `
<div class="card">
  <div class="card-summary">
    <div class="current-times">${curTimesHtml}</div>
    ${summaryHtml}
  </div>
  <div class="card-timeline">
    ${renderTimeline(now, cityWindows, overlap)}
  </div>
  <div class="card-actions">
    <button id="share-btn"    class="action-btn">Share link</button>
    <button id="dl-btn"       class="action-btn">Download image</button>
    <button id="copy-img-btn" class="action-btn">Copy image</button>
    <button id="reset-live-btn" class="action-btn action-btn--live" hidden>↺ Live</button>
  </div>
</div>`;

  wireActionBtns();
  wireTimeline();
  tickLiveTimes(allCities);
}

function wireActionBtns() {
  document.getElementById('share-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(location.href).then(() => {
      const btn = document.getElementById('share-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Share link'; }, 2000);
    });
  });
  document.getElementById('dl-btn')?.addEventListener('click', downloadImage);
  document.getElementById('copy-img-btn')?.addEventListener('click', copyImageToClipboard);
  document.getElementById('reset-live-btn')?.addEventListener('click', () => {
    scrubMs = null;
    render();
  });
}

function getScrubTime() { return scrubMs ?? Date.now(); }

function tickLiveTimes(allCities) {
  const t = getScrubTime();
  allCities = allCities ?? [cityA, ...allCompCities()];
  allCities.forEach((city, i) => {
    const el = document.getElementById(`cur-${i}`);
    if (el && city) el.textContent = fmtTime(t, city.tz);
  });
  const lt = document.getElementById('live-time');
  if (lt && cityA) lt.textContent = fmtTime(t, cityA.tz);
}

// ── Scrubber ──────────────────────────────────────────────────────────────────

function _doScrub(clientX, trackEl) {
  if (!cityA) return;
  const rect = trackEl.getBoundingClientRect();
  const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const midnightA = localHourToUTC(new Date(), 0, cityA.tz).getTime();
  scrubMs = midnightA + frac * 24 * 3600000;
  _applyNowPos((frac * 100).toFixed(2) + '%');
}

function _scrubByHours(delta) {
  if (!cityA) return;
  const base = scrubMs ?? Date.now();
  const midnightA = localHourToUTC(new Date(), 0, cityA.tz).getTime();
  const dayMs = 24 * 3600000;
  const next = Math.max(midnightA, Math.min(midnightA + dayMs, base + delta * 3600000));
  scrubMs = next;
  _applyNowPos(((next - midnightA) / dayMs * 100).toFixed(2) + '%');
}

function _applyNowPos(pct) {
  document.querySelectorAll('.now-line').forEach(el => el.style.left = pct);
  const btn = document.getElementById('reset-live-btn');
  if (btn) btn.hidden = false;
  tickLiveTimes();
}

function wireTimeline() {
  document.querySelectorAll('.tl-track:not(.tl-hours), .simple-bar-track').forEach(track => {
    track.addEventListener('mousedown', e => {
      e.preventDefault();
      _scrubDragging = true;
      _scrubTrack = track;
      _doScrub(e.clientX, track);
    });
    track.addEventListener('touchstart', e => {
      _scrubDragging = true;
      _scrubTrack = track;
      _doScrub(e.touches[0].clientX, track);
    }, { passive: true });
  });
}

// ── Settings ──────────────────────────────────────────────────────────────────

function fmtHourLabel(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function buildHourOptions() {
  const startSel = document.getElementById('work-start-select');
  const endSel   = document.getElementById('work-end-select');
  if (!startSel || !endSel) return;
  startSel.innerHTML = Array.from({length: 23}, (_, i) =>
    `<option value="${i}">${fmtHourLabel(i)}</option>`).join(''); // 0–22
  endSel.innerHTML = Array.from({length: 23}, (_, i) =>
    `<option value="${i+1}">${fmtHourLabel(i+1)}</option>`).join(''); // 1–23
}

function initSettings() {
  const params = new URLSearchParams(location.search);

  const sp = parseInt(params.get('start'), 10);
  const ep = parseInt(params.get('end'), 10);
  if (!isNaN(sp) && sp >= 0 && sp <= 22) {
    workStart = sp;
  } else {
    const ls = parseInt(localStorage.getItem('workStart'), 10);
    if (!isNaN(ls) && ls >= 0 && ls <= 22) workStart = ls;
  }
  if (!isNaN(ep) && ep >= 1 && ep <= 23 && ep > workStart) {
    workEnd = ep;
  } else {
    const le = parseInt(localStorage.getItem('workEnd'), 10);
    if (!isNaN(le) && le >= 1 && le <= 23 && le > workStart) workEnd = le;
  }

  buildHourOptions();
  const startSel = document.getElementById('work-start-select');
  const endSel   = document.getElementById('work-end-select');
  if (startSel) startSel.value = workStart;
  if (endSel)   endSel.value   = workEnd;
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initViewMode();
  initSettings();
  updateThemeBtn();
  updateViewToggle();

  document.getElementById('theme-btn').addEventListener('click', toggleTheme);

  const settingsBtn     = document.getElementById('settings-btn');
  const settingsPopover = document.getElementById('settings-popover');
  settingsBtn.addEventListener('click', () => {
    const open = settingsPopover.hidden === false;
    settingsPopover.hidden = open;
    settingsBtn.setAttribute('aria-expanded', String(!open));
  });
  document.addEventListener('click', e => {
    if (!settingsBtn.contains(e.target) && !settingsPopover.contains(e.target)) {
      settingsPopover.hidden = true;
      settingsBtn.setAttribute('aria-expanded', 'false');
    }
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeBtn);

  document.getElementById('view-toggle').addEventListener('click', e => {
    const btn = e.target.closest('.view-btn');
    if (btn) setViewMode(btn.dataset.mode);
  });

  const pickerA = setupPicker('input-a', 'list-a', city => {
    cityA = city; updateURL(); render();
  });
  const pickerB = setupPicker('input-b', 'list-b', city => {
    cityB = city; updateURL(); render();
  });

  document.getElementById('swap-btn').addEventListener('click', () => {
    [cityA, cityB] = [cityB, cityA];
    const a = document.getElementById('input-a');
    const b = document.getElementById('input-b');
    [a.value, b.value] = [b.value, a.value];
    updateURL(); render();
  });

  document.getElementById('add-city-btn').addEventListener('click', () => addExtraCity());

  document.getElementById('work-start-select').addEventListener('change', e => {
    workStart = parseInt(e.target.value, 10);
    if (workEnd <= workStart) {
      workEnd = workStart + 1;
      document.getElementById('work-end-select').value = workEnd;
    }
    localStorage.setItem('workStart', workStart);
    localStorage.setItem('workEnd', workEnd);
    updateURL();
    render();
  });

  document.getElementById('work-end-select').addEventListener('change', e => {
    const v = parseInt(e.target.value, 10);
    if (v <= workStart) return;
    workEnd = v;
    localStorage.setItem('workEnd', workEnd);
    updateURL();
    render();
  });

  // Restore from URL or auto-detect user city
  const fromURL = parseURL();
  if (fromURL.length > 0) {
    pickerA.select(fromURL[0]);
    if (fromURL[1]) pickerB.select(fromURL[1]);
    for (let i = 2; i < fromURL.length; i++) addExtraCity(fromURL[i]);
  } else {
    const userCity = guessUserCity();
    if (userCity) pickerA.select(userCity);
  }

  render();
  // Global scrub listeners (attached once)
  document.addEventListener('mousemove', e => {
    if (!_scrubDragging || !_scrubTrack) return;
    _doScrub(e.clientX, _scrubTrack);
  });
  document.addEventListener('mouseup', () => {
    _scrubDragging = false;
    _scrubTrack = null;
  });
  document.addEventListener('touchmove', e => {
    if (!_scrubDragging || !_scrubTrack) return;
    _doScrub(e.touches[0].clientX, _scrubTrack);
  }, { passive: true });
  document.addEventListener('touchend', () => {
    _scrubDragging = false;
    _scrubTrack = null;
  });

  // Arrow keys: ←/→ nudge scrub by 1 hour; Shift+arrow = 3 h
  document.addEventListener('keydown', e => {
    if (!cityA || allCompCities().length === 0) return;
    if (document.activeElement?.matches('input, select, textarea')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); _scrubByHours( e.shiftKey ? 3 : 1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); _scrubByHours(e.shiftKey ? -3 : -1); }
    if (e.key === 'Escape' && scrubMs) { scrubMs = null; render(); }
  });

  setInterval(() => {
    tickLiveTimes();
    if (cityA && allCompCities().length > 0 && !scrubMs) render();
  }, 60000);
});
