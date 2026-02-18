import type { GeotabApi } from "../types/geotab";
import type { Device, DeviceStatusInfo, Trip } from "../types/entities";
import { getDevices, getDeviceStatus, getTrips, getLogRecords } from "../addin/geotabApi";
import { aggregateTripMetrics, formatDuration, formatDistance } from "./metrics";
import type { TripMetrics } from "./metrics";
import { deriveFromTrips, deriveFromLogRecords, mergeLogDerivatives } from "./derivedSafety";
import type { DerivedSafetyMetrics } from "./derivedSafety";
import { generateCsv, downloadCsv } from "./exportCsv";
import type { ExportState } from "./exportCsv";
import { buildPegBoard, dropBall, resetBoard, onSkipGame } from "../game/pegBoardBuilder";
import { isPhysicsFailed } from "../addin/lifecycle";
import { isPixiReady } from "../game/pixiStage";
import { VERSION_DISPLAY } from "../version";

function whenPixiReady(): Promise<void> {
  if (isPixiReady()) return Promise.resolve();
  return new Promise((resolve) => {
    const id = setInterval(() => {
      if (isPixiReady()) {
        clearInterval(id);
        resolve();
      }
    }, 50);
  });
}

const TIME_RANGES = [
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
] as const;

let devices: Device[] = [];
let currentDeviceId: string | null = null;
let currentTimeRangeDays = 7;
let currentMode: "explore" | "direct" = "explore";
let fullUnlocked = false;
let tripMetrics: TripMetrics | null = null;
let derivedMetrics: DerivedSafetyMetrics | null = null;
let deviceStatus: DeviceStatusInfo | null = null;
let trips: Trip[] = [];

export type ReportRevealCallback = (pegId: string) => void;
export type ComboUnlockCallback = () => void;

let onPegReveal: ReportRevealCallback | null = null;
let onComboUnlock: ComboUnlockCallback | null = null;

export function setReportCallbacks(pegReveal: ReportRevealCallback, comboUnlock: ComboUnlockCallback) {
  onPegReveal = pegReveal;
  onComboUnlock = comboUnlock;
}

export function revealPegReport(pegId: string) {
  const cardId = pegToCard(pegId);
  if (cardId) {
    const card = document.getElementById(cardId);
    if (card) card.classList.add("peg-lit");
  }
  onPegReveal?.(pegId);
}

export function unlockComboSection() {
  const next = getNextComboSection();
  if (next) showSection(next);
  onComboUnlock?.();
}

function pegToCard(pegId: string): string | null {
  const map: Record<string, string> = {
    speeding: "card-speeding",
    variance: "card-speeding",
    speedExtra: "card-speeding",
    harshAccel: "card-smoothness",
    harshBrake: "card-smoothness",
    smoothExtra: "card-smoothness",
    idle: "card-idle",
    longStop: "card-idle",
    idleExtra: "card-idle",
    afterHours: "card-compliance",
    complianceExtra: "card-compliance",
    deviceFresh: "card-health",
    healthExtra: "card-health",
  };
  return map[pegId] ?? null;
}

const COMBO_SECTIONS = ["section-a", "section-b", "section-c", "section-d"];

function getNextComboSection(): string | null {
  for (let i = 0; i < COMBO_SECTIONS.length; i++) {
    const id = COMBO_SECTIONS[i];
    const el = document.getElementById(id);
    if (el && el.classList.contains("hidden")) return id;
  }
  return null;
}

function showSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (el) el.classList.remove("hidden");
}

export function skipGameAndRevealAll() {
  fullUnlocked = true;
  for (const id of COMBO_SECTIONS) {
    showSection(id);
  }
  const msg = document.getElementById("full-report-msg");
  if (msg) msg.classList.remove("hidden");
  populateUnlockableSections();
  onSkipGame();
}

