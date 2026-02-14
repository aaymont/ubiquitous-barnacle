import React from "react";
import ReactDOM from "react-dom/client";
import type { GeotabApi, GeotabAddInState, GeotabAddInModule } from "./types/geotab";
import { abortCurrent } from "./abortScope";
import { AddinProvider } from "./context/AddinContext";
import { App } from "./App.tsx";

let apiRef: GeotabApi | null = null;
let stateRef: GeotabAddInState | null = null;
let root: ReactDOM.Root | null = null;
let refreshKey = 0;

function render(api: GeotabApi | null, state: GeotabAddInState | null) {
  const el = document.getElementById("root");
  if (!el) return;
  if (!root) {
    root = ReactDOM.createRoot(el);
  }
  root.render(
    <React.StrictMode>
      <AddinProvider
        api={api}
        state={state}
        refreshKey={refreshKey}
        onRequestRefresh={() => {
          refreshKey += 1;
          render(apiRef, stateRef);
        }}
      >
        <App />
      </AddinProvider>
    </React.StrictMode>
  );
}

function registerAddin() {
  const geotab = (window as Window & { geotab?: { addin: Record<string, () => GeotabAddInModule> } }).geotab;
  if (!geotab?.addin) return;
  geotab.addin["safety-dashboard"] = function (): GeotabAddInModule {
    return {
      initialize(api: GeotabApi, state: GeotabAddInState, callback: () => void) {
        apiRef = api;
        stateRef = state;
        render(api, state);
        callback();
      },
      focus(api: GeotabApi, state: GeotabAddInState) {
        apiRef = api;
        stateRef = state;
        refreshKey += 1;
        render(api, state);
      },
      blur(_api: GeotabApi, state: GeotabAddInState) {
        abortCurrent();
        if (state.setState && state.getState) {
          try {
            const current = state.getState();
            if (current && typeof current === "object") {
              state.setState({ ...current });
            }
          } catch {
            // ignore
          }
        }
      },
    };
  };
}

registerAddin();
