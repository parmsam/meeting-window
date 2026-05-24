# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla HTML/CSS/JS utility — no build step, no npm, no framework. Four files: `index.html`, `style.css`, `app.js`, `cities.js`. Deploys directly to GitHub Pages from the `main` branch root.

## Architecture

- `cities.js` — exports `CITIES` array (`{name, country, tz}`) as a plain global. Add cities here; IANA timezone IDs only.
- `app.js` — all logic. Key sections: timezone math → formatting → city search → autocomplete picker → timeline renderer → main render → init.
- `style.css` — CSS custom properties for the three brand colors (`--a` blue, `--b` green, `--overlap` purple). Timeline bars are absolutely-positioned divs sized with percentage widths.
- `index.html` — minimal semantic markup; no inline scripts or styles.

## Timezone math

`localHourToUTC(refDate, hour, tz)` is the core function. It:
1. Gets today's calendar date in the target timezone via `Intl.DateTimeFormat`.
2. Measures the UTC offset by comparing formatted UTC vs local timestamps (handles DST and fractional offsets like India's +5:30 and Nepal's +5:45 correctly).
3. Returns `Date.UTC(year, month-1, day, 0) + (hour - offset) * 3600_000`.

Do not simplify this to `new Date().getTimezoneOffset()` — that only returns the browser's local offset, not arbitrary city offsets.

### Critical: anchorNoon pattern

**Always** pass `anchorNoon = localHourToUTC(now, 12, cityA.tz)` to `getBusinessWindow()` — never `now` and never `localHourToUTC(now, 0, cityA.tz)` (anchor midnight).

Why: `getBusinessWindow()` extracts the calendar date of its `refDate` argument in the target timezone. Cities behind the anchor (e.g. Dallas when NY is anchor) are still on "yesterday" at anchor midnight (e.g. 11 PM CDT = midnight EDT), so their bars silently land on the wrong date and appear outside the visible window. Noon in the anchor timezone is always the same calendar date for all practical timezone pairs worldwide.

`midnightA` (used only for bar-positioning geometry) is still `localHourToUTC(now, 0, cityA.tz)` — that is correct; just don't pass it to `getBusinessWindow()`.

```js
// Correct
const anchorNoon = localHourToUTC(now, 12, cityA.tz);
const anchorW  = getBusinessWindow(anchorNoon, cityA.tz);
const compWins = comp.map(c => getBusinessWindow(anchorNoon, c.tz));
const midnightA = localHourToUTC(now, 0, cityA.tz).getTime(); // geometry only
```

## City database

`cities.js` is the source of truth for supported cities. Each entry must use a valid IANA timezone ID (e.g. `Asia/Kolkata`, not `IST`). Multiple cities can share a timezone. Keep the list grouped by region and sorted alphabetically within each group.

## Key features and their implementation

- **Business hours** — `workStart`/`workEnd` module-level vars (default 9/17). Set via the gear-icon popover (`#settings-btn` / `#settings-popover`) and persisted to `localStorage`. Also readable from `?start=N&end=N` URL params.
- **Time scrubber** — `scrubMs` state (null = live, number = UTC ms). Click/drag `.tl-track` or `.simple-bar-track` to move the "now" red line without a full re-render. `_doScrub()` moves `.now-line` elements directly via `_applyNowPos()`. Arrow keys (←/→ = ±1h, Shift = ±3h) call `_scrubByHours()`. Esc resets to live. `#reset-live-btn` (hidden until scrubbed) resets and calls `render()`. The 60s interval skips `render()` when `scrubMs !== null` but always calls `tickLiveTimes()`.
- **Simple view ticks** — `.simple-ticks` row of 9 absolute-positioned `.simple-tick` labels (12a, 3a, 6a … 12p) replaces the old `.simple-bar-labels`.

## Styles

- Three accent colors defined as CSS variables in `:root` — always use the variables, never hardcode hex values for brand colors.
- Timeline bars use `position: absolute` with `left` and `width` as percentages — always express bar geometry as `%` of the `.tl-track` container width.
- No external CSS framework or icon library.

## Workflow

- After any meaningful change (feature, fix, content update): commit with a descriptive message and push to `origin main`. GitHub Pages redeploys automatically.
- Keep all logic in the four existing files — do not introduce a build tool, bundler, or npm dependency.
- **Keep `README.md` up to date.** It is user-facing documentation. When adding features, changing the URL format, modifying the city database workflow, or updating agent access (`llms.txt`, `cities.json`), reflect those changes in `README.md` in the same commit.
- When `cities.js` changes, regenerate `cities.json` (see README for the one-liner).
