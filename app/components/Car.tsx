'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { RapierRigidBody, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import type { MutableRefObject } from 'react';

const CAR_START_POSITION: THREE.Vector3Tuple = [0, 0.25, 15];
const TRACK_TOP_Y = 0.1;

type CarProps = {
  carRef: MutableRefObject<RapierRigidBody | null>;
  gameState: 'idle' | 'running' | 'win' | 'lose';
  onLose: () => void;
  resetToken: number;
  onSpeedChange: (speed: number) => void;
};

export function Car({
  carRef,
  gameState,
  onLose,
  resetToken,
  onSpeedChange,
}: CarProps) {
  const [, getKeys] = useKeyboardControls();
  const hasFallen = useRef(false);
  const wheelRefs = useRef<(THREE.Group | null)[]>([]);

  // Estado do carro - sistema direto sem interpolações desnecessárias
  const speed = useRef(0);
  const rotationY = useRef(0);

  const resetCar = useCallback(() => {
    const body = carRef.current;
    if (!body) return;
    
    body.setTranslation(
      {
        x: CAR_START_POSITION[0],
        y: CAR_START_POSITION[1],
        z: CAR_START_POSITION[2],
      },
      true,
    );
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    
    hasFallen.current = false;
    speed.current = 0;
    rotationY.current = 0;
  }, [carRef]);

  useEffect(() => {
    resetCar();
  }, [resetCar, resetToken]);

  useFrame((_, delta) => {
    const body = carRef.current;
    if (!body) return;

    const translation = body.translation();
    
    // Suspensão mínima - apenas para manter na pista
    const targetY = TRACK_TOP_Y + 0.25;
    const heightDiff = targetY - translation.y;
    if (heightDiff > 0.1) {
      const suspensionForce = Math.min(heightDiff * 60, 40);
      body.applyImpulse({ x: 0, y: suspensionForce * delta, z: 0 }, true);
    }
    
    // Detecção de queda
    if (translation.y < TRACK_TOP_Y - 2 && !hasFallen.current) {
      hasFallen.current = true;
      resetCar();
      onLose();
      return;
    }

    if (gameState !== 'running') {
      speed.current *= 0.85;
      rotationY.current *= 0.9;
      onSpeedChange(Math.abs(speed.current));
      return;
    }

    const { forward, backward, left, right, brake } = getKeys();
    
    // Parâmetros de física - otimizados para responsividade
    const maxSpeed = 48;
    const acceleration = 150;
    const deceleration = 60;
    const turnSpeed = 8.5;
    const maxTurn = 1.1;

    // Aceleração/Desaceleração DIRETA - sem interpolação lenta
    if (forward) {
      speed.current = Math.min(speed.current + acceleration * delta, maxSpeed);
    } else if (backward) {
      speed.current = Math.max(speed.current - acceleration * 0.6 * delta, -maxSpeed * 0.65);
    } else {
      // Desaceleração natural mais rápida
      const friction = brake ? deceleration * 3.5 : deceleration * 0.9;
      if (speed.current > 0) {
        speed.current = Math.max(speed.current - friction * delta, 0);
      } else if (speed.current < 0) {
        speed.current = Math.min(speed.current + friction * delta, 0);
      }
    }

    // Rotação DIRETA e responsiva
    if (left || right) {
      const turnDirection = right ? 1 : -1;
      const speedFactor = Math.max(0.5, Math.abs(speed.current) / maxSpeed);
      const turnAmount = turnSpeed * delta * turnDirection * speedFactor;
      rotationY.current += turnAmount;
      rotationY.current = THREE.MathUtils.clamp(rotationY.current, -maxTurn, maxTurn);
    } else {
      // Retorno ao centro mais rápido
      rotationY.current *= 0.88;
    }

    // Aplicar rotação ao corpo - direto e preciso
    const currentRot = body.rotation();
    const currentQuaternion = new THREE.Quaternion(
      currentRot.x,
      currentRot.y,
      currentRot.z,
      currentRot.w,
    );
    const euler = new THREE.Euler().setFromQuaternion(currentQuaternion);
    
    // Rotação baseada em velocidade - mais responsiva
    const rotationSpeed = 6.5;
    const speedMultiplier = Math.max(0.5, Math.abs(speed.current) / maxSpeed);
    const rotationDelta = rotationY.current * delta * rotationSpeed * speedMultiplier;
    const newRotationY = euler.y + rotationDelta;
    
    const newQuaternion = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      newRotationY,
    );
    body.setRotation(newQuaternion, true);

    // Calcular direção de movimento
    const forwardVector = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(newQuaternion)
      .normalize();

    // Aplicar velocidade DIRETAMENTE - sem interpolações extras
    const currentVel = body.linvel();
    const targetVelX = forwardVector.x * speed.current;
    const targetVelZ = forwardVector.z * speed.current;
    
    // Interpolação muito rápida para suavidade sem travamento
    const velLerp = 1 - Math.pow(0.1, delta);
    const newVelX = THREE.MathUtils.lerp(currentVel.x, targetVelX, velLerp);
    const newVelZ = THREE.MathUtils.lerp(currentVel.z, targetVelZ, velLerp);

    // Aplicar velocidade horizontal diretamente
    body.setLinvel(
      {
        x: newVelX,
        y: currentVel.y, // Manter Y da física
        z: newVelZ,
      },
      true,
    );

    const currentSpeed = Math.abs(speed.current);
    onSpeedChange(currentSpeed);

    // Animar rodas
    wheelRefs.current.forEach((wheel) => {
      if (wheel) {
        wheel.rotation.x += currentSpeed * delta * 4;
        const wheelTurn = rotationY.current * 0.7;
        wheel.rotation.y = THREE.MathUtils.lerp(
          wheel.rotation.y,
          wheelTurn,
          1 - Math.pow(0.12, delta),
        );
      }
    });
  });

  return (
    <RigidBody
      ref={carRef}
      colliders="cuboid"
      position={CAR_START_POSITION}
      friction={0.2}
      restitution={0.05}
      linearDamping={0.03}
      angularDamping={0.08}
      canSleep={false}
      ccd={true}
      userData={{ type: 'car' }}
    >
      <group position={[0, 0, 0]}>
        {/* Corpo principal - Buggy vermelho compacto estilo Bruno Simon */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.5, 2.0]} />
          <meshStandardMaterial
            color="#dc2626"
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
        
        {/* Teto - laranja/marrom escuro */}
        <mesh castShadow position={[0, 0.35, -0.15]}>
          <boxGeometry args={[1.0, 0.3, 1.0]} />
          <meshStandardMaterial
            color="#c2410c"
            roughness={0.8}
            metalness={0.05}
          />
        </mesh>
        
        {/* Para-choque frontal - escuro */}
        <mesh castShadow position={[0, 0.25, 1.0]}>
          <boxGeometry args={[1.15, 0.2, 0.25]} />
          <meshStandardMaterial 
            color="#1f2937" 
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
        
        {/* Rodas médias e pretas - estilo off-road */}
        {[-0.6, 0.6].map((x, i) =>
          [-0.7, 0.7].map((z, j) => {
            const wheelIndex = i * 2 + j;
            return (
              <group
                key={`wheel-${i}-${j}`}
                ref={(el) => {
                  wheelRefs.current[wheelIndex] = el;
                }}
                position={[x, -0.25, z]}
              >
                {/* Roda principal */}
                <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.25, 0.25, 0.3, 12]} />
                  <meshStandardMaterial
                    color="#0a0a0a"
                    roughness={0.9}
                    metalness={0.1}
                  />
                </mesh>
                {/* Pneu com textura */}
                <mesh
                  castShadow
                  rotation={[Math.PI / 2, 0, 0]}
                  position={[0, 0.15, 0]}
                >
                  <torusGeometry args={[0.25, 0.08, 8, 16]} />
                  <meshStandardMaterial 
                    color="#1a1a1a" 
                    roughness={0.95}
                  />
                </mesh>
              </group>
            );
          }),
        )}
      </group>
    </RigidBody>
  );
}
