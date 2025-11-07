'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import type { GameState } from './components/types';

type OverlayType = 'start' | 'win' | 'lose' | null;

export default function Home() {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [resetToken, setResetToken] = useState(0);

  const animationFrame = useRef<number | undefined>(undefined);
  const runStartTime = useRef<number>(0);

  useEffect(() => {
    if (gameState !== 'running') {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = undefined;
      }
      return;
    }

    runStartTime.current = performance.now();

    const update = () => {
      const now = performance.now();
      setElapsedTime((now - runStartTime.current) / 1000);
      animationFrame.current = requestAnimationFrame(update);
    };

    animationFrame.current = requestAnimationFrame(update);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = undefined;
      }
    };
  }, [gameState]);

  const overlay: OverlayType = useMemo(() => {
    if (gameState === 'idle') return 'start';
    if (gameState === 'win') return 'win';
    if (gameState === 'lose') return 'lose';
    return null;
  }, [gameState]);

  const startRun = () => {
    setResetToken((value) => value + 1);
    setElapsedTime(0);
    setFinalTime(0);
    setGameState('running');
  };

  const handleWin = () => {
    setGameState('win');
    setFinalTime((prev) => (prev > 0 ? prev : elapsedTime));
    setSpeed(0);
  };

  const handleLose = () => {
    setGameState('lose');
    setFinalTime((prev) => (prev > 0 ? prev : elapsedTime));
    setSpeed(0);
  };

  const statusLabel = useMemo(() => {
    switch (gameState) {
      case 'running':
        return 'Racing';
      case 'win':
        return '🏁 You Win!';
      case 'lose':
        return '❌ Try Again';
      default:
        return 'Ready';
    }
  }, [gameState]);

  const displayedSpeed = Math.round(speed * 6);

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      <section className="relative h-screen w-full">
        <div className="absolute inset-0">
          <GameCanvas
            gameState={gameState}
            onWin={handleWin}
            onLose={handleLose}
            onSpeedChange={setSpeed}
            resetToken={resetToken}
          />
        </div>

        <HUD
          elapsedTime={gameState === 'running' ? elapsedTime : finalTime || elapsedTime}
          status={statusLabel}
          speed={displayedSpeed}
          onRestart={startRun}
        />

        {overlay && (
          <Overlay
            type={overlay}
            time={finalTime || elapsedTime}
            onStart={startRun}
          />
        )}
      </section>
    </main>
  );
}

type HudProps = {
  elapsedTime: number;
  status: string;
  speed: number;
  onRestart: () => void;
};

function HUD({ elapsedTime, status, speed, onRestart }: HudProps) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center p-4 sm:p-6">
      <div className="flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <InfoTile
            label="Tempo"
            value={`${elapsedTime.toFixed(2)}s`}
            icon="⏱️"
            accent="blue"
          />
          <InfoTile
            label="Velocidade"
            value={`${speed} km/h`}
            icon="⚡"
            accent="yellow"
          />
          <InfoTile
            label="Status"
            value={status}
            icon="🏁"
            accent="green"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="pointer-events-auto group relative overflow-hidden rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/40 active:scale-95"
            onClick={onRestart}
          >
            <span className="relative z-10">Restart</span>
            <div className="absolute inset-0 bg-linear-to-r from-emerald-400 to-teal-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </button>
        </div>
      </div>
    </div>
  );
}

type InfoTileProps = {
  label: string;
  value: string;
  icon?: string;
  accent?: 'blue' | 'yellow' | 'green' | 'red';
};

function InfoTile({ label, value, icon, accent = 'blue' }: InfoTileProps) {
  const accentColors = {
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    yellow: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
    green: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
    red: 'from-red-500/20 to-rose-500/20 border-red-500/30',
  };

  return (
    <div
      className={`flex flex-col rounded-xl border bg-linear-to-br ${accentColors[accent]} px-5 py-4 text-left backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl`}
    >
      <div className="mb-1 flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label}
        </span>
      </div>
      <span className="text-2xl font-bold text-white drop-shadow-lg">
        {value}
      </span>
    </div>
  );
}

type OverlayProps = {
  type: OverlayType;
  time: number;
  onStart: () => void;
};

function Overlay({ type, time, onStart }: OverlayProps) {
  const title = useMemo(() => {
    switch (type) {
      case 'win':
        return '🏁 Vitória!';
      case 'lose':
        return '💥 Tente Novamente';
      default:
        return '🏎️ 3D Race Challenge';
    }
  }, [type]);

  const description = useMemo(() => {
    if (type === 'start') {
      return 'Navegue pela pista, desvie dos obstáculos e alcance a linha de chegada o mais rápido possível!';
    }
    if (type === 'win') {
      return `Tempo final: ${time.toFixed(2)}s`;
    }
    return `Você saiu da pista! Tempo: ${time.toFixed(2)}s`;
  }, [time, type]);

  const buttonLabel = type === 'start' ? 'Iniciar Corrida' : 'Jogar Novamente';

  const buttonGradient = useMemo(() => {
    if (type === 'win') return 'from-emerald-500 to-teal-500';
    if (type === 'lose') return 'from-red-500 to-rose-500';
    return 'from-blue-500 to-cyan-500';
  }, [type]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-xl">
      <div className="mx-6 flex max-w-2xl flex-col items-center gap-8 rounded-3xl border border-white/10 bg-linear-to-br from-slate-900/95 to-slate-800/95 p-12 text-center shadow-2xl shadow-black/50 backdrop-blur-2xl">
        <div className="mb-2 text-6xl sm:text-7xl">
          {type === 'win' ? '🏁' : type === 'lose' ? '💥' : '🏎️'}
        </div>
        <h1 className="bg-linear-to-r from-white to-slate-200 bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-md text-lg text-slate-300 sm:text-xl">
          {description}
        </p>
        {type !== 'start' && (
          <div className="rounded-xl bg-slate-800/50 px-6 py-3">
            <span className="text-sm text-slate-400">Tempo</span>
            <div className="text-3xl font-bold text-white">{time.toFixed(2)}s</div>
          </div>
        )}
        <button
          type="button"
          onClick={onStart}
          className={`group relative overflow-hidden rounded-2xl bg-linear-to-r ${buttonGradient} px-10 py-4 text-base font-bold uppercase tracking-wider text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95`}
        >
          <span className="relative z-10">{buttonLabel}</span>
          <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </button>
        {type === 'start' && (
          <div className="mt-4 text-sm text-slate-400">
            <p className="mb-2 font-semibold">Controles:</p>
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              <span>W / ↑ = Acelerar</span>
              <span>A/D / ←/→ = Virar</span>
              <span>Espaço = Frear</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
