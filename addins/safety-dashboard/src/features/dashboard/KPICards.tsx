import React from "react";
import type { RuleCount } from "../../utils/aggregation";
import { formatDuration } from "../../utils/formatUtils";

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "8px",
  padding: "16px 20px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "4px",
};

const valueStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#111827",
};

export function KPICards({
  totalCount,
  totalDuration,
  per1000Km,
  topRules,
  ruleNames,
  loading,
}: {
  totalCount: number;
  totalDuration: number;
  per1000Km: string;
  topRules: RuleCount[];
  ruleNames: Map<string, string>;
  loading: boolean;
}) {
  if (loading) {
    return (
      <section aria-label="Key metrics" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={cardStyle}>
            <div style={labelStyle}>—</div>
            <div style={{ ...valueStyle, color: "#9ca3af" }}>...</div>
          </div>
        ))}
      </section>
    );
  }
  return (
    <section aria-label="Key metrics" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
      <div style={cardStyle}>
        <div style={labelStyle}>Total safety exceptions</div>
        <div style={valueStyle}>{totalCount.toLocaleString()}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Total exception duration</div>
        <div style={valueStyle}>{formatDuration(totalDuration)}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Exceptions per 1,000 km</div>
        <div style={valueStyle}>{per1000Km}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Top 3 rules by count</div>
        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.9rem", color: "#374151" }}>
          {topRules.length === 0 ? (
            <li>—</li>
          ) : (
            topRules.map((r) => (
              <li key={r.ruleId}>
                {ruleNames.get(r.ruleId) ?? r.ruleId}: {r.count}
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
