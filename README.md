# ⚾ Pitch Tracker

A simple, phone-friendly web app for tracking your team's pitch counts and
keeping kids within Little League rest-day rules. No accounts, no server — all
data is stored on your device and persists across sessions.

## What it does

- **Roster** — enter all the kids on the team (add several at once, separated by
  commas or new lines). Rename or remove anyone.
- **Track** — pick a pitcher and tap the big **+ / –** buttons to count pitches
  as they throw. The count saves automatically as you go, so you won't lose it
  if your phone locks or the app closes. Tap **Save outing** to record it for the
  day.
- **Status** — see who's **available** and who's **resting**, with the date each
  kid is next eligible to pitch. Includes a recent-outings log you can correct.
- **Rules** — the pitch-count → rest-day thresholds that drive availability.
  Seeded with the standard Little League (Majors, ages 9–12) rules:

  | Pitches in an outing | Rest days required |
  | -------------------- | ------------------ |
  | 1–20                 | 0                  |
  | 21–35                | 1                  |
  | 36–50                | 2                  |
  | 51–65                | 3                  |
  | 66+                  | 4                  |

  Edit the numbers, add thresholds, or reset to defaults to match your league or
  age division.

## Use it on your phone

It's live here:

### **https://whatadewitt.github.io/pitch-tracker/**

It's a Progressive Web App, so you can install it to your home screen and it
works offline:

- **iPhone / Safari:** tap **Share → Add to Home Screen**
- **Android / Chrome:** tap **⋮ → Add to Home screen**

It gets the baseball icon and opens full-screen, like a native app.

### How it's hosted / deployed

The site is published with **GitHub Pages** via the GitHub Actions workflow in
`.github/workflows/deploy-pages.yml`. Every push to the **`main`** branch
re-runs that workflow and republishes automatically — there is no build step
and nothing to do manually. (Pages requires the repo to be public on the free
plan; the repo contains only the generic app code — no team or player data.)

### Run locally to try it

Because it uses a service worker, open it through a local web server (not
`file://`):

```bash
cd pitch-tracker
python3 -m http.server 8000
# then visit http://localhost:8000
```

## How rest is calculated

When you save an outing, the app looks at the pitch count and finds the highest
rule threshold it meets to get the required rest days. The pitcher is then marked
unavailable until that many full calendar days have passed. For example, throwing
55 pitches on a Saturday (3 days rest) makes a kid eligible again the following
Wednesday. A player's most recent outing governs their current availability.

## Privacy

Everything lives in your browser's local storage on the device you use. Nothing
is uploaded anywhere. Clearing your browser data — or using the **Erase all
data** button on the Rules tab — removes it.
