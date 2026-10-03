import { getTrack } from "./game";
import { LEVELS, getLevel } from "./levels";

export type Phase = "menu" | "countdown" | "racing" | "paused" | "won" | "lost";
export type InputKey = "left" | "right" | "accelerate" | "brake";
export interface UIActions {
  start(): void;
  selectLevel(id: number): void;
  nextLevel(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  home(): void;
  recover(): void;
  sound(enabled: boolean): void;
  input(key: InputKey, pressed: boolean): void;
}
export interface UIView {
  phase: Phase;
  levelId?: number;
  completed?: number[];
  obstacleHits?: number;
  sand?: boolean;
  elapsed: number;
  remaining: number;
  speed: number;
  checkpoint: number;
  totalCheckpoints?: number;
  countdown: number;
  record?: number | string | null;
  mapPosition?: { x: number; y: number; angle?: number };
  sound?: boolean;
  progress?: number;
  newRecord?: boolean;
}
const time = (seconds: number) => {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}.${Math.floor((s % 1) * 10)}`;
};
const icons: Record<string, string> = {
  sound:
    '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  recover: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  up: '<path d="m5 15 7-7 7 7"/>',
};
const icon = (name: string) => icons[name] || "";
const svg = (name: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon(name)}</svg>`;

export function createUI(actions: UIActions) {
  const root = document.createElement("div");
  root.id = "game-ui";
  root.dataset.phase = "menu";
  root.innerHTML = `
    <header class="masthead"><a class="wordmark" href="#" aria-label="Costa Sprint, início">CS<span> / </span>3D RACE</a><span class="edition">UM PEQUENO DESVIO DA ROTINA</span><button class="icon-button sound-button" aria-label="Desativar som" title="Som">${svg("sound")}</button></header>
    <section class="menu-screen overlay" aria-label="Início">
      <div class="menu-copy"><div class="eyebrow"><span class="tiny-star">✳</span> CORRIDA À BEIRA-MAR</div><h1>Costa<br><em>Sprint.</em></h1><p class="intro">O sol está baixando.<br>A estrada é toda sua.</p><div class="start-block"><button class="primary start-button" disabled><span class="start-label">Preparando a costa…</span>${svg("arrow")}</button><span class="start-note">UMA VOLTA. O SEU MELHOR TEMPO.</span></div><div class="menu-record"><span>SEU RECORDE</span><strong class="record-value">—</strong></div></div>
      <section class="level-picker" aria-label="Escolha o nível"><span class="picker-heading">TRÊS CAMINHOS PELA COSTA</span>${LEVELS.map((level) => `<button class="level-choice" data-level="${level.id}" aria-pressed="${level.id === 0}"><span class="level-number">0${level.id + 1}</span><span class="level-choice-copy"><strong>${level.name}</strong><small>${level.difficulty}</small></span><span class="level-status" aria-label="Nível concluído">✓</span></button>`).join("")}<p class="level-description"></p></section>
      <div class="route-note"><span class="route-number">01</span><div><strong>Circuito da Costa</strong><span>Curvas, brisa e pé no acelerador.</span></div></div>
      <footer class="menu-footer"><span>FEITO PARA PEGAR A ESTRADA</span><div class="desktop-instructions"><kbd>W A S D</kbd><span>ou setas · dirigir</span><kbd>ESPAÇO</kbd><span>frear</span><kbd>R</kbd><span>recuperar</span></div><span class="mobile-instructions">Controles de toque disponíveis na corrida</span></footer>
    </section>
    <section class="race-hud" aria-label="Informações da corrida"><div class="hud-timing"><div><span>TEMPO</span><strong class="elapsed-value">00:00.0</strong></div><div class="remaining-cell"><span>RESTA</span><strong class="remaining-value">02:00</strong></div><div><span>PORTAIS</span><strong><b class="checkpoint-value">0</b><small class="checkpoint-total"> / 8</small></strong></div></div><button class="icon-button pause-button" aria-label="Pausar corrida">${svg("pause")}</button></section>
    <div class="race-bottom"><div class="speedometer"><strong class="speed-value">0</strong><span>KM/H</span><div class="speed-line"><i></i></div></div><div class="mini-map"><svg viewBox="0 0 140 100" aria-label="Mapa do circuito"><path class="map-route" d="M32 77 C12 69 18 48 30 35 C46 15 61 15 80 23 C94 29 126 22 124 43 C122 57 112 63 100 66 C82 69 76 88 57 86 C45 85 40 80 32 77Z"/><path class="map-start" d="M28 73 24 82"/><circle class="map-dot" cx="32" cy="77" r="4"/></svg><span>CIRCUITO DA COSTA</span></div><button class="recover-button" title="Recuperar carro (R)">${svg("recover")}<span>RECUPERAR <kbd>R</kbd></span></button></div>
    <div class="countdown" role="status" aria-live="polite"><span class="countdown-label">RESPIRA. ACELERA.</span><strong class="countdown-value">3</strong></div>
    <div class="surface-alert" role="status">AREIA · MENOS ADERÊNCIA</div><div class="impact-alert" role="status">IMPACTO +1,5s</div><div class="race-level-label"></div><div class="race-hint">Passe pelos portais em ordem e complete a volta antes do tempo acabar.</div>
    <section class="modal-screen pause-screen" aria-label="Corrida pausada"><div class="modal-card"><span class="eyebrow">UMA PAUSA NA COSTA</span><h2>Sem pressa.</h2><p>A estrada espera por você.<br>O relógio está parado.</p><button class="primary resume-button">Continuar ${svg("arrow")}</button><button class="text-button restart-button">Recomeçar a corrida</button><button class="text-button home-button">Voltar ao início</button><div class="modal-controls"><span><kbd>W A S D</kbd> / setas · dirigir</span><span><kbd>ESPAÇO</kbd> freio · <kbd>R</kbd> recuperar</span><span><kbd>ESC</kbd> pausar / continuar</span></div></div></section>
    <section class="modal-screen result-screen" aria-label="Resultado"><div class="modal-card"><span class="eyebrow result-eyebrow">LINHA DE CHEGADA</span><h2 class="result-title">Boa viagem.</h2><p class="result-description">Uma volta para guardar.</p><div class="result-stats"><div><span>SEU TEMPO</span><strong class="result-time">00:00.0</strong></div><div><span>RECORDE PESSOAL</span><strong class="result-record">—</strong></div></div><span class="new-record">NOVO RECORDE. ESSA COSTA É SUA.</span><button class="primary next-level-button">Próximo nível ${svg("arrow")}</button><button class="primary restart-button">Mais uma volta ${svg("arrow")}</button><button class="text-button home-button">Voltar ao início</button></div></section>
    <div class="touch-controls" aria-label="Controles de toque"><div class="touch-steering"><button data-input="left" aria-label="Virar à esquerda">${svg("left")}</button><button data-input="right" aria-label="Virar à direita">${svg("right")}</button></div><div class="touch-pedals"><button class="touch-brake" data-input="brake" aria-label="Frear">FREIO</button><button class="touch-accelerate" data-input="accelerate" aria-label="Acelerar">${svg("up")}<span>ACELERAR</span></button></div></div>
    <section class="error-screen" hidden role="alert"><div class="modal-card"><span class="eyebrow">UMA CURVA INESPERADA</span><h2>Não deu partida.</h2><p class="error-message"></p><button class="primary reload-button">Tentar novamente ${svg("arrow")}</button></div></section>`;
  document.body.append(root);
  function updateMap(levelId: number) {
    const mapPoints = getTrack(levelId).points.map((p) => ({
      x: ((p.x + 120) / 240) * 120 + 10,
      y: ((p.z + 145) / 290) * 80 + 10,
    }));
    root
      .querySelector(".map-route")!
      .setAttribute(
        "d",
        `${mapPoints.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ")} Z`,
      );
    const map = root.querySelector(".mini-map svg")!;
    map.querySelectorAll(".map-obstacle").forEach((o) => o.remove());
    for (const obstacle of getTrack(levelId).obstacles) {
      const dot = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      dot.setAttribute("class", "map-obstacle");
      dot.setAttribute("cx", String(((obstacle.x + 120) / 240) * 120 + 10));
      dot.setAttribute("cy", String(((obstacle.z + 145) / 290) * 80 + 10));
      dot.setAttribute("r", "2");
      map.insertBefore(dot, map.querySelector(".map-dot"));
    }
    const start = mapPoints[0];
    root
      .querySelector(".map-start")!
      .setAttribute(
        "d",
        `M${start.x - 3} ${start.y - 3} L${start.x + 3} ${start.y + 3}`,
      );
  }
  updateMap(0);
  const startNote = root.querySelector(".start-note")!;
  startNote.textContent = "UMA VOLTA · 8 PORTAIS · 120 SEGUNDOS";
  const recoverButton =
    root.querySelector<HTMLButtonElement>(".recover-button")!;
  recoverButton.title = "Recuperar carro (R) · penalidade de 3 segundos";
  recoverButton.setAttribute(
    "aria-label",
    "Recuperar carro, penalidade de 3 segundos",
  );
  root.querySelector(".modal-controls span:nth-child(2)")!.innerHTML =
    "<kbd>ESPAÇO</kbd> freio · <kbd>R</kbd> recuperar (+3s)";
  root.querySelector(".route-note div span")!.textContent =
    "Recuperar o carro custa 3 segundos.";
  const el = (selector: string) => root.querySelector<HTMLElement>(selector)!;
  let ready = false;
  let sound = true;
  let phase: Phase = "menu";
  let levelId = -1;
  let lastHits = 0;
  let hitTimeout: ReturnType<typeof setTimeout> | undefined;
  const on = (selector: string, action: () => void) =>
    root
      .querySelectorAll(selector)
      .forEach((button) => button.addEventListener("click", action));
  on(".start-button", () => {
    if (ready) actions.start();
  });
  on(".next-level-button", actions.nextLevel);
  root.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((button) =>
    button.addEventListener("click", () => {
      if (ready) actions.selectLevel(Number(button.dataset.level));
    }),
  );
  on(".pause-button", actions.pause);
  on(".resume-button", actions.resume);
  on(".restart-button", actions.restart);
  on(".home-button", actions.home);
  on(".recover-button", actions.recover);
  on(".reload-button", () => location.reload());
  el(".wordmark").addEventListener("click", (event) => {
    event.preventDefault();
    if (phase !== "menu") actions.home();
  });
  on(".sound-button", () => {
    sound = !sound;
    actions.sound(sound);
    renderSound();
  });
  function renderSound() {
    const button = el(".sound-button");
    button.innerHTML = svg(sound ? "sound" : "muted");
    button.setAttribute("aria-label", sound ? "Desativar som" : "Ativar som");
    button.setAttribute("aria-pressed", String(sound));
  }
  root.querySelectorAll<HTMLButtonElement>("[data-input]").forEach((button) => {
    const key = button.dataset.input as InputKey;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      button.classList.add("pressed");
      actions.input(key, true);
    });
    const release = () => {
      button.classList.remove("pressed");
      actions.input(key, false);
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  });
  const setText = (selector: string, value: string) => {
    const node = el(selector);
    if (node.textContent !== value) node.textContent = value;
  };
  renderSound();
  return {
    update(view: UIView) {
      const selected = view.levelId ?? 0,
        level = getLevel(selected);
      if (levelId !== selected) {
        levelId = selected;
        updateMap(levelId);
        setText(".route-number", `0${levelId + 1}`);
        setText(".route-note strong", level.name);
        setText(".route-note div span", level.subtitle);
        setText(".level-description", level.description);
        setText(
          ".start-note",
          `8 PORTAIS · ${level.timeLimit} SEGUNDOS · RECUPERAÇÃO +3s`,
        );
        setText(".mini-map>span", level.name.toUpperCase());
        setText(".race-level-label", `0${levelId + 1} / 03 · ${level.name}`);
        root
          .querySelectorAll<HTMLButtonElement>("[data-level]")
          .forEach((b) =>
            b.setAttribute(
              "aria-pressed",
              String(Number(b.dataset.level) === levelId),
            ),
          );
      }
      root
        .querySelectorAll<HTMLButtonElement>("[data-level]")
        .forEach((b) =>
          b.classList.toggle(
            "completed",
            !!view.completed?.includes(Number(b.dataset.level)),
          ),
        );
      el(".surface-alert").classList.toggle(
        "visible",
        !!view.sand && view.phase === "racing",
      );
      if ((view.obstacleHits ?? 0) > lastHits && view.phase === "racing") {
        el(".impact-alert").classList.add("visible");
        clearTimeout(hitTimeout);
        hitTimeout = setTimeout(
          () => el(".impact-alert").classList.remove("visible"),
          1600,
        );
      }
      lastHits = view.obstacleHits ?? 0;
      if (view.phase !== "racing")
        el(".impact-alert").classList.remove("visible");
      el(".next-level-button").hidden = !(
        view.phase === "won" && levelId < LEVELS.length - 1
      );
      setText(
        ".result-screen .restart-button",
        view.phase === "won" && levelId === 2
          ? "Repetir o desafio"
          : "Mais uma volta",
      );
      if (phase !== view.phase) {
        phase = view.phase;
        root.dataset.phase = phase;
        if (phase === "paused")
          el(".resume-button").focus({ preventScroll: true });
        if (phase === "won" || phase === "lost")
          el(".result-screen .restart-button").focus({ preventScroll: true });
        if (phase === "menu" && ready)
          el(".start-button").focus({ preventScroll: true });
        root
          .querySelectorAll<HTMLButtonElement>("[data-input]")
          .forEach((button) => {
            button.classList.remove("pressed");
            actions.input(button.dataset.input as InputKey, false);
          });
      }
      if (view.sound !== undefined && view.sound !== sound) {
        sound = view.sound;
        renderSound();
      }
      const record =
        typeof view.record === "number"
          ? time(view.record)
          : view.record || "—";
      setText(".record-value", record);
      setText(".result-record", record);
      setText(".elapsed-value", time(view.elapsed));
      const remaining = Math.ceil(Math.max(0, view.remaining));
      setText(
        ".remaining-value",
        `${Math.floor(remaining / 60)
          .toString()
          .padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`,
      );
      el(".remaining-cell").classList.toggle("urgent", view.remaining < 20);
      setText(".speed-value", String(Math.round(Math.max(0, view.speed))));
      el(".speed-line i").style.transform =
        `scaleX(${Math.min(1, view.speed / 150)})`;
      setText(".checkpoint-value", String(view.checkpoint));
      setText(".checkpoint-total", ` / ${view.totalCheckpoints || 8}`);
      setText(
        ".countdown-value",
        view.countdown > 0 ? String(Math.ceil(view.countdown)) : "VAI!",
      );
      if (view.mapPosition) {
        const dot = root.querySelector(".map-dot")!;
        dot.setAttribute("cx", String(view.mapPosition.x));
        dot.setAttribute("cy", String(view.mapPosition.y));
      }
      if (phase === "won" || phase === "lost") {
        const won = phase === "won";
        setText(".result-eyebrow", won ? "LINHA DE CHEGADA" : "O TEMPO ACABOU");
        setText(
          ".result-title",
          won
            ? levelId === 2
              ? "Costa conquistada."
              : "Boa viagem."
            : "Quase lá.",
        );
        setText(
          ".result-description",
          won
            ? levelId === 2
              ? "Você venceu o desafio do farol. Explore os outros percursos e melhore seus recordes."
              : `${level.name} concluído. O próximo caminho espera por você.`
            : "Mais uma chance de encontrar a curva perfeita.",
        );
        setText(
          ".result-time",
          won
            ? time(view.elapsed)
            : `${view.checkpoint} / ${view.totalCheckpoints || 8} portais`,
        );
        el(".new-record").classList.toggle("visible", !!view.newRecord && won);
      }
    },
    setReady() {
      ready = true;
      el(".start-button").removeAttribute("disabled");
      setText(".start-label", "Pegar a estrada");
    },
    showLoading(message = "Preparando a costa…") {
      ready = false;
      el(".start-button").setAttribute("disabled", "");
      setText(".start-label", message);
    },
    showError(message: string) {
      setText(".error-message", message);
      el(".error-screen").hidden = false;
      root.dataset.error = "true";
    },
    destroy() {
      root.remove();
    },
  };
}
