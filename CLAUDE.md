# Pitch Tracker — Project Guide

A phone-friendly **Progressive Web App (PWA)** for tracking a youth baseball
team's pitch counts and enforcing pitch-count → rest-day rules (Little League
style). It is intentionally **dependency-free**: plain HTML, CSS, and vanilla
JavaScript with no build step, no framework, and no backend. All data is stored
in the browser's `localStorage` on the user's device.

## Architecture

It's a static single-page app. The whole thing is these files at the repo root:

| File | Purpose |
|------|---------|
| `index.html` | App shell: header, the `#view` container that JS renders into, and the bottom tab bar. |
| `styles.css` | All styling. Mobile-first, large touch targets, dark theme via CSS custom properties in `:root`. |
| `app.js` | The entire app: state, persistence, rest-day logic, rendering, and event wiring. **No modules** — one IIFE. |
| `manifest.json` | PWA manifest (name, icons, theme color, `display: standalone`). |
| `sw.js` | Service worker — caches the app shell for offline use / home-screen install. |
| `icon.svg` | App icon (a baseball), referenced by the manifest and `<link rel="icon">`. |

There is **no package.json, no bundler, no transpile step**. Edit the files and
they run as-is.

### `app.js` structure (read this before editing)

- **State** lives in a single `state` object: `{ players, outings, rules, live }`.
  - `players`: `[{ id, name }]`
  - `outings`: `[{ id, playerId, date: "YYYY-MM-DD", pitches }]` — one record per pitching appearance
  - `rules`: `[{ minPitches, restDays }]` — pitch-count thresholds → required rest days
  - `live`: `{ playerId, count } | null` — the in-progress count being tallied (persisted so it survives a phone lock / reload)
- **Persistence:** `load()` / `save()` read/write `localStorage` under the key
  `pitchTracker.v1`. `save()` is called after every mutation.
- **Dates** are handled as local `YYYY-MM-DD` strings via helpers (`todayStr`,
  `ymd`, `parseYmd`, `daysBetween`, `addDays`, `prettyDate`). Avoid `new Date(string)`
  parsing (timezone foot-guns) — use these helpers.
- **Rest logic:** `restDaysFor(pitches)` returns the rest days for the *highest*
  rule threshold met. `availability(playerId, asOf)` finds the player's most
  recent outing and computes `availableOn = outing.date + restDays + 1` (they are
  eligible again after that many full calendar days).
- **Rendering** is plain string templating: `render()` swaps `#view.innerHTML`
  based on `activeTab` (`track` / `status` / `roster` / `rules`), then `wireView()`
  re-attaches event listeners. There is no virtual DOM — re-render is a full
  innerHTML replace of the view, which is fine at this scale.
- Always escape user-entered text with `esc()` when interpolating into HTML.

### Default rules

Seeded from standard Little League (Majors, ages 9–12): `66+ → 4 days`,
`51–65 → 3`, `36–50 → 2`, `21–35 → 1`, `1–20 → 0`. Users can edit/add/remove
thresholds and reset to defaults on the Rules tab.

## Important conventions / gotchas

- **Bump the service-worker cache version when you change app files.** `sw.js`
  serves the app shell cache-first, so returning users won't get updates until
  the `CACHE` constant (`'pitch-tracker-v1'`) is incremented and the files are
  re-added in the `ASSETS` array. If you add/rename a static file, update
  `ASSETS` too.
- **Keep it dependency-free.** Don't introduce a build step, npm, or a framework
  unless the user explicitly asks. New features should stay vanilla JS.
- **No personal data in the repo.** All player names / counts live only in the
  device's `localStorage`. Don't add anything that commits user data to git.
- **Relative paths only** (`href="styles.css"`, `register('sw.js')`) so the app
  works under the `/pitch-tracker/` GitHub Pages subpath.

## Running locally

The service worker needs a real HTTP origin (not `file://`):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

A quick sanity check after editing JS:

```bash
node --check app.js
node --check sw.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json'))"
```

## Deployment

- **Live URL:** https://whatadewitt.github.io/pitch-tracker/
- **How:** `.github/workflows/deploy-pages.yml` deploys to GitHub Pages on every
  push to **`main`**. The job stages the six static files into `_site` and uses
  `actions/upload-pages-artifact` + `actions/deploy-pages`.
- **Why `main`:** the `github-pages` environment only permits deployments from
  the default branch, so the workflow triggers on `main` (not feature branches).
  Develop on a feature branch, then merge to `main` to publish.
- **Pages must stay enabled** in repo Settings → Pages with **Source: GitHub
  Actions**, and the repo must be **public** (free-plan Pages requirement). The
  Actions token cannot enable Pages or change visibility — those are one-time
  manual admin actions.
- **Note for web/sandbox sessions:** outbound requests to `*.github.io` may be
  blocked by the environment's network egress allowlist (`x-deny-reason:
  host_not_allowed`). That is a sandbox limitation, not a site problem — verify
  the live site from a normal browser/phone instead of curling it from here.

## Tooling: the `impeccable` design skill

`.claude/skills/impeccable/` is a **vendored** copy of the `impeccable` skill
(from `pbakaus/impeccable`, Apache 2.0) plus its helper agent in
`.claude/agents/`. It's vendored rather than installed as a plugin because
Claude Code on the web has no `/plugin` command and doesn't reliably auto-install
marketplace plugins; committed `.claude/skills/` load automatically. See
`.claude/skills/impeccable/VENDORED.md` for provenance and update instructions.

Invoke it as a user-invocable skill, e.g. `/impeccable polish`, `/impeccable
audit`, `/impeccable critique`, `/impeccable init`. It's a natural fit for
improving this app's UI (`index.html`, `styles.css`). Some subcommands shell out
to `node .claude/skills/impeccable/scripts/*.mjs` or `npx impeccable`; its
browser-based "live" features won't work in a sandboxed/headless environment, but
the file/text-based design commands do.

## Possible next steps (not yet built)

- Multi-device sync (would require a backend — currently per-device only).
- Per-day / per-game view of outings and season totals per player.
- Export / import of data (e.g. JSON) as a backup mechanism.
