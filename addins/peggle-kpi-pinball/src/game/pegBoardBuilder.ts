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

  const speedCluster = [
    { id: "speeding", isPower: false },
    { id: "variance", isPower: derived.speedVarianceProxy > 20 },
  ];
  placeCluster(pegs, 80, 150, speedCluster);

  const smoothCluster = [
    { id: "harshAccel", isPower: false },
    { id: "harshBrake", isPower: derived.harshBrakeProxy > derived.harshAccelProxy },
  ];
  placeCluster(pegs, 320, 150, smoothCluster);

  const idleCluster = [
    { id: "idle", isPower: false },
    { id: "longStop", isPower: metrics.stopCountProxy > 5 },
  ];
  placeCluster(pegs, 80, 300, idleCluster);

  const complianceCluster = [
    { id: "afterHours", isPower: derived.afterHoursProxyMinutes > 60 },
  ];
  placeCluster(pegs, 320, 300, complianceCluster);

  const healthCluster = [
    {
      id: "deviceFresh",
      isPower: !status?.isDeviceCommunicating,
    },
  ];
  placeCluster(pegs, 200, 450, healthCluster);

  return pegs;
}

function placeCluster(
  pegs: PegDef[],
  cx: number,
  cy: number,
  items: Array<{ id: string; isPower: boolean }>
) {
  const r = 50;
  items.forEach((item, i) => {
    const angle = (i / items.length) * Math.PI * 1.5 - Math.PI / 4;
    pegs.push({
      id: item.id,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
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
