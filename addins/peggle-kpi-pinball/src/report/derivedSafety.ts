import type { Trip, LogRecord } from "../types/entities";

const SPEEDING_THRESHOLD_KMH = 100;
const HARSH_DELTA_KMH = 15;
const AFTER_HOURS_START = 22; // 10 PM
const AFTER_HOURS_END = 6; // 6 AM

export interface DerivedSafetyMetrics {
  speedingTimeProxySeconds: number;
  speedVarianceProxy: number;
  harshAccelProxy: number;
  harshBrakeProxy: number;
  afterHoursProxyMinutes: number;
  longStopCount: number;
}

export function deriveFromTrips(trips: Trip[]): DerivedSafetyMetrics {
  let speedingSeconds = 0;
  let speedSum = 0;
  let speedSqSum = 0;
  let speedCount = 0;
  let harshAccel = 0;
  let harshBrake = 0;
  let afterHoursMinutes = 0;
  let longStopCount = 0;

  for (const t of trips) {
    const avgSpeed = t.averageSpeed ?? 0;
    const maxSpeed = t.maximumSpeed ?? 0;
    const drivingSeconds = t.drivingDuration?.totalSeconds ?? 0;
    const idleSeconds = t.idlingDuration?.totalSeconds ?? 0;

    if (avgSpeed > SPEEDING_THRESHOLD_KMH && drivingSeconds > 0) {
      speedingSeconds += drivingSeconds * Math.min(1, (avgSpeed - SPEEDING_THRESHOLD_KMH) / 50);
    }
    if (maxSpeed > SPEEDING_THRESHOLD_KMH) {
      speedingSeconds += 30;
    }

    if (avgSpeed > 0) {
      speedSum += avgSpeed;
      speedSqSum += avgSpeed * avgSpeed;
      speedCount++;
    }

    if (idleSeconds > 300) longStopCount++;

    const startDate = new Date(t.start);
    const stopDate = new Date(t.stop);
    const startHour = startDate.getHours();
    const stopHour = stopDate.getHours();
    if (startHour >= AFTER_HOURS_START || startHour < AFTER_HOURS_END) {
      afterHoursMinutes += drivingSeconds / 60;
    }
    if (stopHour >= AFTER_HOURS_START || stopHour < AFTER_HOURS_END) {
      afterHoursMinutes += drivingSeconds / 60 * 0.5;
    }
  }

  const meanSpeed = speedCount > 0 ? speedSum / speedCount : 0;
  const variance = speedCount > 0 ? speedSqSum / speedCount - meanSpeed * meanSpeed : 0;
  const speedVariance = Math.max(0, Math.sqrt(variance));

  return {
    speedingTimeProxySeconds: Math.round(speedingSeconds),
    speedVarianceProxy: Math.round(speedVariance * 10) / 10,
    harshAccelProxy: harshAccel,
    harshBrakeProxy: harshBrake,
    afterHoursProxyMinutes: Math.round(afterHoursMinutes),
    longStopCount,
  };
}

export function deriveFromLogRecords(logs: LogRecord[]): { harshAccel: number; harshBrake: number } {
  let harshAccel = 0;
  let harshBrake = 0;

  const sorted = [...logs].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevSpeed = prev.speed ?? 0;
    const currSpeed = curr.speed ?? 0;
    const delta = currSpeed - prevSpeed;
    const dt = (new Date(curr.dateTime).getTime() - new Date(prev.dateTime).getTime()) / 1000;
    if (dt <= 0 || dt > 5) continue;

    const deltaPerSec = delta / dt;
    if (deltaPerSec > HARSH_DELTA_KMH) harshAccel++;
    if (deltaPerSec < -HARSH_DELTA_KMH) harshBrake++;
  }

  return { harshAccel, harshBrake };
}

export function mergeLogDerivatives(
  tripDerived: DerivedSafetyMetrics,
  logDerived: { harshAccel: number; harshBrake: number }
): DerivedSafetyMetrics {
  return {
    ...tripDerived,
    harshAccelProxy: logDerived.harshAccel,
    harshBrakeProxy: logDerived.harshBrake,
  };
}
