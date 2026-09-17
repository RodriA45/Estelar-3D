import { useRef, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

export default function VoidAnomalies({ active }) {
  const { camera } = useThree();
  
  const anomalies = useMemo(() => {
    if (!active) return [];
    
    // Generate 10 anomalies near the camera's current position
    return Array.from({ length: 10 }).map((_, i) => {
      // Place them in a radius of 200 to 1200 units around the camera
      const radius = 200 + Math.random() * 1000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const offsetX = radius * Math.sin(phi) * Math.cos(theta);
      const offsetY = radius * Math.sin(phi) * Math.sin(theta);
      const offsetZ = radius * Math.cos(phi);

      return {
        id: i,
        position: [
          camera.position.x + offsetX,
          camera.position.y + offsetY,
          camera.position.z + offsetZ
        ],
        color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
        speed: 1 + Math.random() * 3,
        distort: 0.4 + Math.random() * 0.5,
        scale: 50 + Math.random() * 150,
      };
    });
  }, [active]);

  if (!active) return null;

  return (
    <group>
      {anomalies.map((a) => (
        <Float key={a.id} speed={a.speed} rotationIntensity={2} floatIntensity={10}>
          <mesh position={a.position}>
            <icosahedronGeometry args={[a.scale, 4]} />
            <MeshDistortMaterial 
              color={a.color} 
              emissive={a.color}
              emissiveIntensity={0.5}
              distort={a.distort} 
              speed={a.speed} 
              transparent 
              opacity={0.3} 
              wireframe={Math.random() > 0.5}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}
