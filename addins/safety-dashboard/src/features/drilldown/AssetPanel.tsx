import React from "react";
import type { Device } from "../../types/entities";
import type { ExceptionEvent } from "../../types/entities";
import { dailyCounts } from "../../utils/aggregation";
import { formatDateTime } from "../../utils/dateUtils";
import { formatDuration, formatDistance } from "../../utils/formatUtils";
import { TrendChart } from "./TrendChart";
import { OpenInMyGeotabButton } from "./OpenInMyGeotabButton";

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  width: "min(480px, 100vw)",
  height: "100%",
  background: "#fff",
  boxShadow: "-4px 0 12px rgba(0,0,0,0.1)",
  zIndex: 100,
  overflow: "auto",
  padding: "20px",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "16px",
  gap: "12px",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#111827",
};

const closeBtn: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  background: "#f9fafb",
  cursor: "pointer",
  fontSize: "0.875rem",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.8125rem",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontWeight: 600,
  color: "#6b7280",
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid #f3f4f6",
  color: "#374151",
};

export function AssetPanel({
  deviceId,
  device,
  events,
  ruleNames,
  userNames,
  onClose,
  gotoPage,
}: {
  deviceId: string;
  device: Device | undefined;
  events: ExceptionEvent[];
  ruleNames: Map<string, string>;
  userNames: Map<string, string>;
  onClose: () => void;
  gotoPage?: (page: string, params?: Record<string, unknown>) => void;
}) {
  const name = device?.name ?? deviceId;
  const daily = dailyCounts(events);

  return (
    <aside style={panelStyle} role="dialog" aria-label={`Asset details: ${name}`}>
      <div style={headerStyle}>
        <h2 style={titleStyle} id="asset-panel-title">
          Asset: {name}
        </h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {gotoPage && (
            <OpenInMyGeotabButton
              label="Open in MyGeotab"
              page="device"
              id={deviceId}
              gotoPage={gotoPage}
            />
          )}
          <button type="button" style={closeBtn} onClick={onClose} aria-label="Close panel">
            Close
          </button>
        </div>
      </div>
      <section aria-labelledby="asset-panel-title">
        <p style={{ margin: "0 0 16px", fontSize: "0.875rem", color: "#6b7280" }}>
          {device?.serialNumber && `Serial: ${device.serialNumber}`}
          {device?.vin && ` · VIN: ${device.vin}`}
          {device?.licensePlate && ` · ${device.licensePlate}`}
          {!device && `Device ID: ${deviceId}`}
        </p>
        <h3 style={{ fontSize: "1rem", marginBottom: "8px" }}>Daily trend (exceptions)</h3>
        <div style={{ height: "200px", marginBottom: "20px" }}>
          <TrendChart data={daily} />
        </div>
        <h3 style={{ fontSize: "1rem", marginBottom: "8px" }}>Events</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Rule</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Distance</th>
                <th style={thStyle}>Driver</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td style={tdStyle}>{formatDateTime(e.activeFrom)}</td>
                  <td style={tdStyle}>{ruleNames.get(e.rule?.id ?? "") ?? e.rule?.id ?? "—"}</td>
                  <td style={tdStyle}>{formatDuration(e.duration)}</td>
                  <td style={tdStyle}>{formatDistance(e.distance)}</td>
                  <td style={tdStyle}>{userNames.get(e.driver?.id ?? "") ?? e.driver?.id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </aside>
  );
}
