import React from "react";
import type { DriverRow, AssetRow } from "../../utils/aggregation";
import { formatDuration, formatDistance } from "../../utils/formatUtils";

const tableWrap: React.CSSProperties = {
  overflowX: "auto",
  background: "#fff",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.875rem",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontWeight: 600,
  color: "#374151",
  borderBottom: "2px solid #e5e7eb",
  background: "#f9fafb",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid #f3f4f6",
  color: "#111827",
};

const rowButton: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  border: "none",
  background: "none",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "inherit",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const rowButtonHover = (): React.CSSProperties => ({
  ...rowButton,
  background: "#f3f4f6",
});

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
    <div style={tableWrap}>
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
              <td colSpan={4} style={{ ...tdStyle, color: "#6b7280", textAlign: "center" }}>
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
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, rowButtonHover())}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, rowButton)}
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
    <div style={tableWrap}>
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
              <td colSpan={4} style={{ ...tdStyle, color: "#6b7280", textAlign: "center" }}>
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
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, rowButtonHover())}
                    onMouseOut={(e) => Object.assign(e.currentTarget.style, rowButton)}
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
