import type { ExceptionEvent } from "../types/entities";
import { dateKey } from "./dateUtils";

export interface DriverRow {
  driverId: string;
  count: number;
  totalDuration: number;
  totalDistance: number;
  eventIds: string[];
}

export interface AssetRow {
  deviceId: string;
  count: number;
  totalDuration: number;
  totalDistance: number;
  eventIds: string[];
}

export interface RuleCount {
  ruleId: string;
  count: number;
}

export function aggregateByDriver(events: ExceptionEvent[]): DriverRow[] {
  const byDriver = new Map<string, { count: number; duration: number; distance: number; ids: string[] }>();
  for (const e of events) {
    const driverId = e.driver?.id ?? "unknown";
    const row = byDriver.get(driverId);
    const duration = e.duration ?? 0;
    const distance = e.distance ?? 0;
    if (!row) {
      byDriver.set(driverId, { count: 1, duration, distance, ids: [e.id] });
    } else {
      row.count += 1;
      row.duration += duration;
      row.distance += distance;
      row.ids.push(e.id);
    }
  }
  return Array.from(byDriver.entries()).map(([driverId, r]) => ({
    driverId,
    count: r.count,
    totalDuration: r.duration,
    totalDistance: r.distance,
    eventIds: r.ids,
  }));
}

export function aggregateByAsset(events: ExceptionEvent[]): AssetRow[] {
  const byDevice = new Map<string, { count: number; duration: number; distance: number; ids: string[] }>();
  for (const e of events) {
    const deviceId = e.device?.id ?? "unknown";
    const row = byDevice.get(deviceId);
    const duration = e.duration ?? 0;
    const distance = e.distance ?? 0;
    if (!row) {
      byDevice.set(deviceId, { count: 1, duration, distance, ids: [e.id] });
    } else {
      row.count += 1;
      row.duration += duration;
      row.distance += distance;
      row.ids.push(e.id);
    }
  }
  return Array.from(byDevice.entries()).map(([deviceId, r]) => ({
    deviceId,
    count: r.count,
    totalDuration: r.duration,
    totalDistance: r.distance,
    eventIds: r.ids,
  }));
}

export function topRulesByCount(events: ExceptionEvent[], n: number): RuleCount[] {
  const byRule = new Map<string, number>();
  for (const e of events) {
    const id = e.rule?.id ?? "unknown";
    byRule.set(id, (byRule.get(id) ?? 0) + 1);
  }
  return Array.from(byRule.entries())
    .map(([ruleId, count]) => ({ ruleId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function dailyCounts(events: ExceptionEvent[]): { date: string; count: number }[] {
  const byDate = new Map<string, number>();
  for (const e of events) {
    const key = dateKey(e.activeFrom);
    byDate.set(key, (byDate.get(key) ?? 0) + 1);
  }
  const entries = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([date, count]) => ({ date, count }));
}
