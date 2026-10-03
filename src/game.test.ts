import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  startGame,
  tickGame,
  pauseGame,
  resumeGame,
  resetGame,
  recoverCar,
  sampleTrack,
  nearestTrack,
  CHECKPOINTS,
  TIME_LIMIT,
  ROAD_WIDTH,
} from "./game.ts";
const idle = { throttle: 0, brake: 0, steer: 0 };
function race() {
  const s = createGame();
  startGame(s);
  for (let i = 0; i < 13; i++) tickGame(s, idle, 0.25);
  assert.equal(s.phase, "racing");
  return s;
}
function cross(
  s: ReturnType<typeof createGame>,
  index: number,
  backwards = false,
) {
  const gate = CHECKPOINTS[index - 1];
  s.x = gate.x - gate.tx * (backwards ? -0.15 : 0.15);
  s.z = gate.z - gate.tz * (backwards ? -0.15 : 0.15);
  s.heading = gate.heading + (backwards ? Math.PI : 0);
  s.speed = 20;
  tickGame(s, idle, 1 / 60);
}
test("closed track has consistent tangents and nearest coordinates", () => {
  assert.deepEqual(sampleTrack(0), sampleTrack(1));
  for (const t of [0, 0.13, 0.35, 0.57, 0.8]) {
    const p = sampleTrack(t),
      q = nearestTrack(p.x + p.nx * 4, p.z + p.nz * 4);
    assert.ok(Math.abs(q.distance - 4) < 0.02);
    assert.ok(Math.abs(q.signedDistance - 4) < 0.02);
    assert.ok(Math.abs(Math.sin(p.heading) - p.tx) < 1e-9);
  }
});
test("only explicit start enters countdown and driving is frozen until start", () => {
  const s = createGame(),
    initial = { ...s };
  tickGame(s, { throttle: 1, brake: 0, steer: 1 }, 0.25);
  assert.deepEqual(s, initial);
  startGame(s);
  tickGame(s, { throttle: 1, brake: 0, steer: 1 }, 0.25);
  assert.equal(s.phase, "countdown");
  assert.equal(s.speed, 0);
  assert.equal(s.elapsed, 0);
});
test("pause freezes countdown, movement and race clock; resume restores phase", () => {
  const s = createGame();
  startGame(s);
  pauseGame(s);
  const paused = { ...s };
  tickGame(s, idle, 0.25);
  assert.deepEqual(s, paused);
  resumeGame(s);
  assert.equal(s.phase, "countdown");
  const r = race();
  tickGame(r, { throttle: 1, brake: 0, steer: 0 }, 0.25);
  pauseGame(r);
  const snapshot = { ...r };
  tickGame(r, { throttle: 1, brake: 0, steer: 1 }, 0.25);
  assert.deepEqual(r, snapshot);
  resumeGame(r);
  assert.equal(r.phase, "racing");
});
test("checkpoints require forward crossing in strict order, finish requires all eight", () => {
  const s = race();
  cross(s, 8);
  cross(s, 2);
  assert.equal(s.checkpointsPassed, 0);
  cross(s, 1, true);
  assert.equal(s.checkpointsPassed, 0);
  for (let i = 1; i <= 7; i++) {
    cross(s, i);
    assert.equal(s.checkpointsPassed, i);
    assert.equal(s.phase, "racing");
  }
  cross(s, 8);
  assert.equal(s.phase, "finished");
  assert.equal(s.checkpointsPassed, 8);
  assert.ok(s.finishTime! > 0);
  const finish = { ...s };
  tickGame(s, idle, 0.25);
  assert.deepEqual(s, finish);
});
test("rails keep car inside road and reduce impact speed", () => {
  const s = race(),
    p = sampleTrack(0.2);
  s.x = p.x + p.nx * (ROAD_WIDTH / 2 - 0.05);
  s.z = p.z + p.nz * (ROAD_WIDTH / 2 - 0.05);
  s.heading = Math.atan2(p.nx, p.nz);
  s.speed = 30;
  tickGame(s, idle, 0.05);
  assert.ok(nearestTrack(s.x, s.z).distance <= ROAD_WIDTH / 2 + 0.01);
  assert.ok(s.speed < 10);
  assert.ok(s.collisionFlash > 0);
});
test("recovery returns to last validated gate with penalty and cooldown", () => {
  const s = race();
  cross(s, 1);
  cross(s, 2);
  const elapsed = s.elapsed;
  s.x = 1000;
  s.z = 1000;
  recoverCar(s);
  assert.equal(s.x, CHECKPOINTS[1].x);
  assert.equal(s.z, CHECKPOINTS[1].z);
  assert.equal(s.speed, 0);
  assert.equal(s.penalty, 3);
  assert.equal(s.elapsed, elapsed + 3);
  assert.equal(s.checkpointsPassed, 2);
  recoverCar(s);
  assert.equal(s.penalty, 3);
});
test("time limit fails, reset clears every transient and checkpoint", () => {
  const s = race();
  s.elapsed = TIME_LIMIT - 0.01;
  tickGame(s, idle, 0.1);
  assert.equal(s.phase, "failed");
  assert.equal(s.remaining, 0);
  assert.equal(s.speed, 0);
  resetGame(s);
  assert.deepEqual(s, createGame());
});
test("input clamps, finite delta guard and reverse braking are bounded", () => {
  const s = race(),
    before = { ...s };
  tickGame(s, idle, NaN);
  assert.deepEqual(s, before);
  for (let i = 0; i < 10; i++)
    tickGame(s, { throttle: 0, brake: 50, steer: 0 }, 0.25);
  assert.ok(s.speed >= -7 && s.speed < 0);
});
test("continuous steering can complete the whole circuit without collisions or recovery", () => {
  const s = race();
  let collisions = 0;
  for (let i = 0; i < 60 * TIME_LIMIT && s.phase === "racing"; i++) {
    const near = nearestTrack(s.x, s.z),
      target = sampleTrack(near.t + 0.025);
    const desired = Math.atan2(target.x - s.x, target.z - s.z);
    const error = Math.atan2(
      Math.sin(desired - s.heading),
      Math.cos(desired - s.heading),
    );
    const desiredSpeed = Math.abs(error) > 0.35 ? 22 : 32;
    tickGame(
      s,
      {
        throttle: s.speed < desiredSpeed ? 1 : 0,
        brake: s.speed > desiredSpeed + 1 ? 0.2 : 0,
        steer: Math.max(-1, Math.min(1, error * 2)),
      },
      1 / 60,
    );
    if (s.collisionFlash > 0) collisions++;
  }
  assert.equal(s.phase, "finished");
  assert.equal(s.checkpointsPassed, 8);
  assert.equal(collisions, 0);
  assert.equal(s.penalty, 0);
  assert.ok(s.finishTime! < TIME_LIMIT);
});

