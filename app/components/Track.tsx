'use client';

import { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

const TRACK_WIDTH = 50;
const TRACK_LENGTH = 200;
const TRACK_TOP_Y = 0.1;

export function Track() {
  // Material do chão laranja - estilo Bruno Simon
  const groundMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#fb923c',
        roughness: 0.9,
        metalness: 0.0,
      }),
    [],
  );

  const trackStart = 15;
  const trackEnd = trackStart - TRACK_LENGTH;
  const trackCenterZ = (trackStart + trackEnd) / 2;

  return (
    <group>
      {/* Chão infinito laranja - estilo Bruno Simon */}
      <RigidBody
        type="fixed"
        colliders="cuboid"
        position={[0, TRACK_TOP_Y - 0.2, trackCenterZ]}
        userData={{ type: 'track' }}
      >
        <mesh receiveShadow>
          <boxGeometry args={[200, 0.4, 300]} />
          <primitive object={groundMaterial} attach="material" />
        </mesh>
      </RigidBody>

      {/* Chão visual com gradiente laranja */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, TRACK_TOP_Y + 0.01, trackCenterZ]}
        renderOrder={0}
      >
        <planeGeometry args={[200, 300]} />
        <meshStandardMaterial
          color="#fb923c"
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>

      <StartZone />
    </group>
  );
}

function StartZone() {
  return (
    <group>
      {/* Pista física na zona de largada */}
      <RigidBody
        type="fixed"
        colliders="cuboid"
        position={[0, TRACK_TOP_Y - 0.2, 15]}
        userData={{ type: 'track' }}
      >
        <mesh receiveShadow>
          <boxGeometry args={[TRACK_WIDTH, 0.4, 10]} />
          <meshStandardMaterial
            color="#fb923c"
            roughness={0.9}
            metalness={0.0}
          />
        </mesh>
      </RigidBody>
      
      {/* Marcador visual de largada */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, TRACK_TOP_Y + 0.05, 17]}
        renderOrder={10}
      >
        <planeGeometry args={[TRACK_WIDTH, 5]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.3}
          depthWrite={true}
          depthTest={true}
        />
      </mesh>
      
      {/* Linha de largada */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, TRACK_TOP_Y + 0.06, 12]}
        renderOrder={11}
      >
        <planeGeometry args={[TRACK_WIDTH, 2]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.2}
          depthWrite={true}
          depthTest={true}
        />
      </mesh>
    </group>
  );
}
