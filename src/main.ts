import "./style.css";
import {
  createGame,
  startGame,
  pauseGame,
  resumeGame,
  resetGame,
  recoverCar,
  tickGame,
} from "./game";
import { getLevel, LEVELS } from "./levels";
import { createScene } from "./scene";
import { createUI } from "./ui";
import { createAudio } from "./audio";
const game = createGame();
const audio = createAudio();
let ready = false,
  sound = true,
  newRecord = false,
  record: number | undefined;
const records: (number | undefined)[] = LEVELS.map(() => undefined);
const completed: number[] = [];
try {
  const saved = JSON.parse(
    localStorage.getItem("costa-sprint:records") ?? "[]",
  );
  for (const level of LEVELS) {
    if (Number.isFinite(saved[level.id]) && saved[level.id] > 0)
      records[level.id] = saved[level.id];
  }
  const old = Number(localStorage.getItem("costa-sprint:record"));
  if (!records[0] && old > 0) records[0] = old;
  const done = JSON.parse(
    localStorage.getItem("costa-sprint:completed") ?? "[]",
  );
  if (Array.isArray(done))
    completed.push(
      ...done.filter(
        (id) => Number.isInteger(id) && id >= 0 && id < LEVELS.length,
      ),
    );
} catch {}
record = records[game.levelId];
function chooseLevel(id: number) {
  if (!ready || !Number.isInteger(id) || !LEVELS[id]) return;
  clear();
  Object.assign(game, createGame(id));
  record = records[id];
  newRecord = false;
}
const keys = new Set<string>(),
  touch = new Set<string>();
const clear = () => {
  keys.clear();
  touch.clear();
};
const begin = () => {
  if (!ready) return;
  clear();
  newRecord = false;
  void audio.unlock();
  startGame(game);
};
const ui = createUI({
  start: begin,
  selectLevel: chooseLevel,
  nextLevel: () => {
    if (game.phase !== "finished" || game.levelId >= LEVELS.length - 1) return;
    chooseLevel(game.levelId + 1);
    begin();
  },
  pause: () => {
    pauseGame(game);
    clear();
  },
  resume: () => {
    resumeGame(game);
    clear();
  },
  restart: begin,
  home: () => {
    resetGame(game);
    clear();
  },
  recover: () => recoverCar(game),
  sound: (v: boolean) => {
    sound = v;
    audio.setEnabled(v);
    void audio.unlock();
  },
  input: (key: string, pressed: boolean) => {
    if (pressed) touch.add(key);
    else touch.delete(key);
  },
});
ui.showLoading("Preparando o circuito…");
const controlled = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "w",
  "a",
  "s",
  "d",
  " ",
  "Escape",
  "p",
  "r",
];
window.addEventListener("keydown", (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (controlled.includes(key)) {
    if (
      key === " " &&
      game.phase !== "racing" &&
      game.phase !== "countdown" &&
      (e.target instanceof HTMLButtonElement ||
        e.target instanceof HTMLAnchorElement)
    )
      return;
    e.preventDefault();
    if (!e.repeat) {
      if (key === "Escape" || key === "p") {
        if (game.phase === "paused") resumeGame(game);
        else pauseGame(game);
        clear();
      }
      if (key === "r") recoverCar(game);
    }
    keys.add(key);
  }
});
window.addEventListener("keyup", (e) =>
  keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key),
);
window.addEventListener("blur", () => {
  pauseGame(game);
  clear();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseGame(game);
    clear();
  }
});
const pressed = (...k: string[]) => k.some((x) => keys.has(x) || touch.has(x));
async function init() {
  try {
    const world = await createScene(
      document.querySelector<HTMLCanvasElement>("#world")!,
      (m) => ui.showLoading(m),
    );
    ready = true;
    ui.setReady();
    let prev = performance.now(),
      hudAt = 0,
      checkpoint = 0,
      count = 3,
      lastPhase = game.phase;
    function frame(now: number) {
      const dt = Math.min((now - prev) / 1000, 0.25);
      prev = now;
      tickGame(
        game,
        {
          throttle: +pressed("w", "ArrowUp", "accelerate"),
          brake: +pressed("s", "ArrowDown", " ", "brake"),
          steer:
            +pressed("a", "ArrowLeft", "left") -
            +pressed("d", "ArrowRight", "right"),
        },
        dt,
      );
      // Heading increases toward screen-left while moving forward.
      if (game.phase === "finished" && lastPhase !== "finished") {
        if (!record || game.finishTime! < record) {
          newRecord = true;
          record = game.finishTime!;
          records[game.levelId] = record;
          try {
            localStorage.setItem(
              "costa-sprint:records",
              JSON.stringify(records),
            );
          } catch {}
        }
        if (!completed.includes(game.levelId)) completed.push(game.levelId);
        try {
          localStorage.setItem(
            "costa-sprint:completed",
            JSON.stringify(completed),
          );
        } catch {}
        audio.beep(true);
        clear();
      }
      const nextCount = Math.ceil(game.countdown);
      if (game.phase === "countdown" && nextCount !== count) {
        audio.beep(nextCount === 0);
        count = nextCount;
      }
      if (game.checkpointsPassed > checkpoint) audio.beep(true);
      checkpoint = game.checkpointsPassed;
      if (game.phase === "menu") count = 3;
      lastPhase = game.phase;
      audio.update(game.speed, game.phase === "racing");
      if (now - hudAt > 80) {
        hudAt = now;
        ui.update({
          phase:
            game.phase === "finished"
              ? "won"
              : game.phase === "failed"
                ? "lost"
                : game.phase,
          levelId: game.levelId,
          completed,
          obstacleHits: game.obstacleHits,
          sand: game.sand,
          elapsed: game.elapsed,
          remaining: game.remaining,
          speed: Math.abs(game.speed) * 3.6,
          checkpoint: game.checkpointsPassed,
          countdown: game.countdown,
          record,
          sound,
          newRecord,
          mapPosition: {
            x: ((game.x + 120) / 240) * 120 + 10,
            y: ((game.z + 145) / 290) * 80 + 10,
            angle: game.heading,
          },
        });
      }
      world.render(game, dt, now / 1000);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    // Read-only runtime state useful for the local review and diagnostics.
    Object.defineProperty(window, "costaSprint", {
      value: {
        get state() {
          return { ...game };
        },
        renderer: world.renderer,
      },
    });
  } catch (error) {
    console.error(error);
    ui.showError(
      "Não foi possível carregar o 3D. Ative a aceleração de hardware no navegador e recarregue a página.",
    );
  }
}
void init();
