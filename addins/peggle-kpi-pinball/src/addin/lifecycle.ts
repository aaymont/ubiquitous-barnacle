import type { GeotabApi, GeotabAddInState } from "../types/geotab";
import { buildUI, destroyUI } from "../report/uiReport";
import { createPixiApp, destroyPixiApp, resumeRenderLoop, stopRenderLoop, isPixiReady } from "../game/pixiStage";
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

      createPixiApp()
        .then(() => {
          // Start render loop when Pixi is ready (fixes race: focus may run before Pixi completes)
          if (!physicsInitFailed) {
            resumeRenderLoop();
          }
        })
        .catch((err) => {
          console.error("Pixi/Physics init failed:", err);
          physicsInitFailed = true;
        });

      loadDevices(api);

      callback();
    },

    focus(api: GeotabApi, _state: GeotabAddInState) {
      apiRef = api;
      if (!physicsInitFailed && isPixiReady()) {
        resumeRenderLoop();
      }
    },

    blur(_api: GeotabApi, _state: GeotabAddInState) {
      stopRenderLoop();
      // Don't destroy Matter world — keep pegs/ball so board is intact when focus returns
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
