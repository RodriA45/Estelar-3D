import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

export default function Galaxy({ position = [0, 0, 0], scale = 1 }) {
  const pointsRef = useRef();

  // Generate 20,000 particles for the spiral galaxy
  const { positions, colors, sizes } = useMemo(() => {
    const count = 20000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);

    const numArms = 4;
    const twist = 5;
    const galaxyRadius = 40000 * scale;
    const thickness = 1000 * scale;

    const coreColor = new THREE.Color('#ffeebb');
    const midColor = new THREE.Color('#ff8844');
    const edgeColor = new THREE.Color('#4466ff');

    for (let i = 0; i < count; i++) {
      // Exponential falloff for dense core
      const r = Math.pow(Math.random(), 2) * galaxyRadius;
      
      const armIndex = i % numArms;
      const armOffset = (Math.PI * 2) / numArms;
      
      // The further out, the more it twists
      let theta = armIndex * armOffset + (r / galaxyRadius) * twist;
      
      // Add randomness (scatter) - less scatter in core, more at edges
      const scatter = (Math.random() - 0.5) * (r / galaxyRadius) * 2;
      theta += scatter;

      // Height (Y-axis) - thin disk, but fatter at the core
      const ySpread = Math.exp(-r / (galaxyRadius * 0.2)) * thickness;
      const y = (Math.random() - 0.5) * ySpread;

      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Color interpolation based on radius
      let color = new THREE.Color();
      const normalizedR = r / galaxyRadius;
      
      if (normalizedR < 0.2) {
        color.lerpColors(coreColor, midColor, normalizedR / 0.2);
      } else {
        color.lerpColors(midColor, edgeColor, (normalizedR - 0.2) / 0.8);
      }
      
      // Add some random variation to color
      color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.2);

      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;

      // Make core stars slightly larger
      siz[i] = (Math.random() * 0.8 + 0.2) * (1 - normalizedR * 0.5) * 200 * scale;
    }

    return { positions: pos, colors: col, sizes: siz };
  }, [scale]);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      // Very slow rotation
      pointsRef.current.rotation.y -= delta * 0.005;
    }
  });

  return (
    <group position={position}>
      <Points ref={pointsRef} positions={positions} colors={colors} sizes={sizes}>
        <PointMaterial 
          transparent 
          vertexColors 
          size={1} 
          sizeAttenuation={true} 
          depthWrite={false} 
          blending={THREE.AdditiveBlending}
        />
      </Points>
      {/* Galactic Core Glow */}
      <pointLight color="#ffeebb" intensity={5} distance={10000 * scale} decay={2} />
    </group>
  );
}