import { LEVELS, widthAt, onSand } from "./levels.ts";
import { getTrack } from "./game.ts";
test("three independent layouts have decreasing road width and time budgets", () => {
  assert.equal(LEVELS.length, 3);
  for (const level of LEVELS) {
    const s = createGame(level.id);
    assert.equal(s.remaining, level.timeLimit);
    assert.equal(s.levelId, level.id);
    assert.deepEqual(sampleTrack(0, level.id), sampleTrack(1, level.id));
    assert.equal(getTrack(level.id).checkpoints.length, 8);
    for (const t of [0.12, 0.4, 0.7]) {
      const p = sampleTrack(t, level.id);
      assert.ok(nearestTrack(p.x, p.z, level.id).distance < 0.02);
    }
    startGame(s);
    pauseGame(s);
    tickGame(s, idle, 0.25);
    assert.equal(s.countdown, 3);
    resetGame(s);
    assert.equal(s.levelId, level.id);
  }
  assert.notDeepEqual(getTrack(0).points, getTrack(1).points);
  assert.notDeepEqual(getTrack(1).points, getTrack(2).points);
  assert.ok(
    LEVELS[0].roadWidth > LEVELS[1].roadWidth &&
      LEVELS[1].roadWidth > LEVELS[2].roadWidth,
  );
  assert.ok(
    LEVELS[0].timeLimit > LEVELS[1].timeLimit &&
      LEVELS[1].timeLimit > LEVELS[2].timeLimit,
  );
});
test("rocks are solid, penalize once per impact and reset with the selected level", () => {
  for (const id of [1, 2]) {
    const s = createGame(id);
    startGame(s);
    for (let i = 0; i < 13; i++) tickGame(s, idle, 0.25);
    const o = getTrack(id).obstacles[0];
    s.x = o.x;
    s.z = o.z;
    s.speed = 22;
    tickGame(s, idle, 1 / 60);
    assert.equal(s.obstacleHits, 1);
    assert.equal(s.penalty, 1.5);
    assert.ok(Math.hypot(s.x - o.x, s.z - o.z) >= o.radius + 0.999);
    assert.ok(s.speed < 6);
    tickGame(s, idle, 1 / 60);
    assert.equal(s.penalty, 1.5);
    recoverCar(s);
    assert.equal(s.penalty, 4.5);
    resetGame(s);
    assert.equal(s.obstacleHits, 0);
    assert.equal(s.levelId, id);
  }
});
test("farol sand slows and reduces steering, and its causeway is narrower", () => {
  assert.equal(onSand(0.28, 2), true);
  assert.equal(onSand(0.28, 1), false);
  assert.ok(widthAt(0.45, 2) < widthAt(0.2, 2));
  const clean = createGame(1),
    sand = createGame(2);
  for (const s of [clean, sand]) {
    startGame(s);
    for (let i = 0; i < 13; i++) tickGame(s, idle, 0.25);
    const p = sampleTrack(0.28, s.levelId);
    s.x = p.x;
    s.z = p.z;
    s.heading = p.heading;
    s.speed = 18;
    tickGame(s, { throttle: 0, brake: 0, steer: 0.5 }, 1 / 60);
  }
  assert.equal(sand.sand, true);
  assert.ok(sand.speed < clean.speed);
});
test("time limits and recovery respect the active circuit", () => {
  for (const level of LEVELS) {
    const s = createGame(level.id);
    startGame(s);
    for (let i = 0; i < 13; i++) tickGame(s, idle, 0.25);
    s.elapsed = level.timeLimit - 0.1;
    tickGame(s, idle, 0.2);
    assert.equal(s.phase, "failed");
    startGame(s);
    assert.equal(s.remaining, level.timeLimit);
    assert.equal(s.penalty, 0);
  }
});

