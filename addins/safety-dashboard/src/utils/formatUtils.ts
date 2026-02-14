export function formatDuration(seconds: number | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

export function formatDistance(km: number | undefined): string {
  if (km == null || Number.isNaN(km)) return "—";
  if (km < 1) return `${(km * 1000).toFixed(0)} m`;
  return `${km.toFixed(2)} km`;
}

export function formatPer1000Km(count: number, totalKm: number): string {
  if (totalKm <= 0 || !Number.isFinite(totalKm)) return count.toFixed(1);
  return (count / (totalKm / 1000)).toFixed(2);
}
