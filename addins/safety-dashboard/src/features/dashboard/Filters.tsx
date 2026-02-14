import React from "react";
import { Button, ButtonType } from "@geotab/zenith";
import type { SafetyFilters } from "./useSafetyData";
import type { Rule } from "../../types/entities";
import { DATE_RANGE_PRESETS, getDateRangeForPreset } from "../../utils/dateUtils";
import type { DateRangePresetId } from "../../utils/dateUtils";

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
  const presetListStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--zenith-spacing-xs, 4px)",
    marginBottom: "var(--zenith-spacing-sm, 8px)",
  };
  const presetButtonStyle = (selected: boolean): React.CSSProperties => ({
    padding: "8px 12px",
    borderRadius: "4px",
    border: selected ? "none" : "1px solid var(--zenith-neutral-200, #C8C6C4)",
    background: selected ? "var(--zenith-primary, #0078D4)" : "#fff",
    color: selected ? "#fff" : "var(--zenith-neutral-900, #201F1E)",
    fontSize: "var(--zenith-font-size-md, 14px)",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    width: "100%",
    maxWidth: "200px",
  });

  return (
    <section aria-label="Filters" style={sectionStyle}>
      <div style={{ ...rowStyle, flexDirection: "column", alignItems: "flex-start" }}>
        <span style={labelStyle}>Date range</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--zenith-spacing-md, 16px)", alignItems: "flex-start" }}>
          <div style={presetListStyle} role="group" aria-label="Date range presets">
            {DATE_RANGE_PRESETS.map((preset) => {
              const selected = filters.dateRangePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectPreset(preset.id)}
                  aria-pressed={selected}
                  aria-label={`Select ${preset.label}`}
                  style={presetButtonStyle(selected)}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          {isCustom && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "var(--zenith-spacing-sm, 8px)" }}>
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
          )}
        </div>
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
      <div style={{ ...rowStyle, flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--zenith-spacing-sm, 8px)", marginBottom: "var(--zenith-spacing-sm, 8px)" }}>
          <span style={labelStyle}>Rules (safety)</span>
          <Button type={ButtonType.Secondary} onClick={selectAllRules} aria-label="Select all rules">
            All
          </Button>
          <Button type={ButtonType.Secondary} onClick={clearRules} aria-label="Clear rules">
            None
          </Button>
        </div>
        {safetyRules.length === 0 ? (
          <span style={{ fontSize: "var(--zenith-font-size-md, 14px)", color: "var(--zenith-neutral-600, #605E5C)" }}>
            No safety rules found
          </span>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--zenith-spacing-sm, 8px)",
              padding: "var(--zenith-spacing-sm, 8px)",
              background: "var(--zenith-neutral-100, #EDEBE9)",
              borderRadius: "6px",
              minHeight: "48px",
            }}
            role="group"
            aria-label="Safety rules selection"
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
                    padding: "6px 14px",
                    borderRadius: "9999px",
                    border: selected ? "none" : "1px solid var(--zenith-neutral-300, #C8C6C4)",
                    background: selected ? "var(--zenith-primary, #0078D4)" : "#fff",
                    color: selected ? "#fff" : "var(--zenith-neutral-900, #201F1E)",
                    fontSize: "var(--zenith-font-size-md, 14px)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    boxShadow: selected ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
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
