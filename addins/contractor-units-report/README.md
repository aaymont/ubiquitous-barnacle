# Contractor Units Activity Report

MyGeotab Add-In that generates a **Contractor Units Activity Report** for the group "Contractor Units" (entity id: b27A5). The report runs entirely in the browser inside MyGeotab (no backend or Data Connector). Data is fetched via the MyGeotab API only, and the report is exported as an Excel (.xlsx) file generated client-side.

## Features

- **Timeframe**: "This month", "Last month", or custom date range.
- **Scope**: Only devices in group **Contractor Units** (b27A5).
- **Home zones**: Uses zones whose ZoneType is the built-in **Home** type for "yard" / Start Home Zone logic.
- **Metrics**: Ignition on time, idling in/out of Start Home Zone, stops > 10 minutes with **street address** locations (outside home) via MyGeotab GetAddresses, break-adjusted stop count and stopped time.
- **Excel export**: One worksheet, frozen header row, column widths, duration formatting, filename `Contractor_Units_Activity_Report_YYYYMMDD-YYYYMMDD.xlsx`.

## Setup in MyGeotab

1. **Hosting**: The add-in is deployed to GitHub Pages. Base URL:
   - `https://aaymont.github.io/ubiquitous-barnacle/addins/contractor-units-report/`

2. **Add the Add-In**:
   - In MyGeotab go to **Administration** → **System** → **Add-Ins** (or **System Settings** → **Add-Ins**).
   - Enable **Allow unverified Add-Ins** if you use a custom add-in URL.
   - Add a new Add-In and paste the configuration. You can use the contents of `config.json` in this folder:
     - **Name**: Contractor Units Activity Report  
     - **URL**: `https://aaymont.github.io/ubiquitous-barnacle/addins/contractor-units-report/`  
     - **Path**: `ActivityLink/`  
     - **Menu name**: Contractor Units Activity Report  

   Or use the JSON from `config.json`:
   ```json
   {
     "name": "Contractor Units Activity Report",
     "supportEmail": "https://github.com/aaymont/ubiquitous-barnacle",
     "version": "1.0.0",
     "items": [{
       "url": "https://aaymont.github.io/ubiquitous-barnacle/addins/contractor-units-report/",
       "path": "ActivityLink/",
       "menuName": { "en": "Contractor Units Activity Report" }
     }]
   }
   ```

3. **Permissions**: The add-in needs access to:
   - **Devices** (to read devices in group b27A5)
   - **Zones** and **Zone types** (to resolve Home zones)
   - **Trips** (with date range)
   - **LogRecord** (for positions at trip start/stop and stop locations)
   - **GetAddresses** (reverse geocoding for stop street addresses)

   Ensure the MyGeotab user opening the add-in has permissions to these entities for the relevant groups.

## Known limitations

- **Stop locations**: For stops outside home, the add-in resolves coordinates to street addresses by trying the MyGeotab **GetAddresses** API first. If Geotab returns no address (or the call fails), it falls back to **OpenStreetMap Nominatim** (free, no API key; 1 request per second). If the stop is inside a known zone, the zone name is shown. If both lookups fail, coordinates (Lat,Long) are shown.
- **Large fleets / long ranges**: All work is done in the browser. Very large date ranges or many devices may cause slow runs or high memory use. Use bounded ranges (e.g. one month) for large fleets.
- **Group id**: The report is hardcoded to group **b27A5** ("Contractor Units"). To use another group, the add-in code would need to be changed or extended to support a group selector.
- **Home zone type**: The add-in looks for a ZoneType whose name contains "Home". If your database uses a different name, you may need to create or rename a ZoneType to match.

## Excel output

- One sheet named **Report**.
- Header row: bold, light fill, bottom border (when supported by the export library).
- Freeze top row and auto-filter are applied when supported; otherwise you can apply them in Excel after opening the file.
- Dates: YYYY-MM-DD. Durations: `[h]:mm` style (e.g. 1:30 for 1 h 30 min).
- Filename: `Contractor_Units_Activity_Report_YYYYMMDD-YYYYMMDD.xlsx`.

## Repository

- **GitHub**: [aaymont/ubiquitous-barnacle](https://github.com/aaymont/ubiquitous-barnacle)  
- Add-in path in repo: `addins/contractor-units-report/`

## Development

- **index.html**: Entry page and UI structure.
- **addin.js**: Add-in lifecycle, API calls, report computation, Excel build (SheetJS).
- **styles.css**: Geotab-like (Zenith-inspired) styling.
- **config.json**: MyGeotab Add-In configuration for GitHub Pages URL.

No build step is required; open `index.html` in a browser only for layout testing. Full functionality (API and export) runs inside MyGeotab when the add-in is loaded from the configured URL.
