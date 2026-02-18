import type { GeotabAddInModule } from "./types/geotab";
import { createLifecycle } from "./addin/lifecycle";

function registerAddin() {
  const geotab = (window as Window & { geotab?: { addin: Record<string, () => GeotabAddInModule> } }).geotab;
  if (!geotab?.addin) return;

  geotab.addin["peggleKpiPinball"] = function (): GeotabAddInModule {
    return createLifecycle();
  };
}

registerAddin();
