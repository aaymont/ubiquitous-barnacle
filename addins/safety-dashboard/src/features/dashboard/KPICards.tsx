import React from "react";
import type { RuleCount } from "../../utils/aggregation";
import { formatDuration } from "../../utils/formatUtils";

const sectionStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "var(--zenith-spacing-md, 16px)",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "8px",
  padding: "var(--zenith-spacing-md, 16px) var(--zenith-spacing-lg, 24px)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  border: "1px solid var(--zenith-neutral-100, #EDEBE9)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "var(--zenith-font-size-sm, 12px)",
  fontWeight: 600,
  color: "var(--zenith-neutral-600, #605E5C)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "var(--zenith-spacing-xs, 4px)",
};

const valueStyle: React.CSSProperties = {
  fontSize: "var(--zenith-font-size-lg, 18px)",
  fontWeight: 700,
  color: "var(--zenith-neutral-900, #201F1E)",
};

export function KPICards({
  totalCount,
  totalDuration,
  per1000Km,
  topRules,
  ruleNames,
}: {
  totalCount: number;
  totalDuration: number;
  per1000Km: string;
  topRules: RuleCount[];
  ruleNames: Map<string, string>;
}) {
  return (
    <section aria-label="Key metrics" style={sectionStyle}>
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
        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "var(--zenith-font-size-md, 14px)", color: "var(--zenith-neutral-900, #201F1E)" }}>
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
