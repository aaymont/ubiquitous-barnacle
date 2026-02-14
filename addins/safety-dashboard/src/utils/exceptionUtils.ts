import type { ExceptionEvent } from "../types/entities";

/**
 * Returns exception duration in seconds for display and aggregation.
 * Uses the Geotab ExceptionEvent.Duration property when present and valid;
 * otherwise computes from ActiveFrom and ActiveTo per the Geotab API
 * (ActiveFrom = start, ActiveTo = end of the violation).
 * @see https://developers.geotab.com/myGeotab/apiReference/objects/ExceptionEvent/
 */
export function getExceptionDurationSeconds(event: ExceptionEvent): number {
  const apiDuration = Number(event.duration);
  if (Number.isFinite(apiDuration) && apiDuration >= 0) {
    return apiDuration;
  }
  const from = event.activeFrom ? new Date(event.activeFrom).getTime() : NaN;
  const to = event.activeTo ? new Date(event.activeTo).getTime() : NaN;
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
    return 0;
  }
  return (to - from) / 1000;
}
