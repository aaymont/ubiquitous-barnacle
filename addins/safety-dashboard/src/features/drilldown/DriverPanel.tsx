import React from "react";
import { Button, ButtonType } from "@geotab/zenith";
import type { User } from "../../types/entities";
import type { ExceptionEvent } from "../../types/entities";
import { dailyCounts } from "../../utils/aggregation";
import { formatDateTime } from "../../utils/dateUtils";
import { formatDuration, formatDistance } from "../../utils/formatUtils";
import { getExceptionDurationSeconds } from "../../utils/exceptionUtils";
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
  padding: "var(--zenith-spacing-lg, 24px)",
  paddingTop: "56px",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "var(--zenith-spacing-md, 16px)",
  gap: "var(--zenith-spacing-md, 16px)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "var(--zenith-font-size-lg, 18px)",
  fontWeight: 600,
  color: "var(--zenith-neutral-900, #201F1E)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "var(--zenith-font-size-md, 14px)",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "var(--zenith-spacing-sm, 8px) var(--zenith-spacing-md, 16px)",
  fontWeight: 600,
  color: "var(--zenith-neutral-600, #605E5C)",
  borderBottom: "1px solid var(--zenith-neutral-100, #EDEBE9)",
};

const tdStyle: React.CSSProperties = {
  padding: "var(--zenith-spacing-sm, 8px) var(--zenith-spacing-md, 16px)",
  borderBottom: "1px solid var(--zenith-neutral-100, #EDEBE9)",
  color: "var(--zenith-neutral-900, #201F1E)",
};

export function DriverPanel({
  driverId,
  user,
  events,
  ruleNames,
  deviceNames,
  onClose,
  gotoPage,
}: {
  driverId: string;
  user: User | undefined;
  events: ExceptionEvent[];
  ruleNames: Map<string, string>;
  deviceNames: Map<string, string>;
  onClose: () => void;
  gotoPage?: (page: string, params?: Record<string, unknown>) => void;
}) {
  const name = user?.name ?? user?.firstName ?? user?.lastName ?? driverId;
  const daily = dailyCounts(events);

  return (
    <aside style={panelStyle} role="dialog" aria-label={`Driver details: ${name}`}>
      <div style={headerStyle}>
        <h2 style={titleStyle} id="driver-panel-title">
          Driver: {name}
        </h2>
        <div style={{ display: "flex", gap: "var(--zenith-spacing-sm, 8px)", flexWrap: "wrap" }}>
          {gotoPage && (
            <OpenInMyGeotabButton label="Open in MyGeotab" page="user" id={driverId} gotoPage={gotoPage} />
          )}
          <Button type={ButtonType.Secondary} onClick={onClose} aria-label="Close panel">
            Close
          </Button>
        </div>
      </div>
      <section aria-labelledby="driver-panel-title">
        <p style={{ margin: "0 0 var(--zenith-spacing-md, 16px)", fontSize: "var(--zenith-font-size-md, 14px)", color: "var(--zenith-neutral-600, #605E5C)" }}>
          {user?.firstName && user?.lastName && `${user.firstName} ${user.lastName}`}
          {user?.firstName && !user?.lastName && user.firstName}
          {!user?.firstName && user?.lastName && user.lastName}
          {!user && `Driver ID: ${driverId}`}
        </p>
        <h3 style={{ fontSize: "var(--zenith-font-size-md, 14px)", marginBottom: "var(--zenith-spacing-sm, 8px)" }}>Daily trend (exceptions)</h3>
        <div style={{ height: "200px", marginBottom: "var(--zenith-spacing-lg, 24px)" }}>
          <TrendChart data={daily} />
        </div>
        <h3 style={{ fontSize: "var(--zenith-font-size-md, 14px)", marginBottom: "var(--zenith-spacing-sm, 8px)" }}>Events</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Rule</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Distance</th>
                <th style={thStyle}>Device</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td style={tdStyle}>{formatDateTime(e.activeFrom)}</td>
                  <td style={tdStyle}>{ruleNames.get(e.rule?.id ?? "") ?? e.rule?.id ?? "—"}</td>
                  <td style={tdStyle}>{formatDuration(getExceptionDurationSeconds(e))}</td>
                  <td style={tdStyle}>{formatDistance(e.distance)}</td>
                  <td style={tdStyle}>{deviceNames.get(e.device?.id ?? "") ?? e.device?.id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </aside>
  );
}