export function buildUI(api: GeotabApi) {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = `
    <div class="peggle-container">
      <div class="controls-row">
        <div class="control-group">
          <label for="device-select">Device</label>
          <select id="device-select">
            <option value="">— Select device —</option>
          </select>
        </div>
        <div class="control-group">
          <label for="time-range">Time Range</label>
          <select id="time-range">
            ${TIME_RANGES.map((r) => `<option value="${r.value}" ${r.value === "7" ? "selected" : ""}>${r.label}</option>`).join("")}
          </select>
        </div>
        <div class="control-group">
          <label for="mode-select">Mode</label>
          <select id="mode-select">
            <option value="explore">Explore (game unlocks)</option>
            <option value="direct">Direct (report only)</option>
          </select>
        </div>
        <div class="control-group btn-group">
          <button id="drop-ball-btn" type="button">Drop Ball</button>
          <button id="skip-game-btn" type="button">Skip Game: Show Full Report</button>
          <button id="reset-board-btn" type="button">Reset Board</button>
        </div>
        <div class="version-badge" title="Add-in version — update if you don't see your latest deploy">${VERSION_DISPLAY}</div>
      </div>

      <div class="split-view">
        <div class="report-panel">
          <div id="full-report-msg" class="full-report-msg hidden">Full Report Unlocked</div>
          <div class="summary-cards">
            <div id="card-speeding" class="card">
              <h3>Speeding</h3>
              <div class="card-value" data-metric="speeding">—</div>
              <div class="card-note">derived</div>
            </div>
            <div id="card-smoothness" class="card">
              <h3>Smoothness</h3>
              <div class="card-value" data-metric="smoothness">—</div>
              <div class="card-note">derived</div>
            </div>
            <div id="card-idle" class="card">
              <h3>Idle</h3>
              <div class="card-value" data-metric="idle">—</div>
            </div>
            <div id="card-compliance" class="card">
              <h3>Compliance</h3>
              <div class="card-value" data-metric="compliance">—</div>
              <div class="card-note">derived</div>
            </div>
            <div id="card-health" class="card">
              <h3>Device Freshness</h3>
              <div class="card-value" data-metric="health">—</div>
            </div>
          </div>
          <p class="timestamp">Last refresh: —</p>
          <p class="explainer">Bounce the ball to light up pegs and reveal deeper insights. Hit combos (3+ pegs in 2s) to unlock sections.</p>

          <div id="section-a" class="unlockable-section hidden">
            <h4>Section A: Trip Timeline</h4>
            <div id="trip-list" class="trip-list"></div>
          </div>
          <div id="section-b" class="unlockable-section hidden">
            <h4>Section B: Top Anomalies</h4>
            <div id="anomalies-list" class="anomalies-list"></div>
          </div>
          <div id="section-c" class="unlockable-section hidden">
            <h4>Section C: Segment Comparison</h4>
            <div id="segment-comparison" class="segment-comparison"></div>
          </div>
          <div id="section-d" class="unlockable-section hidden">
            <h4>Section D: Export Preview</h4>
            <div id="export-preview" class="export-preview"></div>
          </div>

          <div class="export-row">
            <button id="export-csv-btn" type="button">Export CSV</button>
          </div>

          <div id="error-panel" class="error-panel hidden">
            <div class="error-message"></div>
            <details class="error-details">
              <summary>Technical details</summary>
              <pre class="error-pre"></pre>
            </details>
          </div>
        </div>

        <div class="game-panel">
          <div id="canvas-container" class="canvas-container"></div>
          <div id="loading-overlay" class="loading-overlay">
            <p>Select a device and load data</p>
          </div>
        </div>
      </div>
    </div>
  `;

  bindControls(api);
}

function bindControls(api: GeotabApi) {
  const deviceSelect = document.getElementById("device-select") as HTMLSelectElement;
  const timeRange = document.getElementById("time-range") as HTMLSelectElement;
  const modeSelect = document.getElementById("mode-select") as HTMLSelectElement;
  const dropBtn = document.getElementById("drop-ball-btn");
  const skipBtn = document.getElementById("skip-game-btn");
  const resetBtn = document.getElementById("reset-board-btn");
  const exportBtn = document.getElementById("export-csv-btn");

  deviceSelect?.addEventListener("change", () => {
    currentDeviceId = deviceSelect.value || null;
    loadData(api);
  });

  timeRange?.addEventListener("change", () => {
    currentTimeRangeDays = parseInt(timeRange.value || "7", 10);
    loadData(api);
  });

  modeSelect?.addEventListener("change", () => {
    currentMode = modeSelect.value === "direct" ? "direct" : "explore";
    if (currentMode === "direct") skipGameAndRevealAll();
  });

  dropBtn?.addEventListener("click", () => {
    if (!currentDeviceId || !tripMetrics || !derivedMetrics) {
      return;
    }
    dropBall();
  });

  skipBtn?.addEventListener("click", () => skipGameAndRevealAll());

  resetBtn?.addEventListener("click", () => {
    fullUnlocked = false;
    for (const id of COMBO_SECTIONS) {
      document.getElementById(id)?.classList.add("hidden");
    }
    document.getElementById("full-report-msg")?.classList.add("hidden");
    resetBoard();
    if (currentDeviceId && tripMetrics && derivedMetrics) {
      buildPegBoard(currentDeviceId, tripMetrics, derivedMetrics, deviceStatus);
    }
  });

  exportBtn?.addEventListener("click", () => exportCsv());
}

