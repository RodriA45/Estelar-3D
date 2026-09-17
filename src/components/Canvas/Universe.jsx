import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import CelestialBody from './CelestialBody';
import BlackHole from './BlackHole';
import Wormhole from './Wormhole';
import VoidAnomalies from './VoidAnomalies';
import OrbitRings from './OrbitRings';
import AsteroidBelt from './AsteroidBelt';
import Spaceship from './Spaceship';
import NebulaBackground from './NebulaBackground';
import Pulsar from './Pulsar';
import DysonSphere from './DysonSphere';
import Galaxy from './Galaxy';
import WarpEffect from './WarpEffect';
import MillerPlanet from './MillerPlanet';
import { celestialBodies, generateBackgroundStars } from '../../data/celestialData';
import { sound } from '../../utils/soundEngine';
import { isLowPowerDevice } from '../../utils/deviceTier';

// Decided once per session load, not per render.
const LOW_POWER = isLowPowerDevice();
const STAR_COUNT = LOW_POWER ? 10000 : 30000;
const ASTEROID_COUNT = LOW_POWER ? 1200 : 3000;

export default function Universe({ 
  activeTarget, 
  setActiveTarget, 
  setCameraDistance, 
  cinematicState, 
  setCinematicState,
  resetCameraToggle,
  timeScale,
  isPiloting,
  shipModel
}) {
  const { camera } = useThree();
  const groupRef = useRef();
  const controlsRef = useRef();
  const isAutoNavigating = useRef(false);

  // Intercept user wheel/touch events globally to cancel auto-navigation
  useEffect(() => {
    const handleUserInteraction = () => {
      isAutoNavigating.current = false;
    };
    window.addEventListener('wheel', handleUserInteraction, { passive: true });
    window.addEventListener('pointerdown', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    
    return () => {
      window.removeEventListener('wheel', handleUserInteraction);
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);
  
  // Generate thousands of background stars once (Local neighborhood).
  // Count is reduced automatically on phones / low-core devices.
  const { positions, colors, sizes } = useMemo(() => generateBackgroundStars(STAR_COUNT), []);

  // Track the lerp target for the camera and the look-at target
  const targetCameraPos = useRef(new THREE.Vector3(0, 0, 50));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isSuckedInRef = useRef(false);
  const [inVoid, setInVoid] = useState(false);
  const [showOrbits, setShowOrbits] = useState(true);

  useEffect(() => {
    if (activeTarget) {
      isAutoNavigating.current = true;
    } else {
      targetLookAt.current.set(0, 0, 0);
      targetCameraPos.current.set(0, 0, 35); // Set closer to inner planets
      isAutoNavigating.current = true;
    }
  }, [activeTarget, resetCameraToggle]);

  const lastDistanceUpdate = useRef(0);

  useFrame((state, delta) => {
    // 1. Global Galactic Rotation (Only if no active target, so the user can easily observe the star)
    if (groupRef.current && !activeTarget) {
      groupRef.current.rotation.y -= delta * 0.01;
    }

    // 2. Track Distance for deep space quotes (throttle to 2 times a second)
    if (state.clock.elapsedTime - lastDistanceUpdate.current > 0.5) {
      lastDistanceUpdate.current = state.clock.elapsedTime;
      // Distance from the currently viewed target, NOT the global origin.
      // This ensures that distant stars like Sirius don't falsely trigger "deep space" 
      // mode simply because of their global coordinates, but zooming out from them DOES.
      const dist = controlsRef.current 
        ? camera.position.distanceTo(controlsRef.current.target) 
        : camera.position.length();
        
      setCameraDistance(dist);
      
      // Hide orbit rings if we zoom out too far to prevent Line Material artifacts
      if (dist > 2500 && showOrbits) setShowOrbits(false);
      if (dist <= 2500 && !showOrbits) setShowOrbits(true);

      // The void is now much further out
      if (dist >= 5500 && !inVoid) setInVoid(true);
      if (dist < 5500 && inVoid) setInVoid(false);
    }

    // 3. Black Hole Event Horizon Collision Check
    if (activeTarget && cinematicState !== 'SUCKED_IN') {
      const body = celestialBodies.find(b => b.id === activeTarget);
      if (body && body.isBlackHole && !isAutoNavigating.current) {
        // We only check if the user manually flew too close after auto-nav ends
        const bodyPos = new THREE.Vector3(...body.position);
        bodyPos.applyMatrix4(groupRef.current.matrixWorld);
        const distToHole = camera.position.distanceTo(bodyPos);
        
        // Update rumble intensity based on distance (starts at 30 units away, max at 2 units)
        const rumbleIntensity = Math.max(0, Math.min(1, (30 - distToHole) / 28));
        sound.setRumbleIntensity(rumbleIntensity);
        
        // Danger zone camera shake (Starts before being sucked in)
        if (distToHole < body.size * 5) {
          const shakeFactor = Math.pow((body.size * 5 - distToHole) / (body.size * 5), 2) * 2;
          camera.position.x += (Math.random() - 0.5) * shakeFactor;
          camera.position.y += (Math.random() - 0.5) * shakeFactor;
        }
        
        if (distToHole < body.size * 1.5 && !isSuckedInRef.current) {
          isSuckedInRef.current = true;
          setCinematicState('SUCKED_IN');
          setTimeout(() => {
            setActiveTarget(null); // Force back to sun
            setCinematicState(null);
            
            // Instantly teleport camera to origin to prevent getting stuck if user is still scrolling
            camera.position.set(0, 0, 150);
            if (controlsRef.current) {
              controlsRef.current.target.set(0, 0, 0);
            }
            isAutoNavigating.current = false;
            isSuckedInRef.current = false;
            sound.setRumbleIntensity(0); // Stop rumble
          }, 4000);
        }
      } else {
        // If not looking at a black hole, ensure rumble is off
        sound.setRumbleIntensity(0);
      }
    } else {
      sound.setRumbleIntensity(0);
    }

    // 4. Track Active Target and Auto Navigation Lerping
    if (!isPiloting && groupRef.current && controlsRef.current) {
      if (activeTarget) {
        const planetObject = groupRef.current.getObjectByName(activeTarget);
        if (planetObject) {
          const bodyWorldPos = new THREE.Vector3();
          planetObject.getWorldPosition(bodyWorldPos);
          
          const body = celestialBodies.find(b => b.id === activeTarget);
          
          // Determine if we are on a mobile/narrow screen
          let distanceModifier = 1.0;
          if (typeof window !== 'undefined' && window.innerWidth < 768) {
             distanceModifier = 1.8; // Push camera significantly further back on mobile to avoid cutting off edges
          }
          
          // Scale camera distance strictly by body size, with a tiny absolute minimum to avoid near-plane clipping
          const baseViewDistance = body.isBlackHole || body.isWormhole ? 6 : 4;
          const viewDistance = Math.max(0.2, body.size * baseViewDistance) * distanceModifier;

          if (isAutoNavigating.current) {
            targetLookAt.current.copy(bodyWorldPos);
            targetCameraPos.current.set(
              bodyWorldPos.x + viewDistance * 0.5,
              bodyWorldPos.y + viewDistance * 0.2,
              bodyWorldPos.z + viewDistance
            );
            
            const distToTarget = camera.position.distanceTo(targetCameraPos.current);
            
            // Teleport instantly only if we are behind a black screen cinematic warp jump
            if (cinematicState === 'JUMPING_TO_FICTION' || cinematicState === 'JUMPING_TO_REAL') {
              camera.position.copy(targetCameraPos.current);
              controlsRef.current.target.copy(targetLookAt.current);
              isAutoNavigating.current = false;
              planetObject.userData.prevPos = bodyWorldPos.clone();
              return;
            }
            
            const lerpSpeed = distToTarget > 1000 ? 0.08 : 0.06;
            camera.position.lerp(targetCameraPos.current, lerpSpeed);
            controlsRef.current.target.lerp(targetLookAt.current, lerpSpeed);
            
            const state = controlsRef.current ? controlsRef.current.state : -1;
            const userInterrupted = state === 1 || state === 2 || state === 4 || state === 5;
            
            if (distToTarget < Math.max(0.5, viewDistance * 0.05) || (userInterrupted && distToTarget < 500)) {
              isAutoNavigating.current = false;
              if (!userInterrupted) {
                // Do not instantly snap the camera if we are just completing the lerp, 
                // it causes a micro-stutter. Just let the standard tracking take over.
              }
              controlsRef.current.target.copy(targetLookAt.current);
            }
            
            // Keep prevPos updated even while auto-navigating, so there's no jump when it ends
            planetObject.userData.prevPos = bodyWorldPos.clone();
          } else {
            // We are NOT auto-navigating, we are actively locked onto the planet.
            // 1. Calculate how much the planet MOVED since last frame (velocity)
            if (!planetObject.userData.prevPos) {
               planetObject.userData.prevPos = bodyWorldPos.clone();
            }
            const velocity = bodyWorldPos.clone().sub(planetObject.userData.prevPos);
            
            // 2. Move camera by the planet's velocity so it orbits seamlessly
            camera.position.add(velocity);
            
            // 3. Force the camera target to PERFECTLY stick to the planet's center.
            // This instantly corrects any drift if the user tries to pan or interrupts a flight.
            controlsRef.current.target.copy(bodyWorldPos);
            
            planetObject.userData.prevPos.copy(bodyWorldPos);
          }
        }
      } else if (isAutoNavigating.current) {
        // Navigating back to start (0,0,50) when target is cleared
        const distToTarget = camera.position.distanceTo(targetCameraPos.current);
        
        if (cinematicState === 'JUMPING_TO_REAL') {
          camera.position.copy(targetCameraPos.current);
          controlsRef.current.target.copy(targetLookAt.current);
          isAutoNavigating.current = false;
          return;
        }

        const lerpSpeed = distToTarget > 1000 ? 0.08 : 0.06;
        camera.position.lerp(targetCameraPos.current, lerpSpeed);
        controlsRef.current.target.lerp(targetLookAt.current, lerpSpeed);
        
        const state = controlsRef.current ? controlsRef.current.state : -1;
        const userInterrupted = state === 1 || state === 2 || state === 4 || state === 5;
        
        if (distToTarget < 0.5 || (userInterrupted && distToTarget < 500)) {
          isAutoNavigating.current = false;
          if (!userInterrupted) {
            camera.position.copy(targetCameraPos.current);
          }
          controlsRef.current.target.copy(targetLookAt.current);
        }
      }
    }
  });

  // Minimum allowed camera distance from the orbit TARGET (not the body's
  // surface). Some bodies (distant stars) have a size of up to 250 units,
  // so a fixed 0.3 let the camera fly INSIDE their sphere geometry while
  // orbiting. Since sphere meshes only render their outward face, being
  // inside one renders nothing (black), and crossing the surface while
  // dragging the mouse caused the black flicker. Scale the minimum with
  // the selected body's own size instead.
  const activeBody = activeTarget ? celestialBodies.find(b => b.id === activeTarget) : null;
  const orbitMinDistance = activeBody ? Math.max(0.08, activeBody.size * 1.3) : 0.08;

  return (
    <>
      <Spaceship isPiloting={isPiloting} shipModel={shipModel} />

      {!isPiloting && (
        <OrbitControls 
          ref={controlsRef}
          makeDefault 
          enableDamping
          dampingFactor={0.05}
          maxDistance={8000}
          minDistance={orbitMinDistance}
          enablePan={!activeTarget} // Disable panning while tracking a planet to prevent lock-on jitter
          onStart={() => {
            // If the user manually interacts with controls, stop auto-navigating
            isAutoNavigating.current = false;
          }}
        />
      )}
      
      <group ref={groupRef}>
        <ambientLight intensity={0.02} />
        
        {/* Warp Drive Effect */}
        <WarpEffect active={cinematicState?.startsWith('JUMPING')} />

        <group visible={!cinematicState?.startsWith('JUMPING')}>
          {/* Majestic Procedural Nebula Background */}
          <NebulaBackground />

          {/* Massive Background Star Field */}
          <Points positions={positions} colors={colors} sizes={sizes}>
            <PointMaterial 
              transparent 
              vertexColors 
              size={1.5} 
              sizeAttenuation={true} 
              depthWrite={false} 
              blending={THREE.AdditiveBlending}
            />
          </Points>

          {/* 3D Spiral Galaxy Model */}
          {/* We place the galactic center nearby so scrolling out is quick */}
          <Galaxy position={[800, -150, -500]} scale={0.06} />

          {/* Solar System Orbit Rings */}
          {!activeTarget && showOrbits && <OrbitRings celestialBodies={celestialBodies} />}

          {/* Render Specific Celestial Bodies */}
        {celestialBodies.map((body) => {
          const targetBody = celestialBodies.find(b => b.id === activeTarget);
          const isFictionalUniverse = targetBody ? !!targetBody.isFictional : false;
          
          // Render only bodies that belong to the current universe
          if (body.isFictional !== isFictionalUniverse) return null;

          if (body.isBlackHole) {
            return (
              <BlackHole 
                key={body.id} 
                body={body} 
                onClick={(b) => setActiveTarget(b.id)}
                isTarget={activeTarget === body.id}
              />
            );
          }
          if (body.id === 'pulsar') {
            return (
              <Pulsar 
                key={body.id} 
                body={body} 
                onClick={(b) => setActiveTarget(b.id)}
                isTarget={activeTarget === body.id}
              />
            );
          }
          if (body.id === 'miller') {
            return (
              <MillerPlanet
                key={body.id}
                body={body}
                onClick={(b) => setActiveTarget(b.id)}
                isTarget={activeTarget === body.id}
              />
            );
          }
          if (body.id === 'dyson-sphere') {
            return (
              <DysonSphere 
                key={body.id} 
                body={body} 
                onClick={(b) => setActiveTarget(b.id)}
                isTarget={activeTarget === body.id}
              />
            );
          }
          if (body.isWormhole) {
            return (
              <Wormhole 
                key={body.id} 
                body={body} 
                onClick={(b) => setActiveTarget(b.id)}
                isTarget={activeTarget === body.id}
              />
            );
          }
          return (
            <CelestialBody 
              key={body.id} 
              body={body} 
              onClick={(b) => setActiveTarget(b.id)}
              isTarget={activeTarget === body.id}
              activeTarget={activeTarget}
              timeScale={timeScale}
            />
          );
        })}

        {/* Asteroid Belt between Mars (r~8) and Jupiter (r~15) */}
        <AsteroidBelt innerRadius={9.0} outerRadius={12.0} count={ASTEROID_COUNT} timeScale={timeScale} />

        {/* Floating anomalies once the player has drifted into deep space */}
        <VoidAnomalies active={inVoid} />
      </group>
      </group>

      {/* Post-processing: makes the Sun, stars and the black hole's
          accretion disk actually glow, and softly darkens the frame edges */}
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={2.0}
          luminanceThreshold={0.85} // Lowered to 0.85 because mobile LDR buffers clamp to 1.0
          luminanceSmoothing={0.15} // Sharper cutoff so planets at 0.7 don't bloom
          mipmapBlur={!LOW_POWER}
          radius={0.8}
        />
        <Vignette eskil={false} offset={0.15} darkness={0.9} />
      </EffectComposer>
    </>
  );
}
