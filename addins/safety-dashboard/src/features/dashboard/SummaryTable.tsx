import React from "react";
import type { DriverRow, AssetRow } from "../../utils/aggregation";
import { formatDuration, formatDistance } from "../../utils/formatUtils";

const wrapStyle: React.CSSProperties = {
  overflowX: "auto",
  background: "#fff",
  borderRadius: "8px",
  border: "1px solid var(--zenith-neutral-100, #EDEBE9)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "var(--zenith-font-size-md, 14px)",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "var(--zenith-spacing-md, 16px)",
  fontWeight: 600,
  color: "var(--zenith-neutral-900, #201F1E)",
  borderBottom: "2px solid var(--zenith-neutral-100, #EDEBE9)",
  background: "var(--zenith-neutral-100, #EDEBE9)",
};

const tdStyle: React.CSSProperties = {
  padding: "var(--zenith-spacing-md, 16px)",
  borderBottom: "1px solid var(--zenith-neutral-100, #EDEBE9)",
  color: "var(--zenith-neutral-900, #201F1E)",
};

const rowButton: React.CSSProperties = {
  width: "100%",
  padding: "var(--zenith-spacing-md, 16px)",
  border: "none",
  background: "none",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "inherit",
  fontFamily: "var(--zenith-font-family, 'Segoe UI', sans-serif)",
  color: "var(--zenith-primary, #0078D4)",
};

export function DriverTable({
  rows,
  nameMap,
  onSelect,
}: {
  rows: DriverRow[];
  nameMap: Map<string, string>;
  onSelect: (driverId: string) => void;
}) {
  return (
    <div style={wrapStyle}>
      <table style={tableStyle} role="grid" aria-label="Safety exceptions by driver">
        <thead>
          <tr>
            <th style={thStyle} scope="col">Driver</th>
            <th style={thStyle} scope="col">Count</th>
            <th style={thStyle} scope="col">Duration</th>
            <th style={thStyle} scope="col">Distance</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ ...tdStyle, color: "var(--zenith-neutral-600, #605E5C)", textAlign: "center" }}>
                No data
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.driverId}>
                <td style={tdStyle}>
                  <button
                    type="button"
                    style={rowButton}
                    onClick={() => onSelect(r.driverId)}
                    aria-label={`Open details for ${nameMap.get(r.driverId) ?? r.driverId}`}
                  >
                    {nameMap.get(r.driverId) ?? r.driverId}
                  </button>
                </td>
                <td style={tdStyle}>{r.count}</td>
                <td style={tdStyle}>{formatDuration(r.totalDuration)}</td>
                <td style={tdStyle}>{formatDistance(r.totalDistance)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AssetTable({
  rows,
  nameMap,
  onSelect,
}: {
  rows: AssetRow[];
  nameMap: Map<string, string>;
  onSelect: (deviceId: string) => void;
}) {
  return (
    <div style={wrapStyle}>
      <table style={tableStyle} role="grid" aria-label="Safety exceptions by asset">
        <thead>
          <tr>
            <th style={thStyle} scope="col">Asset</th>
            <th style={thStyle} scope="col">Count</th>
            <th style={thStyle} scope="col">Duration</th>
            <th style={thStyle} scope="col">Distance</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ ...tdStyle, color: "var(--zenith-neutral-600, #605E5C)", textAlign: "center" }}>
                No data
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.deviceId}>
                <td style={tdStyle}>
                  <button
                    type="button"
                    style={rowButton}
                    onClick={() => onSelect(r.deviceId)}
                    aria-label={`Open details for ${nameMap.get(r.deviceId) ?? r.deviceId}`}
                  >
                    {nameMap.get(r.deviceId) ?? r.deviceId}
                  </button>
                </td>
                <td style={tdStyle}>{r.count}</td>
                <td style={tdStyle}>{formatDuration(r.totalDuration)}</td>
                <td style={tdStyle}>{formatDistance(r.totalDistance)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
