import type { AbortSignal } from "./api/geotabApi";

let currentAbortSignal: AbortSignal | null = null;

export function registerAbortSignal(signal: AbortSignal | null) {
  currentAbortSignal = signal;
}

export function abortCurrent() {
  if (currentAbortSignal) {
    currentAbortSignal.aborted = true;
    currentAbortSignal = null;
  }
}
