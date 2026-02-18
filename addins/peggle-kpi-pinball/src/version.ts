declare const __APP_VERSION__: string;

export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

const buildId = typeof import.meta.env.VITE_APP_BUILD_ID === "string"
  ? import.meta.env.VITE_APP_BUILD_ID.slice(0, 7)
  : null;

export const VERSION_DISPLAY = buildId ? `v${APP_VERSION} (${buildId})` : `v${APP_VERSION}`;