export function loadDevices(api: GeotabApi) {
  getDevices(api)
    .then((list) => {
      devices = list;
      const select = document.getElementById("device-select") as HTMLSelectElement;
      if (!select) return;
      select.innerHTML = '<option value="">— Select device —</option>';
      for (const d of list) {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = d.name ?? d.id;
        select.appendChild(opt);
      }
    })
    .catch((err) => showError("Failed to load devices", err));
}

async function loadData(api: GeotabApi) {
  if (!currentDeviceId) {
    hideLoading();
    updateSummaryCards(null, null, null);
    return;
  }

  showLoading();
  hideError();

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - currentTimeRangeDays);
  const fromStr = fromDate.toISOString();
  const toStr = toDate.toISOString();

  try {
    const [status, tripList] = await Promise.all([
      getDeviceStatus(api, currentDeviceId),
      getTrips(api, currentDeviceId, fromStr, toStr),
    ]);

    deviceStatus = status;
    trips = tripList;

    const metrics = aggregateTripMetrics(trips);
    tripMetrics = metrics;

    let derived = deriveFromTrips(trips);
    try {
      const logs = await getLogRecords(api, currentDeviceId, fromStr, toStr);
      const logDerived = deriveFromLogRecords(logs);
      derived = mergeLogDerivatives(derived, logDerived);
    } catch {
      // keep trip-only derived
    }
    derivedMetrics = derived;

    updateSummaryCards(metrics, derived, status);
    updateTimestamp();

    if (!isPhysicsFailed()) {
      await whenPixiReady();
      buildPegBoard(currentDeviceId, metrics, derived, status);
      if (currentMode === "explore") dropBall();
      hideLoading();
    } else {
      skipGameAndRevealAll();
      hideLoading();
    }

    populateUnlockableSections();

    if (currentMode === "direct") {
      skipGameAndRevealAll();
    }
  } catch (err) {
    showError("Failed to load data", err);
    hideLoading();
  }
}

function updateSummaryCards(
  metrics: TripMetrics | null,
  derived: DerivedSafetyMetrics | null,
  status: DeviceStatusInfo | null
) {
  const speedingEl = document.querySelector('[data-metric="speeding"]');
  const smoothnessEl = document.querySelector('[data-metric="smoothness"]');
  const idleEl = document.querySelector('[data-metric="idle"]');
  const complianceEl = document.querySelector('[data-metric="compliance"]');
  const healthEl = document.querySelector('[data-metric="health"]');

  if (speedingEl) {
    speedingEl.textContent = derived ? `${derived.speedingTimeProxySeconds}s proxy` : "—";
  }
  if (smoothnessEl) {
    smoothnessEl.textContent = derived ? `Accel: ${derived.harshAccelProxy} / Brake: ${derived.harshBrakeProxy}` : "—";
  }
  if (idleEl) {
    idleEl.textContent = metrics ? formatDuration(metrics.totalIdlingTimeSeconds) : "—";
  }
  if (complianceEl) {
    complianceEl.textContent = derived ? `${derived.afterHoursProxyMinutes} min proxy` : "—";
  }
  if (healthEl) {
    if (status) {
      const comm = status.isDeviceCommunicating ? "Communicating" : "Offline";
      const dt = status.dateTime ? new Date(status.dateTime).toLocaleString() : "—";
      healthEl.textContent = `${comm} | ${dt}`;
    } else {
      healthEl.textContent = "—";
    }
  }
}

function updateTimestamp() {
  const el = document.querySelector(".timestamp");
  if (el) el.textContent = `Last refresh: ${new Date().toLocaleString()}`;
}

function showLoading() {
  document.getElementById("loading-overlay")?.classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loading-overlay")?.classList.add("hidden");
}

function showError(message: string, err: unknown) {
  const panel = document.getElementById("error-panel");
  const msgEl = panel?.querySelector(".error-message");
  const preEl = panel?.querySelector(".error-pre");
  if (panel) panel.classList.remove("hidden");
  if (msgEl) msgEl.textContent = message;
  if (preEl) preEl.textContent = typeof err === "string" ? err : JSON.stringify(err, null, 2);
}

function hideError() {
  document.getElementById("error-panel")?.classList.add("hidden");
}

