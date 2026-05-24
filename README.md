# Meeting Window

Find overlapping business hours (default 9 AM–5 PM) between two or more cities worldwide.

**Live:** https://parmsam.github.io/meeting-window/

---

## What it does

Pick your city and a colleague's city. Meeting Window shows the window of time where both cities are simultaneously within standard business hours, expressed in each city's local time. Add more cities to find a time that works for everyone on a distributed team.

## Features

- **Multi-city comparison** — add up to 8 comparison cities; overlap = intersection of all
- **Date picker** — check overlap on any date, not just today; "Today" button to reset
- **Custom hours** — adjust business hours beyond the default 9 AM–5 PM
- **Shareable links** — cities, date, and hours are all encoded in the URL; copy and paste to share
- **Download or copy image** — export the timeline as a PNG to paste into Slack, email, or a doc
- **Dark mode** — respects system preference with a manual toggle
- **Country search** — type a country name ("japan", "uk", "india") to filter cities
- **Auto-detect your city** — pre-fills your city from the browser's timezone on first load
- **Agent-friendly** — `llms.txt` and `cities.json` let AI agents use the tool without a browser

## URL format

Cities are encoded in the URL hash; date and hour settings go in query params. All are optional.

```
https://parmsam.github.io/meeting-window/#New York,US|Tokyo,JP
https://parmsam.github.io/meeting-window/?date=2026-06-01&start=9&end=18#London,GB|Mumbai,IN
https://parmsam.github.io/meeting-window/?mode=simple#Singapore,SG|Berlin,DE
```

- **Hash** — `#CityName,CountryCode|...` (cities in order, anchor first)
- `mode=simple` — use the simplified view
- `date=YYYY-MM-DD` — view overlap for a specific date
- `start=N&end=N` — custom business hours (24-hour integers, e.g. `start=9&end=18`)

## For AI agents

Three ways agents can use this tool:

| Method | Use case |
|--------|----------|
| Construct a URL | Get a shareable link for any city pair — no browser needed |
| `GET /cities.json` | Fetch the full city + IANA timezone database |
| Screenshot the URL | Load the URL in a headless browser and screenshot `#result .card` |

See [`llms.txt`](./llms.txt) for full details including a self-contained overlap computation snippet.

## Development

No build step. Edit the four source files and open `index.html` in a browser.

| File | Purpose |
|------|---------|
| `index.html` | Markup |
| `style.css` | All styles, CSS custom properties for theming |
| `app.js` | All logic: timezone math, autocomplete, timeline rendering, URL sharing, image export |
| `cities.js` | City database (`CITIES` array — IANA timezone IDs only) |
| `cities.json` | Static export of `cities.js` for agent/API access — regenerate when `cities.js` changes |

### Adding cities

Edit `cities.js`. Each entry must use a valid IANA timezone identifier:

```js
{ name: "Columbus", country: "US", tz: "America/New_York" },
```

After editing `cities.js`, regenerate `cities.json`:

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('cities.js', 'utf8');
const arr = eval(src.match(/const CITIES = (\[[\s\S]+?\]);/)[1]);
fs.writeFileSync('cities.json', JSON.stringify(arr, null, 2));
"
```

### Deploying

Push to `main`. GitHub Pages redeploys automatically from the repo root.

## License

MIT
