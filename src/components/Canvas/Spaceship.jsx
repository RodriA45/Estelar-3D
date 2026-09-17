import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
// A tapered wing built from an extruded, beveled 2D shape instead of a flat
// box. The bevel gives it a rounded edge that actually catches light like a
// real airfoil instead of looking like a slab.
function createWingGeometry(rootChord, tipChord, span, sweep) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -rootChord / 2);
  shape.lineTo(0, rootChord / 2);
  shape.lineTo(span, sweep + tipChord / 2);
  shape.lineTo(span, sweep - tipChord / 2);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
    curveSegments: 1,
  });
  geo.center();
  geo.rotateX(Math.PI / 2);
  return geo;
}

// A rounded, tapered fuselage built from a single lathe (revolved profile)
// instead of a stack of boxes — this is what actually reads as "a real
// spaceship" instead of blocky primitives, at a very low triangle cost.
function createHullGeometry(profile, radialSegments = 14) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, radialSegments);
  // Lathe revolves around Y with radius in X/Z; rotate so length runs
  // along local +Z (nose forward) instead of +Y.
  geo.rotateX(Math.PI / 2);
  return geo;
}

// ---------------------------------------------------------------------------
// Precomputed Geometries
// ---------------------------------------------------------------------------
const rangerHullGeo = createHullGeometry([
  [0.15, -5.2], // tail cap
  [0.85, -4.4],
  [1.15, -2.5],
  [1.2, 0.5],
  [1.05, 2.6],
  [0.55, 4.0],
  [0.0, 4.9], // nose tip
]);
const rangerWingGeo = createWingGeometry(2.6, 0.9, 4.2, -1.4);
const rangerFinGeo = createWingGeometry(1.6, 0.5, 1.6, -0.6);

// ---------------------------------------------------------------------------
// Ranger — sleek courier ship
// ---------------------------------------------------------------------------
const RangerModel = () => {

  return (
    <group scale={0.05} rotation={[0, 0, 0]}>
      {/* Main Hull — tapered, rounded fuselage */}
      <mesh geometry={rangerHullGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#d7dade" metalness={0.65} roughness={0.35} />
      </mesh>

      {/* Belly panel line detail — thin inset strip instead of a flat color */}
      <mesh position={[0, -0.95, -0.3]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.06, 6]} />
        <meshStandardMaterial color="#8a8f96" metalness={0.7} roughness={0.5} />
      </mesh>

      {/* Cockpit canopy — curved glass dome, not a flat black box */}
      <mesh position={[0, 0.65, 2.4]} rotation={[0.15, 0, 0]} scale={[0.85, 0.55, 1.4]}>
        <sphereGeometry args={[0.9, 20, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
        <meshPhysicalMaterial
          color="#bfe8ff"
          metalness={0.1}
          roughness={0.05}
          transmission={0.6}
          transparent
          opacity={0.75}
          thickness={0.3}
        />
      </mesh>

      {/* Wings — tapered, swept, beveled */}
      <mesh geometry={rangerWingGeo} position={[1.1, -0.05, -1.4]} rotation={[0, 0, -0.12]}>
        <meshStandardMaterial color="#c7cbd1" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh geometry={rangerWingGeo} position={[-1.1, -0.05, -1.4]} rotation={[0, Math.PI, -0.12]}>
        <meshStandardMaterial color="#c7cbd1" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Tail fins */}
      <mesh geometry={rangerFinGeo} position={[0.35, 0.55, -3.6]} rotation={[0.3, 0, -0.5]}>
        <meshStandardMaterial color="#c7cbd1" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh geometry={rangerFinGeo} position={[-0.35, 0.55, -3.6]} rotation={[0.3, 0, 0.5]}>
        <meshStandardMaterial color="#c7cbd1" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Engine nacelles — tapered nozzles instead of plain boxes */}
      {[1.4, -1.4].map((x) => (
        <group key={x} position={[x, -0.1, -4.3]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.45, 0.55, 1.6, 12]} />
            <meshStandardMaterial color="#3a3d42" metalness={0.75} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, -1.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.48, 0.5, 12]} />
            <meshStandardMaterial color="#1b1c1f" metalness={0.8} roughness={0.5} />
          </mesh>
          {/* Bright emissive disc reads as an engine glow under Bloom —
              no real-time point light needed, so it's essentially free. */}
          <mesh position={[0, 0, -1.35]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.36, 16]} />
            <meshBasicMaterial color="#aee3ff" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Central booster, same glow-via-emissive trick */}
      <mesh position={[0, -0.05, -4.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 0.9, 14]} />
        <meshStandardMaterial color="#2a2b2e" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.05, -5.05]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial color="#ffb066" toneMapped={false} />
      </mesh>

      {/* One shared light for the whole engine cluster instead of three
          separate point lights — this is the main perf win. */}
      <pointLight position={[0, -0.05, -5.5]} color="#ffd9a8" intensity={1.4} distance={9} decay={2} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// UFO
