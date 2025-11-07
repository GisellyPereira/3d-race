'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RapierRigidBody, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

export function Obstacles() {
  return (
    <group>
      {/* Árvores amarelas claras com troncos marrons - estilo Bruno Simon (maiores) */}
      <Tree position={[-8, 1.0, -10]} />
      <Tree position={[6, 1.0, -15]} />
      <Tree position={[-5, 1.0, -25]} />
      <Tree position={[7, 1.0, -30]} />
      <Tree position={[-7, 1.0, -40]} />
      <Tree position={[5, 1.0, -45]} />
      <Tree position={[-6, 1.0, -55]} />
      <Tree position={[8, 1.0, -60]} />
      <Tree position={[-4, 1.0, -70]} />
      <Tree position={[6, 1.0, -75]} />
      <Tree position={[-8, 1.0, -85]} />
      <Tree position={[7, 1.0, -90]} />
      <Tree position={[-5, 1.0, -100]} />
      <Tree position={[5, 1.0, -105]} />
      <Tree position={[-7, 1.0, -115]} />
      <Tree position={[8, 1.0, -120]} />
      <Tree position={[-6, 1.0, -130]} />
      <Tree position={[6, 1.0, -135]} />
      <Tree position={[-4, 1.0, -145]} />
      <Tree position={[7, 1.0, -150]} />
      
      {/* Pedras brancas irregulares - maiores */}
      <Rock position={[-3, 0.4, -20]} scale={[1.2, 0.9, 1.3]} />
      <Rock position={[4, 0.4, -22]} scale={[1.0, 0.8, 1.1]} />
      <Rock position={[-2, 0.4, -35]} scale={[1.1, 0.9, 1.2]} />
      <Rock position={[3, 0.4, -38]} scale={[1.3, 1.0, 1.4]} />
      <Rock position={[-4, 0.4, -50]} scale={[1.0, 0.8, 1.1]} />
      <Rock position={[2, 0.4, -52]} scale={[1.2, 0.9, 1.3]} />
      <Rock position={[-3, 0.4, -65]} scale={[1.1, 0.9, 1.2]} />
      <Rock position={[4, 0.4, -68]} scale={[1.0, 0.8, 1.1]} />
      <Rock position={[-2, 0.4, -80]} scale={[1.3, 1.0, 1.4]} />
      <Rock position={[3, 0.4, -82]} scale={[1.1, 0.9, 1.2]} />
      <Rock position={[-4, 0.4, -95]} scale={[1.0, 0.8, 1.1]} />
      <Rock position={[2, 0.4, -98]} scale={[1.2, 0.9, 1.3]} />
      <Rock position={[-3, 0.4, -110]} scale={[1.1, 0.9, 1.2]} />
      <Rock position={[4, 0.4, -112]} scale={[1.3, 1.0, 1.4]} />
      <Rock position={[-2, 0.4, -125]} scale={[1.0, 0.8, 1.1]} />
      <Rock position={[3, 0.4, -128]} scale={[1.2, 0.9, 1.3]} />
      <Rock position={[-4, 0.4, -140]} scale={[1.1, 0.9, 1.2]} />
      <Rock position={[2, 0.4, -142]} scale={[1.0, 0.8, 1.1]} />
      
      {/* Muros brancos de tijolos - estilo Bruno Simon (maiores) */}
      <BrickWall position={[-6, 0.8, -18]} rotation={0} length={5} />
      <BrickWall position={[6, 0.8, -18]} rotation={0} length={5} />
      <BrickWall position={[-4, 0.8, -28]} rotation={Math.PI / 4} length={4} />
      <BrickWall position={[4, 0.8, -28]} rotation={-Math.PI / 4} length={4} />
      <BrickWall position={[0, 0.8, -42]} rotation={Math.PI / 2} length={6} />
      <BrickWall position={[-5, 0.8, -58]} rotation={0} length={5} />
      <BrickWall position={[5, 0.8, -58]} rotation={0} length={5} />
      <BrickWall position={[0, 0.8, -72]} rotation={Math.PI / 2} length={7} />
      <BrickWall position={[-7, 0.8, -88]} rotation={Math.PI / 4} length={4} />
      <BrickWall position={[7, 0.8, -88]} rotation={-Math.PI / 4} length={4} />
      <BrickWall position={[-3, 0.8, -102]} rotation={0} length={5} />
      <BrickWall position={[3, 0.8, -102]} rotation={0} length={5} />
      <BrickWall position={[0, 0.8, -118]} rotation={Math.PI / 2} length={6} />
      <BrickWall position={[-6, 0.8, -132]} rotation={Math.PI / 4} length={4} />
      <BrickWall position={[6, 0.8, -132]} rotation={-Math.PI / 4} length={4} />
    </group>
  );
}

