import React, { useMemo, useState } from "react";
import { FeedbackProvider, Waiting } from "@geotab/zenith";
import { useAddin } from "./context/AddinContext";
import { useSafetyData, defaultFilters, type SafetyFilters } from "./features/dashboard/useSafetyData";
import { KPICards } from "./features/dashboard/KPICards";
import { Filters } from "./features/dashboard/Filters";
import { DriverTable, AssetTable } from "./features/dashboard/SummaryTable";
import { DriverPanel } from "./features/drilldown/DriverPanel";
import { AssetPanel } from "./features/drilldown/AssetPanel";
import { formatPer1000Km } from "./utils/formatUtils";

const layoutStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--zenith-neutral-100, #EDEBE9)",
  padding: "var(--zenith-spacing-lg, 24px)",
  fontFamily: "var(--zenith-font-family, 'Segoe UI', -apple-system, sans-serif)",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 var(--zenith-spacing-lg, 24px)",
  fontSize: "var(--zenith-font-size-xxl, 28px)",
  fontWeight: 700,
  color: "var(--zenith-neutral-900, #201F1E)",
};

export function App() {
  const { api, state } = useAddin();
  const [filters, setFilters] = useState<SafetyFilters>(defaultFilters);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const data = useSafetyData(filters);

  const ruleNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of data.rules) m.set(r.id, r.name ?? r.id);
    return m;
  }, [data.rules]);

  const deviceNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of data.devices) m.set(d.id, d.name ?? d.id);
    return m;
  }, [data.devices]);

  const userNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of data.users) m.set(u.id, u.name ?? u.firstName ?? u.lastName ?? u.id);
    return m;
  }, [data.users]);

  const per1000Km = useMemo(
    () =>
      data.totalDistance > 0
        ? formatPer1000Km(data.events.length, data.totalDistance)
        : data.events.length > 0
          ? "—"
          : "0",
    [data.events.length, data.totalDistance]
  );

  const selectedDriverEvents = useMemo(() => {
    if (!selectedDriverId) return [];
    return data.events.filter((e) => e.driver?.id === selectedDriverId);
  }, [data.events, selectedDriverId]);

  const selectedAssetEvents = useMemo(() => {
    if (!selectedDeviceId) return [];
    return data.events.filter((e) => e.device?.id === selectedDeviceId);
  }, [data.events, selectedDeviceId]);

  const selectedUser = useMemo(
    () => (selectedDriverId ? data.users.find((u) => u.id === selectedDriverId) : undefined),
    [data.users, selectedDriverId]
  );

  const selectedDevice = useMemo(
    () => (selectedDeviceId ? data.devices.find((d) => d.id === selectedDeviceId) : undefined),
    [data.devices, selectedDeviceId]
  );

  const gotoPage = state?.gotoPage;

  if (!api) {
    return (
      <div style={layoutStyle}>
        <h1 style={titleStyle}>Safety Dashboard</h1>
        <Waiting />
      </div>
    );
  }

  return (
    <FeedbackProvider>
      <div style={layoutStyle}>
        <h1 style={titleStyle} id="main-title">
          Safety Dashboard
        </h1>
        {data.error && (
          <div
            role="alert"
            style={{
              marginBottom: "var(--zenith-spacing-md, 16px)",
              padding: "var(--zenith-spacing-md, 16px)",
              background: "var(--zenith-error, #D13438)",
              color: "#fff",
              borderRadius: "8px",
            }}
          >
            {data.error}
          </div>
        )}
        <Filters
          filters={filters}
          onFiltersChange={setFilters}
          safetyRules={data.safetyRules}
          groups={data.groups}
        />
        {data.loading ? (
          <div style={{ padding: "var(--zenith-spacing-xl, 32px)", display: "flex", justifyContent: "center" }}>
            <Waiting />
          </div>
        ) : (
          <>
            <KPICards
              totalCount={data.events.length}
              totalDuration={data.totalDuration}
              per1000Km={per1000Km}
              topRules={data.topRules}
              ruleNames={ruleNames}
            />
            <div style={{ marginTop: "var(--zenith-spacing-lg, 24px)" }}>
              {filters.view === "driver" ? (
                <DriverTable
                  rows={data.driverRows}
                  nameMap={userNames}
                  onSelect={setSelectedDriverId}
                />
              ) : (
                <AssetTable
                  rows={data.assetRows}
                  nameMap={deviceNames}
                  onSelect={setSelectedDeviceId}
                />
              )}
            </div>
          </>
        )}
        {selectedDriverId && (
          <DriverPanel
            driverId={selectedDriverId}
            user={selectedUser}
            events={selectedDriverEvents}
            ruleNames={ruleNames}
            deviceNames={deviceNames}
            onClose={() => setSelectedDriverId(null)}
            gotoPage={gotoPage}
          />
        )}
        {selectedDeviceId && (
          <AssetPanel
            deviceId={selectedDeviceId}
            device={selectedDevice}
            events={selectedAssetEvents}
            ruleNames={ruleNames}
            userNames={userNames}
            onClose={() => setSelectedDeviceId(null)}
            gotoPage={gotoPage}
          />
        )}
      </div>
    </FeedbackProvider>
  );
}
