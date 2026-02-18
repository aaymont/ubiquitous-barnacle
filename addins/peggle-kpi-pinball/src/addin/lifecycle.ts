import type { GeotabApi, GeotabAddInState } from "../types/geotab";
import { buildUI, destroyUI } from "../report/uiReport";
import { createPixiApp, destroyPixiApp, resumeRenderLoop, stopRenderLoop } from "../game/pixiStage";
import { createMatterWorld, destroyMatterWorld } from "../game/matterWorld";
import { loadDevices } from "../report/uiReport";

let apiRef: GeotabApi | null = null;
let physicsInitFailed = false;

export function getApi(): GeotabApi | null {
  return apiRef;
}

export function isPhysicsFailed(): boolean {
  return physicsInitFailed;
}

export function createLifecycle() {
  return {
    initialize(api: GeotabApi, _state: GeotabAddInState, callback: () => void) {
      apiRef = api;
      physicsInitFailed = false;

      buildUI(api);

      createMatterWorld();

      createPixiApp().catch((err) => {
        console.error("Pixi/Physics init failed:", err);
        physicsInitFailed = true;
      });

      loadDevices(api);

      callback();
    },

    focus(api: GeotabApi, _state: GeotabAddInState) {
      apiRef = api;
      if (!physicsInitFailed) {
        resumeRenderLoop();
      }
    },

    blur(_api: GeotabApi, _state: GeotabAddInState) {
      stopRenderLoop();
      destroyMatterWorld();
      // Keep Pixi app alive for when focus is called again
    },
  };
}

export function destroyLifecycle() {
  stopRenderLoop();
  destroyMatterWorld();
  destroyPixiApp();
  destroyUI();
  apiRef = null;
}