type TreeProps = {
  position: THREE.Vector3Tuple;
};

function Tree({ position }: TreeProps) {
  return (
    <RigidBody
      type="fixed"
      colliders="hull"
      position={position}
      userData={{ type: 'obstacle' }}
    >
      <group>
        {/* Tronco marrom - maior */}
        <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 1.0, 8]} />
          <meshStandardMaterial
            color="#8b4513"
            roughness={0.9}
            metalness={0.0}
          />
        </mesh>
        {/* Copa amarela clara - maior e mais trapezoidal */}
        <mesh castShadow receiveShadow position={[0, 1.5, 0]}>
          <coneGeometry args={[1.2, 2.0, 6]} />
          <meshStandardMaterial
            color="#fef08a"
            roughness={0.8}
            metalness={0.0}
          />
        </mesh>
      </group>
    </RigidBody>
  );
}

type RockProps = {
  position: THREE.Vector3Tuple;
  scale: THREE.Vector3Tuple;
};

function Rock({ position, scale }: RockProps) {
  const rockGeometry = useMemo(() => {
    const geometry = new THREE.DodecahedronGeometry(0.6, 0);
    // Deformar para parecer mais irregular
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const noise = (Math.random() - 0.5) * 0.4;
      positions.setX(i, x + noise);
      positions.setY(i, y + noise * 0.5);
      positions.setZ(i, z + noise);
    }
    positions.needsUpdate = true;
    return geometry;
  }, []);

  return (
    <RigidBody
      type="fixed"
      colliders="hull"
      position={position}
      scale={scale}
      userData={{ type: 'obstacle' }}
    >
      <mesh
        castShadow
        receiveShadow
        geometry={rockGeometry}
      >
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>
    </RigidBody>
  );
}

type BrickWallProps = {
  position: THREE.Vector3Tuple;
  rotation: number;
  length: number;
};

function BrickWall({ position, rotation, length }: BrickWallProps) {
  const bricks = [];
  const brickWidth = 0.5;
  const brickHeight = 0.4;
  const brickDepth = 0.3;
  const rows = 2;
  const cols = Math.ceil(length / brickWidth);
  const wallHeight = rows * brickHeight;
  const wallWidth = cols * brickWidth;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offsetX = (col - cols / 2) * brickWidth;
      const offsetY = row * brickHeight;
      const offsetZ = (row % 2) * (brickWidth / 2); // Offset alternado
      
      bricks.push(
        <mesh
          key={`${row}-${col}`}
          castShadow
          receiveShadow
          position={[offsetX + offsetZ, offsetY, 0]}
        >
          <boxGeometry args={[brickWidth * 0.9, brickHeight * 0.9, brickDepth]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.8}
            metalness={0.0}
          />
        </mesh>
      );
    }
  }

  return (
    <RigidBody
      type="fixed"
      colliders="cuboid"
      position={position}
      rotation={[0, rotation, 0]}
      userData={{ type: 'obstacle' }}
    >
      {/* Collider invisível para o muro completo */}
      <mesh visible={false}>
        <boxGeometry args={[wallWidth, wallHeight, brickDepth]} />
      </mesh>
      <group>
        {bricks}
      </group>
    </RigidBody>
  );
}
