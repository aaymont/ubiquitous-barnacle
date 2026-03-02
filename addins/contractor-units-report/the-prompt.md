You are building a production-ready MyGeotab Add-In (runs inside MyGeotab in an iframe) that generates a Geotab-styled report and exports it to Excel. The add-in must run 100% in the browser with no backend server. It will be hosted on GitHub Pages.

PRIMARY GOAL
Create a “Contractor Units Activity Report” that:
1) Lets the user pick a timeframe: “This month”, “Last month”, or “Custom range”.
2) Filters data to ONLY the Group “Contractor Units” with entity id: b27A5.
3) Treats “Home zones” as zones whose ZoneType is the built-in “Home” type.
4) Computes ignition on time, idling time in/out of zone, and stop metrics with break adjustments.
5) Exports an Excel file that looks like a standard downloaded Geotab report (clean header row styling, zebra rows, proper date/time formatting, frozen header, auto filters, column widths).

NON-NEGOTIABLE CONSTRAINTS
- No backend, no Data Connector server calls. Use MyGeotab API only via the add-in session (api.call). Add-ins cannot use the OData Data Connector because it requires Basic Auth on a separate server. :contentReference[oaicite:1]{index=1}
- Must be efficient: never “get everything”. Always bound calls by the selected date range. :contentReference[oaicite:2]{index=2}
- Output must be an .xlsx file generated client-side (use SheetJS/xlsx or ExcelJS via CDN).
- UI must match MyGeotab look using Zenith styling conventions: Geotab-like typography, spacing, table styling, and controls.

REPORT DEFINITION
For each Device in Group b27A5, for each day in the selected date range (daily rows), produce:

IDENTIFIERS
- Date (local)
- Device name
- Device id
- Group (always Contractor Units)

YARD AND HOME LOGIC
- “Yard” is geofenced and is a Home zone.
- Determine the “Start Home Zone” per day:
  - Identify the first trip start location for the day. If it is within any Home zone, that zone is the Start Home Zone.
  - If not in a Home zone at first trip start, find the most recent Home zone visited before that time within a reasonable lookback window (same day 00:00 to first start time). If none, leave blank.
- All “in zone / out of zone” comparisons use the Start Home Zone as the reference “Home” for that day.

IGNITION ON TIME AND IDLING
- Ignition on time per day (duration).
- Idling time split into:
  - Idle in zone (within Start Home Zone boundary)
  - Idle out of zone (everywhere else)
Notes:
- In MyGeotab, idling is logged when engine running, vehicle stationary beyond threshold (commonly 200 seconds). Use available trip idle values where possible, otherwise derive from exception events or log records. :contentReference[oaicite:3]{index=3}
- The Trip object provides trip summaries and includes idling-related fields in many configurations; confirm what’s available and prefer those to heavy per-point reconstruction. :contentReference[oaicite:4]{index=4}

TRAVEL HISTORY STOP METRICS (STOPS > 10 MINUTES)
- A “stop” is any continuous stopped period longer than 10 minutes.
- For each day:
  - Stop Count (stops longer than 10 minutes)
  - Stop Locations (only stops outside home): return a semicolon-separated list of human-readable locations (lat/long reverse geocode is not allowed without a backend; instead use:
    - nearest Zone name if within a known zone; else
    - “Lat,Long” with 5 decimals)
  - Total Stopped Time (sum of stops longer than 10 minutes)

BREAK ADJUSTMENT LOGIC (REDUCE STOP COUNT AND STOPPED TIME)
- Determine “shift duration” per day:
  - ShiftStart = first ignition/trip start time that day
  - ShiftEnd = last ignition/trip end time that day
  - ShiftDuration = ShiftEnd - ShiftStart
- Allowed break duration by shift:
  - 0–4 hours: 15 minutes
  - 4–8 hours: 30 minutes
  - 8+ hours: 45 minutes
