# Safety Report — MyGeotab Custom Page Add-In

A MyGeotab Custom Page Add-In that shows a **Safety Report** with live device status and a playful **inactivity mechanic**: the report fades to black unless the user keeps it alive. When blacked out, the user must use a “mouse wheel generator” (move the mouse around a circular wheel and click) to restore the screen.

## Features

- **Live device status**: Device dropdown populated from the Geotab API; selecting a device fetches and displays **DeviceStatusInfo** (Speed, Bearing, DateTime, Location, IsDeviceCommunicating). Refresh button to re-fetch.
- **Inactivity fade**: After 5 seconds without activity, the report fades to black over 4 seconds with a **countdown ring** (SVG stroke-dasharray/dashoffset).
- **Restore during fade**: Any activity (mouse, click, key, touch, wheel) during the fade cancels blackout and restores the report in 250 ms.
- **Generator when black**: When fully black, only the **generator** restores: move the mouse around the circular wheel (within the track band) and click to build power to 100%; then the overlay fades out and the report returns.
- **Presentation Mode**: Toggle (default ON) to enable or disable the inactivity mechanic.
- **blur/focus**: On Add-In blur, timers are paused and the UI is forced visible so the Add-In never comes back in a stuck black state. On focus, the inactivity timer is reset and the report is fully visible.

## Project structure

- `index.html` — Single page; no inline JS.
- `styles.css` — All styling (external only).
- `addin.js` — Add-In lifecycle (initialize, focus, blur), API calls, inactivity and generator logic.
- `manifest.json` — MyGeotab Add-In configuration (URL, path, menu name).

## GitHub Pages deployment

### Enable Pages

1. In your repo **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

### Workflow

The repository includes a workflow that deploys the **addins/safety-report** folder to GitHub Pages on every push to `main`. The workflow uses:

- `actions/upload-pages-artifact` — uploads the add-in files as the site artifact.
- `actions/deploy-pages` — deploys the artifact to GitHub Pages.

Required permissions for Pages are set in the workflow.

### GitHub Pages URL

After deployment:

- **Site root**: `https://aaymont.github.io/ubiquitous-barnacle/`
- **Add-In page**: `https://aaymont.github.io/ubiquitous-barnacle/index.html`

If the workflow is configured to publish from the `addins/safety-report` directory, the Add-In URL is:

- `https://aaymont.github.io/ubiquitous-barnacle/addins/safety-report/index.html`

Use the **exact URL** that serves `index.html` in the Add-In config (see below).

## Install Add-In into MyGeotab

1. **Enable unverified Add-Ins**: Administration → System Settings → Add-Ins → set **Allow unverified Add-Ins** to **Yes**.
2. **Add the Add-In**: Add a new Add-In and paste the configuration. You can use the contents of `manifest.json`, with the `url` set to your deployed page, for example:

```json
{
  "name": "Safety Report",
  "supportEmail": "https://github.com/aaymont/ubiquitous-barnacle",
  "version": "1.0.0",
  "items": [{
    "url": "https://aaymont.github.io/ubiquitous-barnacle/addins/safety-report/index.html",
    "path": "ActivityLink/",
    "menuName": { "en": "Safety Report" }
  }]
}
```

3. Replace the `url` with the **full URL to `index.html`** as served by GitHub Pages (see above).
4. Save. If the Add-In does not appear, do a hard refresh (e.g. Ctrl+Shift+R).

## Troubleshooting

- **HTTPS**: MyGeotab requires Add-Ins to be loaded over **HTTPS**. GitHub Pages is HTTPS by default.
- **Mixed content**: Ensure the Add-In page and all its resources (CSS, JS) are loaded from HTTPS. Do not reference `http://` assets.
- **Caching**: If you deploy changes and don’t see them, try a cache-busting query on the URL in the config, e.g. `.../index.html?v=2`, or a hard refresh in the browser.

## Tuning (constants in `addin.js`)

| Constant | Default | Meaning |
|----------|---------|--------|
| `INACTIVITY_MS` | 5000 | Inactivity delay (ms) before fade starts (5 s). |
| `FADE_MS` | 4000 | Fade duration (ms) from visible to black (4 s). |
| `ACTIVITY_THROTTLE_MS` | 250 | Mousemove counts as activity at most every 250 ms. |
| `POWER_DECAY_AFTER_MS` | 700 | Time (ms) without wheel motion before power starts decaying. |
| `POWER_PER_REVOLUTION` | 20 | Power gained per full revolution (2π) of cursor in track band (%). |
| `POWER_PER_CLICK` | 8 | Power gained per click on the wheel (%). |
| `WHEEL_INNER_R` / `WHEEL_OUTER_R` | 60 / 85 | Track band radii (in SVG units); motion only counts inside this ring. |

Restore animation duration is 250 ms (CSS `--transition-fast` and removal of overlay).

## Acceptance checklist

- Add-In loads in MyGeotab without console errors.
- Device dropdown is populated from the API.
- Selecting a device fetches and displays DeviceStatusInfo (Speed, Bearing, DateTime, Location, IsDeviceCommunicating); Refresh re-fetches.
- After 5 s inactivity, fade starts and the countdown ring animates over 4 s.
- Any activity during fade cancels blackout and restores quickly.
- When fully black, user must use the wheel (and clicks) to reach 100% power to restore.
- blur/focus do not leave the Add-In stuck black.
