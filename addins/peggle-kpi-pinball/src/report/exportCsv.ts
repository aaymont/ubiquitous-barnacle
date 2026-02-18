import type { Trip } from "../types/entities";
import type { TripMetrics } from "./metrics";
import type { DerivedSafetyMetrics } from "./derivedSafety";

export interface ExportState {
  deviceName: string;
  timeRange: string;
  fromDate: string;
  toDate: string;
  tripMetrics: TripMetrics;
  derivedMetrics: DerivedSafetyMetrics;
  deviceFreshness: string | null;
  trips: Trip[];
  anomalies: Array<{ tripId: string; label: string; value: string }>;
  segmentComparison: Array<{ bucket: string; value: string }>;
  fullUnlocked: boolean;
}

export function generateCsv(state: ExportState): string {
  const rows: string[] = [];

  rows.push("Peggle KPI Pinball - Export");
  rows.push(`Device,${escapeCsv(state.deviceName)}`);
  rows.push(`Time Range,${escapeCsv(state.timeRange)}`);
  rows.push(`From,${escapeCsv(state.fromDate)}`);
  rows.push(`To,${escapeCsv(state.toDate)}`);
  rows.push(`Last Refresh,${new Date().toISOString()}`);
  rows.push("");

  rows.push("Summary Metrics");
  rows.push("Metric,Value");
  rows.push(`Total Driving Time,${formatDuration(state.tripMetrics.totalDrivingTimeSeconds)}`);
  rows.push(`Total Distance,${(state.tripMetrics.totalDistanceMeters / 1000).toFixed(2)} km`);
  rows.push(`Total Idling Time,${formatDuration(state.tripMetrics.totalIdlingTimeSeconds)}`);
  rows.push(`Average Speed,${state.tripMetrics.averageSpeedKmh.toFixed(1)} km/h`);
  rows.push(`Max Speed,${state.tripMetrics.maxSpeedKmh.toFixed(1)} km/h`);
  rows.push(`Trip Count,${state.tripMetrics.tripCount}`);
  rows.push(`Speeding Proxy (derived),${state.derivedMetrics.speedingTimeProxySeconds}s`);
  rows.push(`Speed Variance (derived),${state.derivedMetrics.speedVarianceProxy}`);
  rows.push(`Harsh Accel Proxy (derived),${state.derivedMetrics.harshAccelProxy}`);
  rows.push(`Harsh Brake Proxy (derived),${state.derivedMetrics.harshBrakeProxy}`);
  rows.push(`After-Hours Proxy (derived),${state.derivedMetrics.afterHoursProxyMinutes} min`);
  rows.push(`Device Freshness,${state.deviceFreshness ?? "—"}`);
  rows.push("");

  if (state.fullUnlocked || state.trips.length > 0) {
    rows.push("Trip List");
    rows.push("Start,Stop,Distance (km),Driving Time,Idling Time,Avg Speed (km/h)");
    for (const t of state.trips.slice(0, 100)) {
      const dist = (t.distance ?? 0) / 1000;
      const driveSec = t.drivingDuration?.totalSeconds ?? 0;
      const idleSec = t.idlingDuration?.totalSeconds ?? 0;
      const avg = t.averageSpeed ?? 0;
      rows.push(`${t.start},${t.stop},${dist.toFixed(2)},${formatDuration(driveSec)},${formatDuration(idleSec)},${avg.toFixed(1)}`);
    }
    rows.push("");
  }

  if (state.fullUnlocked || state.anomalies.length > 0) {
    rows.push("Top Anomalies");
    rows.push("Trip,Label,Value");
    for (const a of state.anomalies) {
      rows.push(`${a.tripId},${escapeCsv(a.label)},${escapeCsv(a.value)}`);
    }
    rows.push("");
  }

  if (state.fullUnlocked || state.segmentComparison.length > 0) {
    rows.push("Segment Comparison");
    rows.push("Bucket,Value");
    for (const s of state.segmentComparison) {
      rows.push(`${escapeCsv(s.bucket)},${escapeCsv(s.value)}`);
    }
  }

  return rows.join("\n");
}

function escapeCsv(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.round(seconds)}s`;
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
