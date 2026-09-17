import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function AsteroidBelt({ innerRadius, outerRadius, count = 2000, timeScale = 1 }) {
  const meshRef = useRef();
  const timeRef = useRef(0);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const asteroids = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      // Random angle
      const theta = Math.random() * 2 * Math.PI;
      // Random radius between inner and outer
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      
      const x = Math.cos(theta) * radius;
      // Slight random elevation
      const y = (Math.random() - 0.5) * 0.8;
      const z = Math.sin(theta) * radius;
      
      const scaleX = 0.01 + Math.random() * 0.02;
      const scaleY = scaleX * (0.6 + Math.random() * 0.8);
      const scaleZ = scaleX * (0.6 + Math.random() * 0.8);
      
      // Keplarian orbit logic matching the rest of the solar system
      // Earth's speed uses (1 / sqrt(r)) * 0.05
      // Asteroids should follow the exact same physics so they move slower than Earth (since they are further away)
      const speed = (1 / Math.sqrt(radius)) * 0.05 * (Math.random() * 0.2 + 0.9);
      
      temp.push({ 
        x, y, z, 
        scaleX, scaleY, scaleZ, 
        speed,
        angle: theta,
        radius,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        rotSpeedX: (Math.random() - 0.5) * 0.1,
        rotSpeedY: (Math.random() - 0.5) * 0.1,
      });
    }
    return temp;
  }, [innerRadius, outerRadius, count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const scaledDelta = delta * timeScale;
    timeRef.current += scaledDelta;
    
    asteroids.forEach((asteroid, i) => {
      // Orbit
      asteroid.angle -= asteroid.speed * scaledDelta;
      
      const currentX = Math.cos(asteroid.angle) * asteroid.radius;
      const currentZ = Math.sin(asteroid.angle) * asteroid.radius;
      
      // Self rotation
      asteroid.rotX += asteroid.rotSpeedX * scaledDelta;
      asteroid.rotY += asteroid.rotSpeedY * scaledDelta;
      
      dummy.position.set(currentX, asteroid.y, currentZ);
      dummy.rotation.set(asteroid.rotX, asteroid.rotY, asteroid.rotZ);
      dummy.scale.set(asteroid.scaleX, asteroid.scaleY, asteroid.scaleZ);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      {/* A simple low-poly rock geometry */}
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#5a504b" roughness={1.0} metalness={0.1} />
    </instancedMesh>
  );
}