test("both advanced tracks have a continuous collision-free route through every gate", () => {
  for (const id of [1, 2]) {
    const s = createGame(id);
    startGame(s);
    for (let i = 0; i < 13; i++) tickGame(s, idle, 0.25);
    for (let i = 0; i < 60 * 70 && s.phase === "racing"; i++) {
      const near = nearestTrack(s.x, s.z, id),
        target = sampleTrack(near.t + 0.013, id);
      let offset = 0;
      for (const o of getTrack(id).obstacles) {
        const dist = ((o.t - near.t + 1) % 1) * getTrack(id).length;
        if (dist < 26)
          offset = -Math.sign(o.offset) * 2.6 * Math.min(1, (26 - dist) / 8);
      }
      const angle = Math.atan2(
          target.x + target.nx * offset - s.x,
          target.z + target.nz * offset - s.z,
        ),
        diff = Math.atan2(
          Math.sin(angle - s.heading),
          Math.cos(angle - s.heading),
        );
      const ahead = sampleTrack(near.t + 0.025, id),
        curve = Math.abs(
          Math.atan2(
            Math.sin(ahead.heading - near.heading),
            Math.cos(ahead.heading - near.heading),
          ),
        );
      const desired = Math.max(
        9,
        Math.min(id === 1 ? 26 : 22, 14 / (curve + 0.45)),
      );
      tickGame(
        s,
        {
          throttle: s.speed < desired ? 1 : 0,
          brake: s.speed > desired + 1 ? 0.5 : 0,
          steer: Math.max(-1, Math.min(1, diff * 4)),
        },
        1 / 60,
      );
    }
    assert.equal(s.phase, "finished", `level ${id + 1}`);
    assert.equal(s.checkpointsPassed, 8);
    assert.equal(s.obstacleHits, 0);
    assert.equal(s.penalty, 0);
  }
});

test("resting against a rock does not accumulate fresh impact penalties", () => {
  const s = createGame(1);
  startGame(s);
  for (let i = 0; i < 13; i++) tickGame(s, idle, 0.25);
  const o = getTrack(1).obstacles[0];
  s.x = o.x;
  s.z = o.z;
  s.speed = 22;
  tickGame(s, idle, 1 / 60);
  assert.equal(s.penalty, 1.5);
  const p = sampleTrack(o.t, 1);
  s.x = o.x + p.tx * (o.radius + 1);
  s.z = o.z + p.tz * (o.radius + 1);
  s.speed = 0;
  for (let i = 0; i < 180; i++) tickGame(s, idle, 1 / 60);
  assert.equal(s.penalty, 1.5);
  assert.equal(s.obstacleHits, 1);
});
