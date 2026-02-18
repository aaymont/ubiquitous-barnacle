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

The repository uses a unified workflow (`.github/workflows/deploy-pages-unified.yml`) that builds all add-ins and deploys to GitHub Pages on push to `main` when files under `addins/` change.

- Build with Vite
- Output to `_site/addins/peggle-kpi-pinball/`
- Deploy via `actions/deploy-pages`


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

If updates don’t appear after deploy, the deploy workflow adds cache busting via git SHA; bump the version query to force refresh:

```json
"url": "https://aaymont.github.io/ubiquitous-barnacle/addins/peggle-kpi-pinball/?v=1.0.1"
```

### Script could not be loaded: `/src/main.ts` or MIME type `video/mp2t`

This happens when **GitHub Pages serves source files instead of the built output**. The page must serve the built `index.html` (which loads `./assets/index-xxx.js`), not the dev `index.html` (which loads `/src/main.ts`).

**Fix:** Ensure GitHub Pages uses **GitHub Actions** as the source, not "Deploy from a branch":

1. Go to the repo: **Settings → Pages**
2. Under **Build and deployment → Source**, select **GitHub Actions** (not "Deploy from a branch")

If Pages is set to "Deploy from a branch", it serves the raw repo (including source files). The unified workflow (`.github/workflows/deploy-pages-unified.yml`) builds the add-ins and deploys the correct output; that output is only used when Source is "GitHub Actions".

### Add-In Load Issues

- Verify `callback()` is called in `initialize` (see `lifecycle.ts`).
- Check the browser console for errors.
- Ensure the page loads in an iframe with the Geotab API available (`window.geotab`).
