import { Application } from "pixi.js";
import { syncMatterToPixi } from "./matterWorld";

const BOARD_WIDTH = 400;
const BOARD_HEIGHT = 600;

let app: Application | null = null;
let containerEl: HTMLDivElement | null = null;
let running = false;
let tickerHandle: ((t: { deltaTime: number }) => void) | null = null;

export async function createPixiApp(): Promise<void> {
  if (app) return;

  app = new Application();
  await app.init({
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    backgroundColor: 0x1a1a2e,
    antialias: true,
    autoStart: false,
  });

  containerEl = document.createElement("div");
  containerEl.className = "peggle-canvas-wrapper";
  containerEl.style.aspectRatio = `${BOARD_WIDTH} / ${BOARD_HEIGHT}`;
  containerEl.style.maxWidth = "100%";
  containerEl.style.position = "relative";

  const canvas = app.canvas as HTMLCanvasElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  containerEl.appendChild(canvas);

  const mountPoint = document.getElementById("canvas-container");
  if (mountPoint) mountPoint.appendChild(containerEl);

  tickerHandle = (ticker: { deltaTime: number }) => {
    if (running) {
      syncMatterToPixi(ticker.deltaTime / 60);
    }
  };
  app.ticker.add(tickerHandle);
}

export function getCanvasContainer(): HTMLElement | null {
  return containerEl;
}

export function getApp(): Application | null {
  return app;
}

export function resumeRenderLoop(): void {
  running = true;
  if (app) app.ticker.start();
}

export function stopRenderLoop(): void {
  running = false;
  if (app) app.ticker.stop();
}

export function destroyPixiApp(): void {
  if (tickerHandle && app) {
    app.ticker.remove(tickerHandle);
    tickerHandle = null;
  }
  if (app) {
    app.destroy(true, { children: true });
    app = null;
  }
  if (containerEl?.parentNode) {
    containerEl.parentNode.removeChild(containerEl);
  }
  containerEl = null;
}

export function getStage() {
  return app?.stage ?? null;
}

export function getBoardDimensions() {
  return { width: BOARD_WIDTH, height: BOARD_HEIGHT };
}