// ---------------------------------------------------------------------------
const ufoHullGeo = createHullGeometry([
  [0, -0.55],
  [3.2, -0.5],
  [5.0, -0.1],
  [5.0, 0.15],
  [2.6, 0.55],
  [0, 0.75],
], 32);

const UFOModel = () => {
  const ringRef = useRef();

  useFrame((state, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 2;
    }
  });

  return (
    <group scale={0.05}>
      {/* Saucer body — smooth lathe hull instead of a flat cylinder */}
      <mesh geometry={ufoHullGeo}>
        {/* Lowered metalness and increased roughness so it catches diffuse light in empty space */}
        <meshStandardMaterial color="#b0b5ba" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Dome */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[2.4, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#88ccff"
          metalness={0.2}
          roughness={0.3}
          transmission={0.2}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Underside glow ring — emissive + Bloom instead of a big point light */}
      <mesh position={[0, -0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 2.1, 32]} />
        <meshBasicMaterial color="#33ffcc" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, -1.2, 0]} color="#33ffcc" intensity={1.2} distance={12} decay={2} />

      {/* Spinning lights ring — emissive spheres, no per-light cost */}
      <group ref={ringRef}>
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const x = Math.cos(angle) * 4.8;
          const z = Math.sin(angle) * 4.8;
          return (
            <mesh key={i} position={[x, 0, z]}>
              <sphereGeometry args={[0.18, 12, 12]} />
              <meshBasicMaterial color="#66ffff" toneMapped={false} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// X-Wing style fighter
// ---------------------------------------------------------------------------
const xwingHullGeo = createHullGeometry([
  [0.2, -6.0],
  [0.75, -5.0],
  [0.85, -1.0],
  [0.8, 2.5],
  [0.4, 4.5],
  [0.0, 5.4],
]);
const xwingWingGeo = createWingGeometry(4.4, 0.6, 5.0, -1.2);

const XWingModel = () => {

  return (
    <group scale={0.05} rotation={[0, 0, 0]}>
      {/* Fuselage */}
      <mesh geometry={xwingHullGeo}>
        <meshStandardMaterial color="#e8e8e6" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Cockpit */}
      <mesh position={[0, 0.75, 0.5]} rotation={[-0.1, 0, 0]} scale={[0.75, 0.55, 1.6]}>
        <sphereGeometry args={[0.9, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
        <meshPhysicalMaterial color="#dff2ff" transmission={0.5} transparent opacity={0.7} roughness={0.08} metalness={0.1} />
      </mesh>

      {/* Four X wings, tapered and beveled */}
      {[
        { pos: [1.6, 1.0, -1.5], rot: [0, 0, -0.42] },
        { pos: [-1.6, 1.0, -1.5], rot: [0, Math.PI, -0.42] },
        { pos: [1.6, -1.0, -1.5], rot: [0, 0, 0.42] },
        { pos: [-1.6, -1.0, -1.5], rot: [0, Math.PI, 0.42] },
      ].map((w, i) => (
        <mesh key={i} geometry={xwingWingGeo} position={w.pos} rotation={w.rot}>
          <meshStandardMaterial color="#dcdcda" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}

      {/* Engines on wingtips — tapered nacelle + emissive glow disc */}
      {[
        [2.9, 1.55, -3.4], [-2.9, 1.55, -3.4],
        [2.9, -1.55, -3.4], [-2.9, -1.55, -3.4],
      ].map((pos, i) => (
        <group key={i} position={pos}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.5, 1.8, 12]} />
            <meshStandardMaterial color="#6b6b6b" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, -1.05]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.34, 14]} />
            <meshBasicMaterial color="#ff6a5a" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Single shared light for the whole engine set */}
      <pointLight position={[0, 0, -3.4]} color="#ff8a7a" intensity={1.3} distance={10} decay={2} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Tour Curve Precomputation
// ---------------------------------------------------------------------------
const tourCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 30),
  new THREE.Vector3(20, 5, 20),
  new THREE.Vector3(30, 0, 0),
  new THREE.Vector3(20, -5, -20),
  new THREE.Vector3(0, 0, -30),
  new THREE.Vector3(-20, 5, -20),
  new THREE.Vector3(-30, 0, 0),
  new THREE.Vector3(-20, -5, 20),
], true); // true = closed loop

