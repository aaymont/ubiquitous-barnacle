import type Matter from "matter-js";
import { Graphics } from "pixi.js";
import { getStage } from "./pixiStage";
import {
  createMatterWorld,
  addBall,
  addPeg,
  clearPegsAndBall,
  clearBallOnly,
  getRefs,
} from "./matterWorld";
import { setupCollisionHandlers } from "./collisionHandlers";
import { initScoring, setScoreCallbacks } from "./scoring";
import type { TripMetrics } from "../report/metrics";
import type { DerivedSafetyMetrics } from "../report/derivedSafety";
import type { DeviceStatusInfo } from "../types/entities";
import { unlockComboSection } from "../report/uiReport";

export interface PegDef {
  id: string;
  x: number;
  y: number;
  cluster: string;
  isPower: boolean;
}

const PEG_RADIUS = 12;
const BALL_RADIUS = 10;
const LAUNCH_X = 200;
const LAUNCH_Y = 80;

function buildPegLayout(
  _deviceId: string,
  metrics: TripMetrics,
  derived: DerivedSafetyMetrics,
  status: DeviceStatusInfo | null
): PegDef[] {
  const pegs: PegDef[] = [];

  // Center column — direct path of the falling ball (launch at 200,80) — ensures hits
  const centerLane: Array<{ x: number; y: number }> = [
    { x: 200, y: 130 },
    { x: 185, y: 195 },
    { x: 215, y: 255 },
    { x: 200, y: 315 },
    { x: 190, y: 375 },
    { x: 210, y: 435 },
  ];
  centerLane.forEach((pos, i) => {
    pegs.push({ id: `center${i}`, x: pos.x, y: pos.y, cluster: "center", isPower: false });
  });

  // KPI clusters — positioned to create a dense play area (tighter, more pegs)
  const speedCluster = [
    { id: "speeding", isPower: false },
    { id: "variance", isPower: derived.speedVarianceProxy > 20 },
    { id: "speedExtra", isPower: false },
  ];
  placeCluster(pegs, 100, 140, speedCluster, 35);

  const smoothCluster = [
    { id: "harshAccel", isPower: false },
    { id: "harshBrake", isPower: derived.harshBrakeProxy > derived.harshAccelProxy },
    { id: "smoothExtra", isPower: false },
  ];
  placeCluster(pegs, 300, 140, smoothCluster, 35);

  const idleCluster = [
    { id: "idle", isPower: false },
    { id: "longStop", isPower: metrics.stopCountProxy > 5 },
    { id: "idleExtra", isPower: false },
  ];
  placeCluster(pegs, 100, 290, idleCluster, 35);

  const complianceCluster = [
    { id: "afterHours", isPower: derived.afterHoursProxyMinutes > 60 },
    { id: "complianceExtra", isPower: false },
  ];
  placeCluster(pegs, 300, 290, complianceCluster, 35);

  const healthCluster = [
    { id: "deviceFresh", isPower: !status?.isDeviceCommunicating },
    { id: "healthExtra", isPower: false },
  ];
  placeCluster(pegs, 200, 520, healthCluster, 40);

  // Filler pegs for richer bounces — scatter between clusters
  const fillers: Array<{ x: number; y: number }> = [
    { x: 150, y: 220 },
    { x: 250, y: 220 },
    { x: 130, y: 370 },
    { x: 270, y: 370 },
    { x: 200, y: 200 },
  ];
  fillers.forEach((pos, i) => {
    pegs.push({ id: `filler${i}`, x: pos.x, y: pos.y, cluster: "filler", isPower: false });
  });

  return pegs;
}

function placeCluster(
  pegs: PegDef[],
  cx: number,
  cy: number,
  items: Array<{ id: string; isPower: boolean }>,
  radius = 40
) {
  items.forEach((item, i) => {
    const angle = (i / Math.max(1, items.length)) * Math.PI * 1.5 - Math.PI / 4;
    pegs.push({
      id: item.id,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      cluster: "main",
      isPower: item.isPower,
    });
  });
}

function clearStageGameObjects(): void {
  const stage = getStage();
  if (!stage) return;
  const toRemove = stage.children.filter((c) => (c as { userData?: unknown }).userData != null);
  for (const c of toRemove) {
    stage.removeChild(c);
  }
}

export function buildPegBoard(
  deviceId: string,
  metrics: TripMetrics,
  derived: DerivedSafetyMetrics,
  status: DeviceStatusInfo | null
): void {
  createMatterWorld();
  clearPegsAndBall();
  clearStageGameObjects();

  const pegDefs = buildPegLayout(deviceId, metrics, derived, status);
  initScoring(pegDefs.filter((p) => p.isPower).length);
  setScoreCallbacks(() => {}, unlockComboSection);

  const stage = getStage();
  if (!stage) return;


  for (const def of pegDefs) {
    const pegBody = addPeg(def.x, def.y, PEG_RADIUS, def.id, def.isPower);

    const g = new Graphics();
    g.circle(0, 0, PEG_RADIUS);
    g.fill({ color: def.isPower ? 0xffaa00 : 0x4fc3f7, alpha: 1 });
    g.stroke({ width: 2, color: 0xffffff });
    g.x = def.x;
    g.y = def.y;
    (g as Graphics & { userData?: { matterBody?: Matter.Body; pegId?: string } }).userData = {
      matterBody: pegBody.body,
      pegId: def.id,
    };
    stage.addChild(g);
  }

  setupCollisionHandlers(pegDefs);
}

let ballGraphics: Graphics | null = null;

export function dropBall(): void {
  const refs = getRefs();
  if (!refs) return;

  const stage = getStage();
  if (!stage) return;

  const ballChildren = stage.children.filter((c) => {
    const ud = (c as { userData?: { matterBody?: unknown } }).userData;
    return ud?.matterBody && !(ud as { pegId?: string }).pegId;
  });
  for (const c of ballChildren) stage.removeChild(c);
  clearBallOnly();
  ballGraphics = null;

  const ball = addBall(LAUNCH_X, LAUNCH_Y, BALL_RADIUS);
  ballGraphics = new Graphics();
  ballGraphics.circle(0, 0, BALL_RADIUS);
  ballGraphics.fill({ color: 0xffffff, alpha: 1 });
  ballGraphics.stroke({ width: 2, color: 0x00bcd4 });
  ballGraphics.x = LAUNCH_X;
  ballGraphics.y = LAUNCH_Y;
  (ballGraphics as Graphics & { userData?: { matterBody?: Matter.Body } }).userData = {
    matterBody: ball,
  };
  stage.addChild(ballGraphics);
}

export function resetBoard(): void {
  clearStageGameObjects();
  clearPegsAndBall();
  ballGraphics = null;
}

export function onSkipGame(): void {
  clearStageGameObjects();
  clearPegsAndBall();
  ballGraphics = null;
}
