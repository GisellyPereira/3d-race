import { getLevel, LEVELS, trackPosition, widthAt, onSand } from "./levels";
/** Pure race rules and driving model. Coordinates are metres; angles are radians. */
export const ROAD_WIDTH = 12;
export const TIME_LIMIT = 120;
export const MAX_SPEED = 38;
const TAU = Math.PI * 2;
const wrap = (v: number) => ((v % 1) + 1) % 1;
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
export interface TrackPoint {
  x: number;
  z: number;
  t: number;
  heading: number;
  tx: number;
  tz: number;
  nx: number;
  nz: number;
}
export function sampleTrack(t: number, levelId = 0): TrackPoint {
  const p = trackPosition(t, levelId),
    before = trackPosition(t - 0.0001, levelId),
    after = trackPosition(t + 0.0001, levelId);
  const len = Math.hypot(after.x - before.x, after.z - before.z);
  const tx = (after.x - before.x) / len,
    tz = (after.z - before.z) / len;
  return {
    ...p,
    t: wrap(t),
    tx,
    tz,
    nx: tz,
    nz: -tx,
    heading: Math.atan2(tx, tz),
  };
}
const TRACK_RESOLUTION = 512;
const tracks = LEVELS.map((level) => {
  const points = Array.from({ length: TRACK_RESOLUTION }, (_, i) =>
    sampleTrack(i / TRACK_RESOLUTION, level.id),
  );
  return {
    points,
    length: points.reduce((sum, p, i) => {
      const q = points[(i + 1) % points.length];
      return sum + Math.hypot(q.x - p.x, q.z - p.z);
    }, 0),
    checkpoints: Array.from({ length: 8 }, (_, i) => ({
      ...sampleTrack((i + 1) / 8, level.id),
      index: i + 1,
    })),
    obstacles: level.obstacles.map((o, index) => {
      const p = sampleTrack(o.t, level.id);
      return {
        ...o,
        index,
        x: p.x + p.nx * o.offset,
        z: p.z + p.nz * o.offset,
        heading: p.heading,
      };
    }),
  };
});
export function getTrack(id = 0) {
  return tracks[id] ?? tracks[0];
}
export const TRACK_POINTS = getTrack().points;
export const TRACK_LENGTH = getTrack().length;
export const CHECKPOINTS = getTrack().checkpoints;
export function nearestTrack(
  x: number,
  z: number,
  levelId = 0,
): TrackPoint & { distance: number; signedDistance: number } {
  const points = getTrack(levelId).points;
  let bestDistance = Infinity,
    bestT = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i],
      q = points[(i + 1) % points.length];
    const dx = q.x - p.x,
      dz = q.z - p.z;
    const u = clamp(
      ((x - p.x) * dx + (z - p.z) * dz) / (dx * dx + dz * dz),
      0,
      1,
    );
    const distance = (x - p.x - u * dx) ** 2 + (z - p.z - u * dz) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestT = (i + u) / points.length;
    }
  }
  const p = sampleTrack(bestT, levelId);
  return {
    ...p,
    distance: Math.hypot(x - p.x, z - p.z),
    signedDistance: (x - p.x) * p.nx + (z - p.z) * p.nz,
  };
}
export type GamePhase =
  "menu" | "countdown" | "racing" | "paused" | "finished" | "failed";