- Break adjustment rule:
  - Identify the single stop whose duration is closest to (but not less than) the allowed break duration, and treat it as “break”.
  - Reduce Stop Count by 1.
  - Reduce Total Stopped Time by the break stop duration, but cap the reduction to the allowed break duration (so if the chosen stop is 52 minutes and allowed is 45, reduce by 45, not 52).
  - Track these extra columns:
    - Allowed Break (minutes)
    - Break Stop Matched (minutes)
    - Adjusted Stop Count
    - Adjusted Stopped Time

DATA SOURCES AND API PLAN (MYGEOTAB API)
Use MyGeotab API entities and calls via api.call("Get", ...). Prefer these patterns:
1) Get Devices scoped to group b27A5
   - Get(Device, search: { groups: [{ id: "b27A5" }] })
2) Get Zones that are Home zones
   - Get(ZoneType) to find the built-in Home type (or filter by name “Home”)
   - Get(Zone, search: { zoneTypes: [HomeZoneTypeId] })
Zone types include Home as a built-in type. :contentReference[oaicite:5]{index=5}
3) Trips in range per device (batched by day or by device with fromDate/toDate)
   - Get(Trip, search: { deviceSearch: { id: deviceId } }, fromDate, toDate)
Trip definition: trips start when vehicle starts moving and end when it restarts and begins being driven again. :contentReference[oaicite:6]{index=6}
4) Stopped periods:
   - First choice: derive from Trip stopDuration / trip boundaries if available (end-of-trip stopped time is commonly represented in trip-related fields; validate in returned payload).
   - If needed: use LogRecord for finer segmentation (but keep bounded and only for the devices and dates requested).
Geotab JS SDK samples show the canonical approach: Device -> Trip -> LogRecord. :contentReference[oaicite:7]{index=7}

UI REQUIREMENTS
- Use a simple Geotab-like layout:
  - Title, description line (group and timeframe)
  - Date picker controls (Last month, This month, Custom with start/end)
  - Generate button
  - Progress indicator with counts (devices processed, days processed)
  - Preview table (first 200 rows) with sorting and filtering
  - Export to Excel button
- Styling must resemble MyGeotab report tables (Zenith-like look). Use minimal custom CSS and rely on Geotab look and feel.

EXCEL EXPORT REQUIREMENTS
- One worksheet named “Report”.
- Freeze top row.
- Auto filter on header row.
- Column widths set for readability.
- Dates formatted as YYYY-MM-DD, times as HH:MM.
- Durations formatted as [h]:mm.
- Header row: bold, light fill, bottom border.
- Zebra striping for data rows.
- Filename: Contractor_Units_Activity_Report_YYYYMMDD-YYYYMMDD.xlsx

TECHNICAL STRUCTURE (FILES)
Create a small static site that GitHub Pages can host:
- /addins/contractor-units-report/index.html
- /addins/contractor-units-report/addin.js
- /addins/contractor-units-report/styles.css
- /addins/contractor-units-report/lib/ (optional if bundling libs locally)
Use CDN for xlsx/ExcelJS if simplest, but pin exact versions.

GITHUB PAGES DEPLOYMENT
Add a GitHub Actions workflow that deploys the /addins/contractor-units-report folder to GitHub Pages on each push to main.
Include clear README setup steps:
- How to add the Add-In in MyGeotab (Add-In URL pointing to GitHub Pages index.html)
- Required permissions (zones, trips, devices)
- Known limitations (no reverse geocode, large fleets need bounded ranges)

ACCEPTANCE CRITERIA
- Works in MyGeotab with no server.
- Correctly scopes to group b27A5.
- Correctly uses Home zone type for yard logic.
- Generates accurate stop counts (>10 min), stopped time, and break-adjusted values.
- Idling is split in-zone vs out-of-zone using the Start Home Zone.
- Excel exports cleanly and looks like a Geotab report export.

DELIVERABLE
Implement the add-in end-to-end with working UI, API calls, computations, and .xlsx export. Include careful error handling and user-friendly messages when permissions/data are missing.