import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";

interface Point {
  date: string;
  count: number;
}

export function TrendChart({ data }: { data: Point[] }) {
  const displayData = data.map((d) => ({
    ...d,
    label: d.date.slice(0, 10),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={displayData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Exceptions" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        padding: "8px 12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        fontSize: "0.8125rem",
      }}
    >
      <div style={{ color: "#6b7280" }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{payload[0].value} exceptions</div>
    </div>
  );
}
