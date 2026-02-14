import React from "react";
import { Button, ButtonType } from "@geotab/zenith";
import type { SafetyFilters } from "./useSafetyData";
import type { Rule } from "../../types/entities";

const sectionStyle: React.CSSProperties = {
  background: "#fff",
  padding: "var(--zenith-spacing-md, 16px) var(--zenith-spacing-lg, 24px)",
  borderRadius: "8px",
  border: "1px solid var(--zenith-neutral-100, #EDEBE9)",
  marginBottom: "var(--zenith-spacing-md, 16px)",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-end",
  gap: "var(--zenith-spacing-md, 16px)",
  marginBottom: "var(--zenith-spacing-md, 16px)",
};

const inputStyle: React.CSSProperties = {
  padding: "var(--zenith-spacing-sm, 8px) var(--zenith-spacing-md, 16px)",
  border: "1px solid var(--zenith-neutral-100, #EDEBE9)",
  borderRadius: "4px",
  fontSize: "var(--zenith-font-size-md, 14px)",
  minWidth: "140px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--zenith-font-size-md, 14px)",
  fontWeight: 500,
  color: "var(--zenith-neutral-900, #201F1E)",
  marginBottom: "var(--zenith-spacing-xs, 4px)",
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
    <section aria-label="Filters" style={sectionStyle}>
      <div style={rowStyle}>
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
      <div style={rowStyle}>
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
      <div style={rowStyle}>
        <span style={labelStyle}>Rules (safety)</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--zenith-spacing-sm, 8px)", alignItems: "center" }}>
          <Button type={ButtonType.Secondary} onClick={selectAllRules} aria-label="Select all rules">
            All
          </Button>
          <Button type={ButtonType.Secondary} onClick={clearRules} aria-label="Clear rules">
            None
          </Button>
          <select
            multiple
            style={{ ...inputStyle, minHeight: "80px", minWidth: "200px" }}
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
          {safetyRules.length === 0 && (
            <span style={{ fontSize: "var(--zenith-font-size-md, 14px)", color: "var(--zenith-neutral-600, #605E5C)" }}>
              No safety rules found
            </span>
          )}
        </div>
      </div>
      <div style={rowStyle}>
        <span style={{ ...labelStyle, marginBottom: 0 }}>View</span>
        <Button
          type={filters.view === "driver" ? ButtonType.Primary : ButtonType.Secondary}
          onClick={() => set({ view: "driver" })}
          aria-pressed={filters.view === "driver"}
          aria-label="View by driver"
        >
          By Driver
        </Button>
        <Button
          type={filters.view === "asset" ? ButtonType.Primary : ButtonType.Secondary}
          onClick={() => set({ view: "asset" })}
          aria-pressed={filters.view === "asset"}
          aria-label="View by asset"
        >
          By Asset
        </Button>
      </div>
    </section>
  );
}
