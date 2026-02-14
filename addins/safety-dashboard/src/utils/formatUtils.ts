export function formatDuration(seconds: number | undefined | null): string {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 60) return `${Math.round(n)}s`;
  const m = Math.floor(n / 60);
  const s = Math.round(n % 60);
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

export function formatDistance(km: number | undefined | null): string {
  const n = Number(km);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1) return `${(n * 1000).toFixed(0)} m`;
  return `${n.toFixed(2)} km`;
}

export function formatPer1000Km(count: number, totalKm: number): string {
  if (totalKm <= 0 || !Number.isFinite(totalKm)) return count.toFixed(1);
  return (count / (totalKm / 1000)).toFixed(2);
}
