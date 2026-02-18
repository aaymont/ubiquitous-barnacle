# Fleet Symphony

A **MyGeotab Custom Page Add-In** that turns fleet data into music in real time: trip data, safety signals, and vehicle context drive tempo, key, rhythm, melody, and harmony. Built with Tone.js and the MyGeotab API.

## Features

- **Now Playing** — BPM, key, safety mood, and last trip summary driven by live or playback data
- **Live mode** — Polls device status every 5 seconds and sonifies speed, driving state, and communication status
- **Playback mode** — Generates a song from the last N trips (1, 7, or 30 days) with optional exception events
- **Optional MIDI Out** — Send notes to an external MIDI device (HTTPS only, Web MIDI API)

## How to enable GitHub Pages

1. In your GitHub repo (**ubiquitous-barnacle**), go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. The workflow `Deploy Fleet Symphony to GitHub Pages` runs on push to `main` when files under `addins/fleet-symphony/` change. For the add-in to be available at `addins/fleet-symphony/index.html`, the deployed artifact must be the **whole repository** (the workflow uses `path: .`). If you use another workflow that deploys only a subfolder (e.g. another add-in), consider a single workflow that uploads the full repo so both add-ins are available under `addins/...`.

## How to add the Add-In in MyGeotab

1. In MyGeotab go to **Administration → System Settings → Add-Ins**.
2. Enable **Allow unverified Add-Ins** (required for custom Add-Ins).
3. Add the Add-In using the contents of `manifest.json`, or paste this URL as the Add-In URL:
   - `https://aaymont.github.io/ubiquitous-barnacle/addins/fleet-symphony/index.html`
4. Save and refresh the page (e.g. Ctrl+Shift+R) if the new page does not appear in the menu.

## How to use the app

### Live mode

1. Select a **Device** from the dropdown.
2. Choose **Mode: Live**.
3. Click **Start** (required to unlock audio — the app never auto-plays).
4. The app polls device status every 5 seconds. **Now Playing** shows BPM, key, safety mood, and current speed. Rhythm and melody update from speed and driving state.
5. Use **Pause** to pause the transport; **Stop** to stop and stop polling.

### Playback mode

1. Select a **Device**.
2. Choose **Mode: Playback** and set **Playback range** (Last 1 day, 7 days, or 30 days).
3. Optionally set **Tempo override (BPM)**; otherwise tempo is derived from the data.
4. Click **Start**. The app fetches recent trips and (when available) exception events, then generates a deterministic song: kicks on downbeats, snares, hi-hats, pentatonic melody and chords. Exception events add a short “safety” motif (rate-limited).
5. **Stop** stops playback.

### MIDI Out

- **MIDI Out** is only available over **HTTPS** (and localhost). On HTTP the warning explains this.
- Check **MIDI Out** and pick a **MIDI output device** if your browser lists one (e.g. a virtual MIDI port or hardware).
- When enabled, some notes (e.g. safety motif) are also sent to the selected MIDI output. Compatibility depends on your OS and browser.

### General

- **Master volume** defaults to 25%; adjust as needed.
- **Presentation mode** is a UI toggle for future use (e.g. full-screen or simplified view).

## How to tune mappings

- **BPM range** — In `addin.js`, `BPM_MIN` (70) and `BPM_MAX` (150) map average speed (0–110 km/h) to tempo. Adjust these to change the live/playback tempo range.
- **Speed range** — `SPEED_RANGE_KMH` (110) is the max speed used for the 0–1 mapping; change it if your fleet uses different units or ranges.
- **Scale** — Pentatonic major/minor are in `PENTATONIC_MAJOR` and `PENTATONIC_MINOR` (semitone offsets). Mode (major vs minor) is driven by safety: exceptions or “offline” push the mood to minor.
- **Key** — Key is derived from the vehicle name hash so each vehicle has a stable “signature” key.
- **Safety motif** — `SAFETY_MOTIF_RATE_MS` (3000) rate-limits how often the alarm motif can play so it stays musical.

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| **No sound** | Audio never auto-plays. Click **Start** once to unlock the Web Audio context (and Tone.js). |
| **MIDI not available** | Web MIDI requires **HTTPS** (or localhost). Load the add-in from `https://aaymont.github.io/...` and ensure your browser supports `navigator.requestMIDIAccess`. |
| **Add-In not loading** | In MyGeotab, enable **Allow unverified Add-Ins**. Hard refresh (Ctrl+Shift+R). If you changed code, add `?v=2` (or similar) to the Add-In URL to avoid cached JS/CSS. |
| **Caching** | After deploying updates, add a query string to the Add-In URL in the manifest (e.g. `index.html?v=2`) and update it when you release new versions. |
| **Blur / cleanup** | When the Add-In loses focus (blur), the app stops the transport, stops polling, and disposes audio nodes. Re-opening the page and clicking **Start** again is required to resume. |

## Project structure

- `index.html` — Page structure; loads Tone.js from CDN and `addin.js`.
- `styles.css` — Layout and styling (no inline CSS).
- `addin.js` — Add-In lifecycle (initialize, focus, blur), Geotab API calls (Device, DeviceStatusInfo, Trip, ExceptionEvent), Tone.js engine, and UI wiring.
- `manifest.json` — MyGeotab Custom Page Add-In config (name, URL, menu).

## Tech notes

- **No mock data** — All data comes from the MyGeotab API (Device list, DeviceStatusInfo, Trip, ExceptionEvent with bounded date ranges).
- **Polling** — Live status is polled every 5 seconds; polling is stopped on **Stop** and on **blur**.
- **Audio** — Tone.js handles synthesis and transport; start is gated on user **Start** click; master volume has a default low value.