export interface GameState {
  phase: GamePhase;
  levelId: number;
  obstacleHits: number;
  impactCooldown: number;
  sand: boolean;
  pausedPhase: "countdown" | "racing";
  x: number;
  z: number;
  heading: number;
  speed: number;
  elapsed: number;
  remaining: number;
  countdown: number;
  penalty: number;
  nextCheckpoint: number;
  checkpointsPassed: number;
  progress: number;
  collisionFlash: number;
  finishTime: number | null;
  recoveryCooldown: number;
  offroadTime: number;
}
export interface DrivingInput {
  throttle: number;
  brake: number;
  steer: number;
  recover?: boolean;
}
export function createGame(levelId = 0): GameState {
  levelId = getLevel(levelId).id;
  const p = sampleTrack(0, levelId);
  return {
    phase: "menu",
    levelId,
    obstacleHits: 0,
    impactCooldown: 0,
    sand: false,
    pausedPhase: "racing",
    x: p.x,
    z: p.z,
    heading: p.heading,
    speed: 0,
    elapsed: 0,
    remaining: getLevel(levelId).timeLimit,
    countdown: 3,
    penalty: 0,
    nextCheckpoint: 1,
    checkpointsPassed: 0,
    progress: 0,
    collisionFlash: 0,
    finishTime: null,
    recoveryCooldown: 0,
    offroadTime: 0,
  };
}
export function resetGame(state: GameState) {
  Object.assign(state, createGame(state.levelId));
}
export function startGame(state: GameState) {
  resetGame(state);
  state.phase = "countdown";
}
export function pauseGame(state: GameState) {
  if (state.phase === "racing" || state.phase === "countdown") {
    state.pausedPhase = state.phase;
    state.phase = "paused";
  }
}
export function resumeGame(state: GameState) {
  if (state.phase === "paused") state.phase = state.pausedPhase;
}
export function recoverCar(state: GameState) {
  if (state.phase !== "racing" || state.recoveryCooldown > 0) return;
  const p = sampleTrack(state.checkpointsPassed / 8, state.levelId);
  state.x = p.x;
  state.z = p.z;
  state.heading = p.heading;
  state.speed = 0;
  state.penalty += 3;
  state.elapsed += 3;
  state.remaining = Math.max(
    0,
    getLevel(state.levelId).timeLimit - state.elapsed,
  );
  state.recoveryCooldown = 1.5;
  state.offroadTime = 0;
  state.progress = state.checkpointsPassed / 8;
  if (state.remaining <= 0) state.phase = "failed";
}
/** Bounded substeps keep collisions and gate crossing reliable after slow frames. */
export function tickGame(state: GameState, input: DrivingInput, dt: number) {
  if (
    !Number.isFinite(dt) ||
    dt <= 0 ||
    state.phase === "paused" ||
    state.phase === "menu" ||
    state.phase === "finished" ||
    state.phase === "failed"
  )
    return;
  let left = Math.min(dt, 0.25);
  while (left > 1e-8) {
    const step = Math.min(left, 1 / 60);
    advance(state, input, step);
    left -= step;
  }
}
function advance(s: GameState, input: DrivingInput, dt: number) {
  if (s.phase === "countdown") {
    s.countdown = Math.max(0, s.countdown - dt);
    if (s.countdown < 1e-8) {
      s.countdown = 0;
      s.phase = "racing";
    }
    return;
  }
  if (s.phase !== "racing") return;
  s.elapsed += dt;
  s.remaining = Math.max(0, getLevel(s.levelId).timeLimit - s.elapsed);
  if (s.remaining <= 0) {
    s.phase = "failed";
    s.speed = 0;
    return;
  }
  s.impactCooldown = Math.max(0, s.impactCooldown - dt);
  s.collisionFlash = Math.max(0, s.collisionFlash - dt);
  s.recoveryCooldown = Math.max(0, s.recoveryCooldown - dt);
  if (input.recover && s.recoveryCooldown === 0) {
    recoverCar(s);
    return;
  }
  const throttle = clamp(input.throttle, 0, 1),
    brake = clamp(input.brake, 0, 1),
    steer = clamp(input.steer, -1, 1);
  if (throttle > 0) s.speed += throttle * (s.speed < 0 ? 22 : 12) * dt;
  if (brake > 0) s.speed -= brake * (s.speed > 0.5 ? 27 : 7) * dt;
  if (throttle === 0 && brake === 0) {
    const drag = (1.2 + Math.abs(s.speed) * 0.055) * dt;
    s.speed =
      Math.abs(s.speed) <= drag ? 0 : s.speed - Math.sign(s.speed) * drag;
  }
  s.speed = clamp(s.speed, -7, MAX_SPEED);
  const surface = nearestTrack(s.x, s.z, s.levelId);
  s.sand = onSand(surface.t, s.levelId);
  if (s.sand) {
    s.speed *= Math.exp(-dt * 0.48);
  }
  const turnRate =
    Math.min(Math.abs(s.speed) / 7, 1) *
    (1.5 - (0.65 * Math.abs(s.speed)) / MAX_SPEED);
  s.heading +=
    steer * (s.sand ? 0.62 : 1) * turnRate * Math.sign(s.speed || 1) * dt;
  const oldX = s.x,
    oldZ = s.z;
  s.x += Math.sin(s.heading) * s.speed * dt;
  s.z += Math.cos(s.heading) * s.speed * dt;
  const near = nearestTrack(s.x, s.z, s.levelId);
  const roadWidth = widthAt(near.t, s.levelId);
  const boundary = roadWidth / 2 - 1.03;
  if (near.distance > boundary) {
    const side = Math.sign(near.signedDistance);
    s.x = near.x + near.nx * side * (boundary - 0.05);
    s.z = near.z + near.nz * side * (boundary - 0.05);
    // A glancing scrape loses little speed; a head-on impact stops the car.
    const along = Math.sin(s.heading) * near.tx + Math.cos(s.heading) * near.tz;
    s.speed *= clamp(Math.abs(along) * 0.9, 0.15, 0.9);
    s.collisionFlash = 0.35;
  }
  for (const obstacle of getTrack(s.levelId).obstacles) {
    const dx = s.x - obstacle.x,
      dz = s.z - obstacle.z,
      d = Math.hypot(dx, dz),
      safe = obstacle.radius + 1;
    if (d < safe - 0.00001) {
      const impactSpeed = Math.abs(s.speed);
      const nx = d > 0.001 ? dx / d : near.nx,
        nz = d > 0.001 ? dz / d : near.nz;
      s.x = obstacle.x + nx * safe;
      s.z = obstacle.z + nz * safe;
      s.speed *= 0.22;
      s.collisionFlash = 0.5;
      if (s.impactCooldown === 0 && impactSpeed > 1) {
        s.obstacleHits++;
        s.penalty += 1.5;
        s.elapsed += 1.5;
        s.remaining = Math.max(0, getLevel(s.levelId).timeLimit - s.elapsed);
        s.impactCooldown = 1;
        if (s.remaining === 0) {
          s.phase = "failed";
          s.speed = 0;
          return;
        }
      }
    }
  }
  s.progress = near.t;
  const gate = getTrack(s.levelId).checkpoints[s.nextCheckpoint - 1];
  if (gate) {
    const oldAlong = (oldX - gate.x) * gate.tx + (oldZ - gate.z) * gate.tz;
    const newAlong = (s.x - gate.x) * gate.tx + (s.z - gate.z) * gate.tz;
    const cross = Math.abs((s.x - gate.x) * gate.nx + (s.z - gate.z) * gate.nz);
    if (
      oldAlong < 0 &&
      newAlong >= 0 &&
      cross <= widthAt(gate.t, s.levelId) / 2 + 0.5 &&
      Math.hypot(s.x - gate.x, s.z - gate.z) < 10
    ) {
      s.checkpointsPassed++;
      s.nextCheckpoint++;
      if (s.checkpointsPassed === 8) {
        s.phase = "finished";
        s.finishTime = s.elapsed;
        s.speed = 0;
      }
    }
  }
}
