import React, { createContext, useContext, useMemo } from "react";
import type { GeotabApi } from "../types/geotab";
import type { GeotabAddInState } from "../types/geotab";

interface AddinContextValue {
  api: GeotabApi | null;
  state: GeotabAddInState | null;
  refreshKey: number;
  requestRefresh: () => void;
}

const AddinContext = createContext<AddinContextValue>({
  api: null,
  state: null,
  refreshKey: 0,
  requestRefresh: () => {},
});

export function AddinProvider({
  api,
  state,
  refreshKey,
  onRequestRefresh,
  children,
}: {
  api: GeotabApi | null;
  state: GeotabAddInState | null;
  refreshKey: number;
  onRequestRefresh: () => void;
  children: React.ReactNode;
}) {
  const value = useMemo<AddinContextValue>(
    () => ({
      api,
      state,
      refreshKey,
      requestRefresh: onRequestRefresh,
    }),
    [api, state, refreshKey, onRequestRefresh]
  );
  return <AddinContext.Provider value={value}>{children}</AddinContext.Provider>;
}

export function useAddin() {
  const ctx = useContext(AddinContext);
  if (!ctx) throw new Error("useAddin must be used within AddinProvider");
  return ctx;
}
