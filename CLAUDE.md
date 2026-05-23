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

## City database

`cities.js` is the source of truth for supported cities. Each entry must use a valid IANA timezone ID (e.g. `Asia/Kolkata`, not `IST`). Multiple cities can share a timezone. Keep the list grouped by region and sorted alphabetically within each group.

## Styles

- Three accent colors defined as CSS variables in `:root` — always use the variables, never hardcode hex values for brand colors.
- Timeline bars use `position: absolute` with `left` and `width` as percentages — always express bar geometry as `%` of the `.tl-track` container width.
- No external CSS framework or icon library.

## Workflow

- After any meaningful change (feature, fix, content update): commit with a descriptive message and push to `origin main`. GitHub Pages redeploys automatically.
- Keep all logic in the four existing files — do not introduce a build tool, bundler, or npm dependency.
- **Keep `README.md` up to date.** It is user-facing documentation. When adding features, changing the URL format, modifying the city database workflow, or updating agent access (`llms.txt`, `cities.json`), reflect those changes in `README.md` in the same commit.
- When `cities.js` changes, regenerate `cities.json` (see README for the one-liner).
