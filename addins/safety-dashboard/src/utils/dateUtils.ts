export function last30Days(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from, to };
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

export function getDateRangeForPreset(
  presetId: string,
  ref: Date = new Date()
): { from: Date; to: Date } {
  const today = new Date(ref);
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  switch (presetId) {
    case "today": {
      return { from: todayStart, to: todayEnd };
    }
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "last7Days": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: startOfDay(from), to: todayEnd };
    }
    case "thisWeek": {
      const from = new Date(today);
      const day = from.getDay();
      const toSunday = day === 0 ? 0 : -day;
      from.setDate(from.getDate() + toSunday);
      return { from: startOfDay(from), to: todayEnd };
    }
    case "lastWeek": {
      const from = new Date(today);
      const day = from.getDay();
      const toLastSunday = day === 0 ? -7 : -day - 7;
      from.setDate(from.getDate() + toLastSunday);
      const to = new Date(from);
      to.setDate(to.getDate() + 6);
      return { from: startOfDay(from), to: endOfDay(to) };
    }
    case "thisMonth": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from, to: todayEnd };
    }
    case "lastMonth": {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: startOfDay(from), to: endOfDay(to) };
    }
    default:
      return { from: todayStart, to: todayEnd };
  }
}

export type DateRangePresetId =
  | "today"
  | "yesterday"
  | "last7Days"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export const DATE_RANGE_PRESETS: { id: DateRangePresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7Days", label: "Last 7 days" },
  { id: "thisWeek", label: "This week" },
  { id: "lastWeek", label: "Last week" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "custom", label: "Custom" },
];

export function toISODate(d: Date): string {
  return d.toISOString();
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
