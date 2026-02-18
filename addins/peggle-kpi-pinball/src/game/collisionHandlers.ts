import Matter from "matter-js";
import { Graphics } from "pixi.js";
import { getEngine } from "./matterWorld";
import { recordPegHit, hasWon } from "./scoring";
import { revealPegReport, unlockComboSection, skipGameAndRevealAll } from "../report/uiReport";
import type { PegDef } from "./pegBoardBuilder";
import { getStage } from "./pixiStage";

const hitPegs = new Set<string>();

function glowPeg(pegBody: Matter.Body): void {
  const stage = getStage();
  if (!stage) return;
  for (const child of stage.children) {
    const ud = (child as { userData?: { matterBody?: Matter.Body; pegId?: string } }).userData;
    if (ud?.matterBody === pegBody && ud?.pegId && child instanceof Graphics) {
      child.clear();
      child.circle(0, 0, 12);
      child.fill(0x00ff88, 1);
      child.stroke({ width: 3, color: 0xffffff });
      child.x = pegBody.position.x;
      child.y = pegBody.position.y;
      break;
    }
  }
}

export function setupCollisionHandlers(_pegDefs: PegDef[]): void {
  hitPegs.clear();
  const engine = getEngine();
  if (!engine) return;

  Matter.Events.on(engine, "collisionStart", (event: Matter.IEventCollision<Matter.Engine>) => {
    for (const pair of event.pairs) {
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;
      const pegBody = bodyA.label === "peg" ? bodyA : bodyB.label === "peg" ? bodyB : null;
      if (!pegBody) continue;

      const pegId = (pegBody as Matter.Body & { pegId?: string }).pegId;
      const isPowerPeg = (pegBody as Matter.Body & { isPowerPeg?: boolean }).isPowerPeg ?? false;

      if (!pegId || hitPegs.has(pegId)) continue;
      hitPegs.add(pegId);

      glowPeg(pegBody);
      recordPegHit(pegId, isPowerPeg);
      revealPegReport(pegId);
      unlockComboSection();

      if (hasWon()) {
        skipGameAndRevealAll();
      }
    }
  });
}
