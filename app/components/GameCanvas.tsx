'use client';

import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls, Sky, Environment } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Car } from './Car';
import { Track } from './Track';
import { Obstacles } from './Obstacles';
import { FinishLine } from './FinishLine';
import { CameraRig } from './CameraRig';
import type { GameState } from './types';

export const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'brake', keys: ['Space'] },
];

type GameCanvasProps = {
  gameState: GameState;
  onWin: () => void;
  onLose: () => void;
  onSpeedChange: (speed: number) => void;
  resetToken: number;
};

export function GameCanvas({
  gameState,
  onWin,
  onLose,
  onSpeedChange,
  resetToken,
}: GameCanvasProps) {
  const carBodyRef = useRef(null);
  const isRunning = gameState === 'running';

  return (
    <KeyboardControls map={keyboardMap}>
      <div className="h-full w-full">
        <Canvas
          shadows
          dpr={[1, typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1.5]}
          camera={{ position: [0, 8, 18], fov: 50 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
            logarithmicDepthBuffer: false,
          }}
          performance={{ min: 0.8 }}
          frameloop="always"
        >
          {/* Fundo laranja gradiente - estilo Bruno Simon */}
          <color attach="background" args={[0xff8c42]} />
          <fog attach="fog" args={[0xff8c42, 60, 200]} />
          
          {/* Iluminação suave - estilo Bruno Simon */}
          <ambientLight intensity={0.9} />
          <directionalLight
            castShadow
            position={[20, 30, 10]}
            intensity={1.2}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-left={-40}
            shadow-camera-right={40}
            shadow-camera-top={40}
            shadow-camera-bottom={-40}
            shadow-bias={-0.0001}
            shadow-normalBias={0.02}
          />
          <pointLight position={[0, 20, 0]} intensity={0.3} color="#ffa500" />
          
          <Sky
            turbidity={3}
            rayleigh={0.5}
            sunPosition={[100, 20, 100]}
            inclination={0.49}
            azimuth={0.25}
          />

          <Physics
            gravity={[0, -9.81, 0]}
            timeStep={1 / 60}
          >
            <Track />
            <Obstacles />
            <FinishLine gameState={gameState} onWin={onWin} />
            <Car
              carRef={carBodyRef}
              gameState={gameState}
              onLose={onLose}
              resetToken={resetToken}
              onSpeedChange={onSpeedChange}
            />
          </Physics>

          <CameraRig carRef={carBodyRef} isRunning={isRunning} />
          <Environment preset="sunset" />
        </Canvas>
      </div>
    </KeyboardControls>
  );
}
