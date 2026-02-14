import React from "react";
import { Button, ButtonType } from "@geotab/zenith";
import type { SafetyFilters } from "./useSafetyData";
import type { Rule } from "../../types/entities";
import { DATE_RANGE_PRESETS, getDateRangeForPreset } from "../../utils/dateUtils";
import type { DateRangePresetId } from "../../utils/dateUtils";

const sectionStyle: React.CSSProperties = {
  background: "#fff",
  padding: "var(--zenith-spacing-sm, 8px) var(--zenith-spacing-md, 16px)",
  borderRadius: "6px",
  border: "1px solid var(--zenith-neutral-100, #EDEBE9)",
  marginBottom: "var(--zenith-spacing-sm, 8px)",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--zenith-spacing-sm, 8px)",
};

const compactInput: React.CSSProperties = {
  padding: "4px 8px",
  border: "1px solid var(--zenith-neutral-100, #EDEBE9)",
  borderRadius: "4px",
  fontSize: "13px",
  minWidth: "100px",
};

const compactLabel: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--zenith-neutral-700, #605E5C)",
  marginRight: "4px",
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
  const selectPreset = (presetId: DateRangePresetId) => {
    if (presetId === "custom") {
      set({ dateRangePreset: "custom" });
      return;
    }
    const range = getDateRangeForPreset(presetId);
    set({ dateRangePreset: presetId, fromDate: range.from, toDate: range.to });
  };
  const selectAllRules = () => set({ ruleIds: safetyRules.map((r) => r.id) });
  const clearRules = () => set({ ruleIds: [] });

  const isCustom = filters.dateRangePreset === "custom";

  return (
    <section aria-label="Filters" style={sectionStyle}>
      {/* Row 1: Date, Group, View in one compact row */}
      <div style={{ ...rowStyle, marginBottom: "var(--zenith-spacing-sm, 8px)" }}>
        <span style={compactLabel}>Date</span>
        <select
          aria-label="Date range"
          value={filters.dateRangePreset}
          onChange={(e) => selectPreset(e.target.value as DateRangePresetId)}
          style={compactInput}
        >
          {DATE_RANGE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {isCustom && (
          <>
            <input
              type="date"
              aria-label="From date"
              style={compactInput}
              value={filters.fromDate.toISOString().slice(0, 10)}
              onChange={(e) => set({ fromDate: new Date(e.target.value) })}
            />
            <span style={{ ...compactLabel, marginRight: 0 }}>to</span>
            <input
              type="date"
              aria-label="To date"
              style={compactInput}
              value={filters.toDate.toISOString().slice(0, 10)}
              onChange={(e) => set({ toDate: new Date(e.target.value) })}
            />
          </>
        )}
        <span style={{ ...compactLabel, marginLeft: "12px" }}>Group</span>
        <select
          aria-label="Group"
          style={compactInput}
          value={filters.groupId ?? ""}
          onChange={(e) => set({ groupId: e.target.value || null })}
        >
          <option value="">All visible vehicles</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name ?? g.id}
            </option>
          ))}
        </select>
        <span style={{ ...compactLabel, marginLeft: "12px" }}>View</span>
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

      {/* Row 2: Rules - compact chip row */}
      <div style={rowStyle}>
        <span style={compactLabel}>Rules</span>
        <Button type={ButtonType.Secondary} onClick={selectAllRules} aria-label="Select all rules">
          All
        </Button>
        <Button type={ButtonType.Secondary} onClick={clearRules} aria-label="Clear rules">
          None
        </Button>
        {safetyRules.length === 0 ? (
          <span style={{ fontSize: "13px", color: "var(--zenith-neutral-600, #605E5C)" }}>No safety rules found</span>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              padding: "6px 8px",
              background: "var(--zenith-neutral-100, #EDEBE9)",
              borderRadius: "4px",
              maxHeight: "64px",
              overflowY: "auto",
              flex: "1 1 200px",
            }}
            role="group"
            aria-label="Safety rules"
          >
            {safetyRules.map((r) => {
              const selected = filters.ruleIds.includes(r.id);
              const label = r.name ?? r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    const next = selected
                      ? filters.ruleIds.filter((id) => id !== r.id)
                      : [...filters.ruleIds, r.id];
                    set({ ruleIds: next });
                  }}
                  aria-pressed={selected}
                  aria-label={selected ? `Deselect ${label}` : `Select ${label}`}
                  style={{
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    border: selected ? "none" : "1px solid var(--zenith-neutral-300, #C8C6C4)",
                    background: selected ? "var(--zenith-primary, #0078D4)" : "#fff",
                    color: selected ? "#fff" : "var(--zenith-neutral-900, #201F1E)",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
