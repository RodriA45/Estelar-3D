import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

export default function Wormhole({ body, onClick, isTarget }) {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.rotation.z += delta * 0.1;
    }
  });

  return (
    <group position={body.position} name={body.id}>
      {/* The Anomaly / Wormhole Lensing Sphere */}
      <Sphere 
        args={[body.size, 64, 64]} 
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(body);
        }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        <meshPhysicalMaterial
          transparent
          transmission={0.9}
          opacity={1}
          metalness={0.1}
          roughness={0.1}
          ior={2.5}
          thickness={body.size * 2}
          color="#ffffff"
          side={THREE.DoubleSide}
        />
      </Sphere>

      {/* Internal dark core representing the throat */}
      <Sphere args={[body.size * 0.4, 32, 32]}>
        <meshBasicMaterial color="#000000" />
      </Sphere>
      
      {/* Subtle glow around the anomaly */}
      <pointLight color="#88aaff" intensity={5} distance={body.size * 5} />
    </group>
  );
}