function exportCsv() {
  const device = devices.find((d) => d.id === currentDeviceId);
  const deviceName = device?.name ?? currentDeviceId ?? "Unknown";

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - currentTimeRangeDays);

  const anomalies = buildAnomaliesList();
  const segments = buildSegmentComparison();

  const state: ExportState = {
    deviceName,
    timeRange: `${currentTimeRangeDays} days`,
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
    tripMetrics: tripMetrics ?? {
      totalDrivingTimeSeconds: 0,
      totalDistanceMeters: 0,
      totalIdlingTimeSeconds: 0,
      averageSpeedKmh: 0,
      maxSpeedKmh: 0,
      tripCount: 0,
      stopCountProxy: 0,
    },
    derivedMetrics: derivedMetrics ?? {
      speedingTimeProxySeconds: 0,
      speedVarianceProxy: 0,
      harshAccelProxy: 0,
      harshBrakeProxy: 0,
      afterHoursProxyMinutes: 0,
      longStopCount: 0,
    },
    deviceFreshness: deviceStatus?.dateTime ?? null,
    trips,
    anomalies,
    segmentComparison: segments,
    fullUnlocked,
  };

  const csv = generateCsv(state);
  const filename = `peggle-kpi-${deviceName.replace(/[^a-z0-9]/gi, "-")}-${fromDate.toISOString().slice(0, 10)}.csv`;
  downloadCsv(csv, filename);
}

function buildAnomaliesList(): Array<{ tripId: string; label: string; value: string }> {
  const list: Array<{ tripId: string; label: string; value: string }> = [];
  if (!trips.length) return list;

  const byVariance = [...trips].sort((a, b) => {
    const va = (a.maximumSpeed ?? 0) - (a.averageSpeed ?? 0);
    const vb = (b.maximumSpeed ?? 0) - (b.averageSpeed ?? 0);
    return vb - va;
  });
  for (const t of byVariance.slice(0, 5)) {
    list.push({
      tripId: t.id,
      label: "Speed variance",
      value: `${(t.maximumSpeed ?? 0).toFixed(0)} - ${(t.averageSpeed ?? 0).toFixed(0)} km/h`,
    });
  }

  const byIdle = [...trips].sort((a, b) => {
    const ia = a.idlingDuration?.totalSeconds ?? 0;
    const ib = b.idlingDuration?.totalSeconds ?? 0;
    return ib - ia;
  });
  for (const t of byIdle.slice(0, 3)) {
    const sec = t.idlingDuration?.totalSeconds ?? 0;
    if (sec > 300) {
      list.push({ tripId: t.id, label: "Long stop", value: formatDuration(sec) });
    }
  }
  return list;
}

function buildSegmentComparison(): Array<{ bucket: string; value: string }> {
  const byDay: Record<number, { count: number; dist: number }> = {};
  for (const t of trips) {
    const d = new Date(t.start);
    const day = d.getDay();
    if (!byDay[day]) byDay[day] = { count: 0, dist: 0 };
    byDay[day].count++;
    byDay[day].dist += t.distance ?? 0;
  }
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return Object.entries(byDay).map(([day, v]) => ({
    bucket: days[parseInt(day, 10)],
    value: `${v.count} trips, ${(v.dist / 1000).toFixed(1)} km`,
  }));
}

export function destroyUI() {
  const app = document.getElementById("app");
  if (app) app.innerHTML = "";
}

export function populateUnlockableSections() {
  const tripListEl = document.getElementById("trip-list");
  if (tripListEl) {
    tripListEl.innerHTML = trips
      .slice(0, 20)
      .map(
        (t) =>
          `<div class="trip-row">${t.start} — ${formatDistance(t.distance ?? 0)} — ${formatDuration((t.drivingDuration?.totalSeconds ?? 0))}</div>`
      )
      .join("");
  }

  const anomaliesEl = document.getElementById("anomalies-list");
  if (anomaliesEl) {
    const anomalies = buildAnomaliesList();
    anomaliesEl.innerHTML = anomalies.map((a) => `<div class="anomaly-row">${a.label}: ${a.value}</div>`).join("");
  }

  const segmentEl = document.getElementById("segment-comparison");
  if (segmentEl) {
    const segments = buildSegmentComparison();
    segmentEl.innerHTML = segments.map((s) => `<div class="segment-row">${s.bucket}: ${s.value}</div>`).join("");
  }

  const exportPreviewEl = document.getElementById("export-preview");
  if (exportPreviewEl) {
    exportPreviewEl.textContent = fullUnlocked
      ? "Full export available. Click Export CSV."
      : "Unlocked sections will be included in export.";
  }
}
