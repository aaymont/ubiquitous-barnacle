import Matter from "matter-js";
import type { Body } from "matter-js";
import { getStage } from "./pixiStage";

const FIXED_TIMESTEP = 1 / 60;
const GRAVITY_SCALE = 1;

let engine: Matter.Engine | null = null;
let accumulator = 0;

export interface PegBody {
  body: Body;
  pegId: string;
  isPowerPeg: boolean;
}

export interface MatterRefs {
  engine: Matter.Engine;
  ball: Body | null;
  pegs: PegBody[];
  walls: Body[];
}

let refs: MatterRefs | null = null;

export function createMatterWorld(): MatterRefs {
  if (refs) return refs;

  engine = Matter.Engine.create({
    gravity: { x: 0, y: 1 * GRAVITY_SCALE },
  });

  const world = engine.world;
  const width = 400;
  const height = 600;
  const wallThickness = 20;

  const walls: Body[] = [
    Matter.Bodies.rectangle(width / 2, -wallThickness / 2, width + 100, wallThickness, { isStatic: true }),
    Matter.Bodies.rectangle(width / 2, height + wallThickness / 2, width + 100, wallThickness, { isStatic: true }),
    Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height + 100, { isStatic: true }),
    Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height + 100, { isStatic: true }),
  ];
  Matter.Composite.add(world, walls);

  refs = {
    engine,
    ball: null,
    pegs: [],
    walls,
  };

  return refs;
}

export function addBall(x: number, y: number, radius: number): Body {
  if (!engine) throw new Error("Engine not created");
  const ball = Matter.Bodies.circle(x, y, radius, {
    restitution: 0.9,
    friction: 0.01,
    density: 0.001,
    frictionAir: 0.0001,
  });
  Matter.Composite.add(engine.world, ball);
  refs!.ball = ball;
  return ball;
}

export function addPeg(x: number, y: number, radius: number, pegId: string, isPowerPeg: boolean): PegBody {
  if (!engine) throw new Error("Engine not created");
  const body = Matter.Bodies.circle(x, y, radius, {
    isStatic: true,
    restitution: 0.9,
    label: "peg",
  });
  (body as Matter.Body & { pegId?: string; isPowerPeg?: boolean }).pegId = pegId;
  (body as Matter.Body & { pegId?: string; isPowerPeg?: boolean }).isPowerPeg = isPowerPeg;
  Matter.Composite.add(engine.world, body);
  const peg: PegBody = { body, pegId, isPowerPeg };
  refs!.pegs.push(peg);
  return peg;
}

export function clearBallOnly(): void {
  if (!engine || !refs?.ball) return;
  Matter.Composite.remove(engine.world, refs.ball);
  refs.ball = null;
}

export function clearPegsAndBall(): void {
  if (!engine) return;
  const world = engine.world;
  if (refs?.ball) {
    Matter.Composite.remove(world, refs.ball);
    refs.ball = null;
  }
  for (const p of refs?.pegs ?? []) {
    Matter.Composite.remove(world, p.body);
  }
  refs!.pegs = [];
}

export function getEngine(): Matter.Engine | null {
  return engine;
}

export function getRefs(): MatterRefs | null {
  return refs;
}

export function syncMatterToPixi(delta: number): void {
  if (!engine) return;

  accumulator += Math.min(delta, 0.1);
  while (accumulator >= FIXED_TIMESTEP) {
    Matter.Engine.update(engine, FIXED_TIMESTEP * 1000);
    accumulator -= FIXED_TIMESTEP;
  }

  const stage = getStage();
  if (!stage) return;

  for (const child of stage.children) {
    const ud = (child as { userData?: { matterBody?: Body } }).userData;
    const body = ud?.matterBody;
    if (body) {
      child.x = body.position.x;
      child.y = body.position.y;
      child.rotation = body.angle;
    }
  }
}

export function destroyMatterWorld(): void {
  if (engine) {
    Matter.Engine.clear(engine);
    engine = null;
  }
  refs = null;
  accumulator = 0;
}
