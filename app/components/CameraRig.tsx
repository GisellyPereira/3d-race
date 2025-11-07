'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import type { MutableRefObject } from 'react';

type CameraRigProps = {
  carRef: MutableRefObject<RapierRigidBody | null>;
  isRunning: boolean;
};

export function CameraRig({ carRef, isRunning }: CameraRigProps) {
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const smoothedLookAt = useRef(new THREE.Vector3());
  const smoothedPosition = useRef(new THREE.Vector3());
  const isInitialized = useRef(false);

  useFrame(({ camera }, delta) => {
    const body = carRef.current;
    if (!body) return;

    const translation = body.translation();
    const rotation = body.rotation();
    const quaternion = new THREE.Quaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w,
    );
    const forward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(quaternion)
      .normalize();

    targetPosition.current
      .copy(new THREE.Vector3(translation.x, translation.y, translation.z))
      .add(forward.clone().multiplyScalar(-10))
      .add(new THREE.Vector3(0, 4.5, 0));

    targetLookAt.current
      .copy(new THREE.Vector3(translation.x, translation.y, translation.z))
      .add(forward.clone().multiplyScalar(2))
      .add(new THREE.Vector3(0, 1.5, 0));

    if (!isInitialized.current) {
      smoothedLookAt.current.copy(targetLookAt.current);
      smoothedPosition.current.copy(targetPosition.current);
      camera.position.copy(smoothedPosition.current);
      camera.lookAt(smoothedLookAt.current);
      isInitialized.current = true;
      return;
    }

    const positionLerp = 1 - Math.pow(0.05, delta);
    const lookAtLerp = 1 - Math.pow(0.08, delta);
    
    smoothedPosition.current.lerp(targetPosition.current, positionLerp);
    smoothedLookAt.current.lerp(targetLookAt.current, lookAtLerp);
    
    camera.position.copy(smoothedPosition.current);
    camera.lookAt(smoothedLookAt.current);

    const banking = THREE.MathUtils.clamp(forward.x * 0.08, -0.1, 0.1);
    camera.rotation.z = THREE.MathUtils.lerp(
      camera.rotation.z,
      -banking,
      1 - Math.pow(0.01, delta),
    );

    if (!isRunning) {
      smoothedPosition.current.lerp(targetPosition.current, 0.003);
    }
  });

  return null;
}
