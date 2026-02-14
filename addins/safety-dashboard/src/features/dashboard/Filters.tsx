import React from "react";
import type { SafetyFilters } from "./useSafetyData";
import type { Rule } from "../../types/entities";

const formRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "12px 20px",
  marginBottom: "12px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#374151",
  marginRight: "6px",
};

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "0.875rem",
  minWidth: "140px",
};

const selectMulti: React.CSSProperties = {
  ...inputStyle,
  minHeight: "80px",
  minWidth: "200px",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 16px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  background: "#f9fafb",
  fontSize: "0.875rem",
  cursor: "pointer",
};

const buttonActive: React.CSSProperties = {
  ...buttonStyle,
  background: "#2563eb",
  color: "#fff",
  borderColor: "#2563eb",
};

export function Filters({
  filters,
  onFiltersChange,
  safetyRules,
  groups,
}: {
  filters: SafetyFilters;
  onFiltersChange: (f: SafetyFilters) => void;
  safetyRules: Rule[];
  groups: { id: string; name?: string }[];
}) {
  const set = (patch: Partial<SafetyFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };
  const selectAllRules = () => set({ ruleIds: safetyRules.map((r) => r.id) });
  const clearRules = () => set({ ruleIds: [] });

  return (
    <section aria-label="Filters" style={{ background: "#fff", padding: "16px 20px", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "16px" }}>
      <div style={formRow}>
        <label style={labelStyle} htmlFor="sd-from">
          From
        </label>
        <input
          id="sd-from"
          type="date"
          style={inputStyle}
          value={filters.fromDate.toISOString().slice(0, 10)}
          onChange={(e) => set({ fromDate: new Date(e.target.value) })}
          aria-label="From date"
        />
        <label style={labelStyle} htmlFor="sd-to">
          To
        </label>
        <input
          id="sd-to"
          type="date"
          style={inputStyle}
          value={filters.toDate.toISOString().slice(0, 10)}
          onChange={(e) => set({ toDate: new Date(e.target.value) })}
          aria-label="To date"
        />
      </div>
      <div style={formRow}>
        <label style={labelStyle} htmlFor="sd-group">
          Group
        </label>
        <select
          id="sd-group"
          style={inputStyle}
          value={filters.groupId ?? ""}
          onChange={(e) => set({ groupId: e.target.value || null })}
          aria-label="Group filter"
        >
          <option value="">All visible vehicles</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name ?? g.id}
            </option>
          ))}
        </select>
      </div>
      <div style={formRow}>
        <span style={labelStyle}>Rules (safety)</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <button type="button" style={buttonStyle} onClick={selectAllRules} aria-label="Select all rules">
            All
          </button>
          <button type="button" style={buttonStyle} onClick={clearRules} aria-label="Clear rules">
            None
          </button>
          <select
            multiple
            style={selectMulti}
            value={filters.ruleIds}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => o.value);
              set({ ruleIds: selected });
            }}
            aria-label="Rule multi-select"
          >
            {safetyRules.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name ?? r.id}
              </option>
            ))}
          </select>
          {safetyRules.length === 0 && <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>No safety rules found</span>}
        </div>
      </div>
      <div style={formRow}>
        <span style={labelStyle}>View</span>
        <button
          type="button"
          style={filters.view === "driver" ? buttonActive : buttonStyle}
          onClick={() => set({ view: "driver" })}
          aria-pressed={filters.view === "driver"}
          aria-label="View by driver"
        >
          By Driver
        </button>
        <button
          type="button"
          style={filters.view === "asset" ? buttonActive : buttonStyle}
          onClick={() => set({ view: "asset" })}
          aria-pressed={filters.view === "asset"}
          aria-label="View by asset"
        >
          By Asset
        </button>
      </div>
    </section>
  );
}
