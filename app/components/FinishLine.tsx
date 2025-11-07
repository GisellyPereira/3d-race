'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

const TRACK_WIDTH = 50;
const FINISH_Z = -195;

type FinishLineProps = {
  gameState: 'idle' | 'running' | 'win' | 'lose';
  onWin: () => void;
};

export function FinishLine({ gameState, onWin }: FinishLineProps) {
  const finishMaterial = useRef<THREE.MeshStandardMaterial | null>(null);

  useFrame(({ clock }) => {
    if (finishMaterial.current) {
      finishMaterial.current.emissiveIntensity =
        0.5 + Math.sin(clock.getElapsedTime() * 3) * 0.25;
    }
  });

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, FINISH_Z]}
        renderOrder={1}
      >
        <planeGeometry args={[TRACK_WIDTH, 5]} />
        <meshStandardMaterial
          ref={finishMaterial}
          color="#f97316"
          emissive="#f97316"
          emissiveIntensity={0.5}
          depthWrite={false}
          transparent={false}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.06, FINISH_Z - 2]}
        renderOrder={2}
      >
        <planeGeometry args={[TRACK_WIDTH, 1.5]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.4}
          depthWrite={false}
          transparent={false}
        />
      </mesh>
      <CuboidCollider
        args={[TRACK_WIDTH / 2, 2.5, 1]}
        position={[0, 1, FINISH_Z]}
        sensor
        onIntersectionEnter={() => {
          if (gameState === 'running') {
            onWin();
          }
        }}
      />
    </group>
  );
}

