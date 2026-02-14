# Safety Dashboard (MyGeotab Add-In)

Production MyGeotab Page Add-In that shows safety exception KPIs, filters (date range, group, rules, view by driver/asset), and drill-down panels with trend charts and event tables. Hosted on GitHub Pages.

## Tech stack

- **Vite** + **React** + **TypeScript**
- **Recharts** for lightweight charts
- MyGeotab API only (no mock data, no OData/Data Connector)

## Run locally

```bash
cd addins/safety-dashboard
npm install
npm run dev
```

Open the dev server URL (e.g. `http://localhost:5173`). The add-in expects to run inside MyGeotab; for local testing you may need to load it in an iframe from MyGeotab or use the same origin for the add-in URL in your Add-In config.

## Build

```bash
npm run build
```

Produces `dist/` with `index.html` and hashed assets, suitable for static hosting. Asset paths use base path `/ubiquitous-barnacle/addins/safety-dashboard/` for GitHub Pages.

## Deploy (GitHub Pages)

1. Push to `main` (changes under `addins/safety-dashboard/` or the workflow file trigger the workflow).
2. The GitHub Action builds the add-in and deploys to GitHub Pages so the add-in is available at:
   - **https://aaymont.github.io/ubiquitous-barnacle/addins/safety-dashboard/**
3. In MyGeotab: **Administration → System Settings → Add-Ins**, enable "Allow unverified Add-Ins", then add the configuration JSON (see below).

## MyGeotab Add-In configuration JSON

Use this in **Administration → System Settings → Add-Ins** (paste into the Add-In configuration):

```json
{
  "name": "Safety Dashboard",
  "supportEmail": "https://github.com/aaymont/ubiquitous-barnacle",
  "version": "1.0",
  "isSigned": false,
  "items": [
    {
      "url": "https://aaymont.github.io/ubiquitous-barnacle/addins/safety-dashboard/",
      "path": "ActivityLink",
      "menuName": { "en": "Safety Dashboard" }
    }
  ]
}
```

- **name**: Display name of the add-in.
- **supportEmail**: Link to the repo (MyGeotab accepts URLs here).
- **version**: Semantic version string.
- **isSigned**: `false` for custom/unverified add-ins.
- **items**: One page item that opens the Safety Dashboard at the GitHub Pages URL. Optional: add a second object with `"path": "ActivityLink"` and a different `menuName` if you want a menu link as well; the above single item is the page that loads the dashboard.

To add a menu link in addition to the page (optional), you can add another entry, for example:

```json
{
  "url": "https://aaymont.github.io/ubiquitous-barnacle/addins/safety-dashboard/",
  "path": "ActivityLink/",
  "menuName": { "en": "Safety Dashboard" }
}
```

A single item with `path: "ActivityLink"` is sufficient to show the page in the activity menu and load the dashboard.