const tourLinePoints = tourCurve.getPoints(100);

export default function Spaceship({ isPiloting, shipModel = 'ranger' }) {
  const shipRef = useRef();
  const trackRef = useRef();
  const controlsRef = useRef();
  const prevShipPos = useRef(new THREE.Vector3());
  const { camera } = useThree();
  
  const progress = useRef(0);

  useFrame((state, delta) => {
    if (!isPiloting || !shipRef.current) return;
    
    // Move along the curve
    progress.current += (delta * 0.02); // Speed of the tour
    if (progress.current > 1) progress.current -= 1;
    
    const point = tourCurve.getPointAt(progress.current);
    const tangent = tourCurve.getTangentAt(progress.current);
    
    shipRef.current.position.copy(point);
    
    // Look along the tangent
    const lookAtPoint = point.clone().add(tangent);
    shipRef.current.lookAt(lookAtPoint);
    
    // Add a slight banking roll effect based on curvature (optional polish)
    shipRef.current.rotateZ(Math.sin(progress.current * Math.PI * 4) * 0.3);

    // Follow the ship with the camera
    if (controlsRef.current) {
      const diff = point.clone().sub(prevShipPos.current);
      camera.position.add(diff);
      controlsRef.current.target.copy(point);
      prevShipPos.current.copy(point);
    }
  });

  // Automatically release pointer lock if we enter cinematic mode, 
  // since OrbitControls uses drag-to-look, pointer lock is annoying.
  // Also teleport the camera right behind the ship.
  useEffect(() => {
    if (isPiloting) {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      
      const point = tourCurve.getPointAt(progress.current);
      const tangent = tourCurve.getTangentAt(progress.current);
      
      prevShipPos.current.copy(point);
      
      // Place camera behind and slightly above the ship
      const cameraOffset = tangent.clone().multiplyScalar(-8).add(new THREE.Vector3(0, 3, 0));
      camera.position.copy(point).add(cameraOffset);
      
      if (controlsRef.current) {
        controlsRef.current.target.copy(point);
        controlsRef.current.update();
      }
    }
  }, [isPiloting, camera]);

  if (!isPiloting) return null;

  return (
    <>
      {/* Glowing Track Line */}
      <group ref={trackRef}>
        <Line 
          points={tourLinePoints}
          color="#88ccff"
          lineWidth={2}
          transparent
          opacity={0.3}
        />
      </group>

      <group ref={shipRef}>
        {/* Localized OrbitControls for the Ship */}
        <OrbitControls 
          ref={controlsRef}
          makeDefault
          enablePan={false}
          minDistance={2}
          maxDistance={30}
        />
        
        {shipModel === 'ranger' && <RangerModel />}
        {shipModel === 'ufo' && <UFOModel />}
        {shipModel === 'xwing' && <XWingModel />}
      </group>
    </>
  );
}
