import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Halley-like comet with highly elliptical orbit
export default function Comet({ timeScale = 1 }) {
  const cometGroupRef = useRef();
  const tailRef = useRef();
  const timeRef = useRef(0);
  
  // Ellipse parameters
  const a = 35; // semi-major axis
  const e = 0.96; // eccentricity (very elliptical)
  const b = a * Math.sqrt(1 - e * e); // semi-minor axis
  // focus offset from center
  const c = a * e;

  // Scattered dust-tail particles instead of a solid cone. A filled,
  // hard-edged cone reads as a flat neon beam/flashlight; loose, jittered
  // points that thin out and fade with distance look like an actual comet
  // tail. Positions are baked in the tail's local space (pointing toward
  // -Y, same convention the previous cone used before rotation).
  const tailParticleCount = 220;
  const { tailPositions, tailSizes } = useMemo(() => {
    const positions = new Float32Array(tailParticleCount * 3);
    const sizes = new Float32Array(tailParticleCount);
    for (let i = 0; i < tailParticleCount; i++) {
      const t = i / tailParticleCount; // 0 = near core, 1 = far tip
      const dist = t * 6.5;
      const spread = 0.03 + t * t * 0.5; // widens gradually, not linearly
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * spread;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = -dist;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      sizes[i] = (1 - t) * 0.5 + 0.05;
    }
    return { tailPositions: positions, tailSizes: sizes };
  }, []);

  useFrame((state, delta) => {
    if (!cometGroupRef.current) return;
    
    const scaledDelta = delta * timeScale;
    timeRef.current += scaledDelta * 0.05; 
    
    const angle = timeRef.current;
    
    // Parametric equation for ellipse with sun at focus (0,0)
    const x = -c + a * Math.cos(angle);
    const z = b * Math.sin(angle);
    
    cometGroupRef.current.position.set(x, 0.5, z);
    
    // Tail should point AWAY from the sun (0,0,0)
    if (tailRef.current) {
      // The cone points up (Y axis) by default.
      // We want it to point away from sun.
      const awayDir = new THREE.Vector3(x, 0, z);
      if (awayDir.lengthSq() > 0) {
        awayDir.normalize();
      }
      
      // LookAt rotates the -Z axis towards the target.
      // So if we make it look at a point away, its -Z axis points away.
      // We need to rotate the cone so its tip points in -Z.
      const targetPos = cometGroupRef.current.position.clone().add(awayDir);
      tailRef.current.lookAt(targetPos);
      
      // Since default cone points UP (Y), we rotate it 90 deg around X so it points towards -Z
      tailRef.current.rotateX(Math.PI / 2);
    }
    
    // Rotate the rocky core for realism
    cometGroupRef.current.children[0].rotation.y += scaledDelta * 2.0;
    cometGroupRef.current.children[0].rotation.z += scaledDelta * 1.5;
  });

  return (
    <group>
      <group ref={cometGroupRef}>
        {/* Rocky Core */}
        <mesh>
          <dodecahedronGeometry args={[0.08, 1]} />
          <meshStandardMaterial color="#88ccff" emissive="#4488ff" emissiveIntensity={1.0} roughness={0.8} />
          <pointLight color="#aaddff" intensity={1} distance={5} />
        </mesh>
        
        {/* Wispy dust tail made of scattered points instead of a solid cone */}
        <group ref={tailRef} position={[0, 0, 0]}>
          <Points positions={tailPositions} sizes={tailSizes}>
            <PointMaterial
              transparent
              color="#88ccff"
              size={0.12}
              sizeAttenuation
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.55}
            />
          </Points>
        </group>
      </group>
    </group>
  );
}
