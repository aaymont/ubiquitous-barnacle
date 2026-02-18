import type { Trip } from "../types/entities";

export interface TripMetrics {
  totalDrivingTimeSeconds: number;
  totalDistanceMeters: number;
  totalIdlingTimeSeconds: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  tripCount: number;
  stopCountProxy: number;
}

export function aggregateTripMetrics(trips: Trip[]): TripMetrics {
  let totalDrivingSeconds = 0;
  let totalDistance = 0;
  let totalIdlingSeconds = 0;
  let speedSum = 0;
  let speedCount = 0;
  let maxSpeed = 0;
  let stopCount = 0;

  for (const t of trips) {
    if (t.drivingDuration?.totalSeconds != null) {
      totalDrivingSeconds += t.drivingDuration.totalSeconds;
    }
    if (t.distance != null) {
      totalDistance += t.distance;
    }
    if (t.idlingDuration?.totalSeconds != null) {
      totalIdlingSeconds += t.idlingDuration.totalSeconds;
      if (t.idlingDuration.totalSeconds > 60) stopCount++;
    }
    if (t.averageSpeed != null && t.averageSpeed > 0) {
      speedSum += t.averageSpeed;
      speedCount++;
    }
    if (t.maximumSpeed != null && t.maximumSpeed > maxSpeed) {
      maxSpeed = t.maximumSpeed;
    }
  }

  const averageSpeedKmh = speedCount > 0 ? speedSum / speedCount : 0;

  return {
    totalDrivingTimeSeconds: totalDrivingSeconds,
    totalDistanceMeters: totalDistance,
    totalIdlingTimeSeconds: totalIdlingSeconds,
    averageSpeedKmh,
    maxSpeedKmh: maxSpeed,
    tripCount: trips.length,
    stopCountProxy: stopCount,
  };
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.round(seconds)}s`;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}
