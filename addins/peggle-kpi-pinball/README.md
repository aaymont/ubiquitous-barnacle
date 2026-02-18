# Peggle KPI Pinball

**"Bounce your way to the story"** — A MyGeotab Custom Page Add-In that presents fleet KPIs as a Peggle-style pinball game. Bounce the ball to light up pegs and progressively reveal the report narrative.

## Setup

```bash
cd addins/peggle-kpi-pinball
npm install
npm run build
```

For local development:

```bash
npm run dev
```

## Add-In Install Instructions

1. Enable **Allow unverified Add-Ins** in MyGeotab: Administration > System Settings > Add-Ins > Yes.
2. Add the Add-In configuration. In MyGeotab: Administration > System Settings > Add-Ins > Add > paste the JSON below:

```json
{
  "name": "Peggle KPI Pinball",
  "supportEmail": "https://github.com/aaymont/ubiquitous-barnacle",
  "version": "1.0.0",
  "items": [
    {
      "url": "https://aaymont.github.io/ubiquitous-barnacle/addins/peggle-kpi-pinball/",
      "path": "ActivityLink/",
      "menuName": { "en": "Peggle KPI Pinball" }
    }
  ]
}
```

3. Save and open the add-in from the Activity menu.

## Deployment

The repository includes a workflow (`.github/workflows/deploy-pages-peggle.yml`) that deploys the add-in to GitHub Pages on push to `main` when files under `addins/peggle-kpi-pinball/` change.

- Build with Vite
- Output to `_site/addins/peggle-kpi-pinball/`
- Deploy via `actions/deploy-pages`

**Note:** If multiple add-in workflows exist, they may overwrite each other. Consider a unified workflow that builds all add-ins and merges into a single `_site` for multi-add-in deployment.

## Tuning Guide

### Peg Mapping

- **Power pegs** (orange): Top risk segment (highest KPI value), largest week-over-week delta.
- **Standard pegs** (blue): Individual KPIs per cluster.

Edit `pegBoardBuilder.ts` → `buildPegLayout()` to adjust cluster positions and which KPIs become power pegs.

### Physics

- **Bounce restitution**: `matterWorld.ts` → `addBall()` → `restitution: 0.9`
- **Gravity**: `matterWorld.ts` → `createMatterWorld()` → `gravity: { x: 0, y: 1 * GRAVITY_SCALE }`
- **Fixed timestep**: `matterWorld.ts` → `FIXED_TIMESTEP = 1/60`

### Scoring

- **Combo window**: `scoring.ts` → `COMBO_WINDOW_MS = 2000`
- **Win threshold**: `scoring.ts` → `WIN_SCORE_THRESHOLD = 500`
- **Power peg bonus**: `scoring.ts` → `POWER_PEG_BONUS = 100`

### KPI Thresholds

- **Speeding**: `derivedSafety.ts` → `SPEEDING_THRESHOLD_KMH = 100`
- **Harsh delta**: `derivedSafety.ts` → `HARSH_DELTA_KMH = 15`
- **After-hours**: `derivedSafety.ts` → `AFTER_HOURS_START`, `AFTER_HOURS_END`

## Troubleshooting

### GitHub Pages Base Path

- Vite uses `base: "./"` for relative asset paths.
- The workflow copies `dist/*` to `_site/addins/peggle-kpi-pinball/`.
- Ensure the Add-In URL ends with a trailing slash: `.../addins/peggle-kpi-pinball/`.

### Caching

If updates don’t appear after deploy, add a version query to the manifest URL:

```json
"url": "https://aaymont.github.io/ubiquitous-barnacle/addins/peggle-kpi-pinball/?v=2"
```

### Add-In Load Issues

- Verify `callback()` is called in `initialize` (see `lifecycle.ts`).
- Check the browser console for errors.
- Ensure the page loads in an iframe with the Geotab API available (`window.geotab`).
