import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Ring, Billboard } from '@react-three/drei';
import * as THREE from 'three';

const blackHoleVertexShader = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const blackHoleFragmentShader = `
  uniform float time;
  varying vec2 vUv;
  #include <logdepthbuf_pars_fragment>

  void main() {
    vec2 p = (vUv - 0.5) * 2.0; 
    float r = length(p);
    
    // Core (Event Horizon)
    float horizonRadius = 0.22;
    float horizon = smoothstep(horizonRadius - 0.005, horizonRadius + 0.005, r);
    
    // Accretion Disk Parameters
    float diskInner = 0.28;
    float diskOuter = 0.85;
    
    // 1. FRONT ACCRETION DISK (Flat Ellipse)
    float tilt = 7.0; // Disk flatness
    float diskY = p.y * tilt;
    float diskR = sqrt(p.x * p.x + diskY * diskY);
    
    // Sharp inner edge, smooth outer fade
    float frontDisk = smoothstep(diskOuter, diskOuter - 0.2, diskR) * smoothstep(diskInner, diskInner + 0.02, diskR);
    // Intense brightness concentration at the inner edge
    frontDisk += smoothstep(diskInner + 0.15, diskInner, diskR) * 2.5 * smoothstep(diskInner - 0.01, diskInner + 0.02, diskR);
    
    // Subtle procedural bands in the disk
    float bands = sin(diskR * 50.0 - time * 2.0) * 0.5 + 0.5;
    frontDisk *= 0.85 + 0.15 * bands;

    // 2. GRAVITATIONAL LENSING (Einstein Ring / Halo)
    // The back of the disk warped over and under the black hole
    // Add a tiny epsilon to prevent atan(0.0, 0.0) which produces NaN and crashes the Bloom pass
    float angle = atan(p.y, p.x + 0.000001);
    float absSin = abs(sin(angle));
    
    // The lensed ring hugs the horizon at the poles and bulges out at the equator
    float lensDist = horizonRadius + 0.015 + 0.07 * (1.0 - absSin);
    float haloR = abs(r - lensDist);
    
    // The halo is thicker at the poles
    float haloWidth = 0.01 + 0.035 * absSin;
    float halo = smoothstep(haloWidth, 0.0, haloR);
    
    // Fade the halo as it reaches the equator so it doesn't overlap the front disk aggressively
    float haloMask = smoothstep(0.02, 0.25, abs(p.y));
    halo *= haloMask * 1.2;

    // 3. RELATIVISTIC DOPPLER BEAMING
    // The side rotating towards the camera is brighter and bluer. The receding side is dimmer and redder.
    float doppler = 1.0 - p.x * 0.65; // Ranges roughly from 0.35 (right) to 1.65 (left)
    
    vec3 colorBase = vec3(1.0, 0.55, 0.15); // Deep gold/orange
    vec3 colorHot = vec3(1.0, 0.95, 0.85);  // Intense bright white/blueish
    vec3 colorCold = vec3(0.4, 0.05, 0.0);  // Dark crimson
    
    vec3 mappedColor = mix(colorCold, colorBase, smoothstep(0.35, 1.0, doppler));
    mappedColor = mix(mappedColor, colorHot, smoothstep(1.0, 1.65, doppler));

    // 4. PHOTON SPHERE
    // Extremely thin, ultra-bright ring exactly at the event horizon
    float photonSphere = smoothstep(0.008, 0.0, abs(r - (horizonRadius + 0.002)));
    
    // 5. COMPOSITION
    vec3 finalColor = vec3(0.0);
    
    // Add components with their color mappings
    finalColor += frontDisk * mappedColor * 1.5;
    finalColor += halo * mappedColor * 1.8;
    finalColor += photonSphere * colorHot * 2.0;
    
    // Mask out anything inside the event horizon (pure black)
    finalColor *= horizon;
    
    // 6. VOLUMETRIC GLOW
    // Soft ambient glow around the entire structure
    float globalGlow = exp(-r * 3.5) * 0.4;
    finalColor += globalGlow * colorBase * horizon * mappedColor;
    
    // Tone mapping to preserve rich colors while allowing intense whites
    finalColor = (finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14);
    
    // Fade out billboard edges seamlessly
    float alpha = smoothstep(1.0, 0.8, max(abs(p.x), abs(p.y)));
    if (alpha < 0.05) discard;
    
    gl_FragColor = vec4(finalColor, alpha);
    #include <logdepthbuf_fragment>
  }
`;

const flareFragmentShader = `
  uniform vec3 color;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    // Stretch heavily on X, squeeze on Y to make a horizontal beam
    float r = length(vec2(p.x * 0.05, p.y * 10.0)) * 2.0; 
    
    float intensity = exp(-r * 3.0); 
    intensity *= smoothstep(1.0, 0.1, r);
    
    gl_FragColor = vec4(color, intensity * 0.8);
  }
`;

export default function BlackHole({ body, onClick, isTarget }) {
  const materialRef = useRef();

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <group position={body.position} name={body.id}>
      {/* Hyper-realistic Shader Billboard */}
      <Billboard>
        <mesh 
          onClick={(e) => {
            e.stopPropagation();
            onClick(body);
          }}
          onPointerOver={() => document.body.style.cursor = 'pointer'}
          onPointerOut={() => document.body.style.cursor = 'auto'}
        >
          <planeGeometry args={[body.size * 8, body.size * 8]} />
          <shaderMaterial 
            ref={materialRef}
            vertexShader={blackHoleVertexShader}
            fragmentShader={blackHoleFragmentShader}
            uniforms={{ time: { value: 0 } }}
            transparent={true}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Massive Anamorphic Lens Flare */}
        <mesh pointerEvents="none">
          <planeGeometry args={[body.size * 120.0, body.size * 4.0]} />
          <shaderMaterial 
            vertexShader={blackHoleVertexShader}
            fragmentShader={flareFragmentShader}
            uniforms={{ color: { value: new THREE.Color('#ffbba0') } }}
            transparent={true}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Billboard>
      
      {/* The pure black physical core (so it blocks things behind it) */}
      <Sphere args={[body.size * 0.88, 32, 32]}>
        <meshBasicMaterial color="#000000" />
      </Sphere>

      {/* Extreme light emitted from the accretion disk */}
      <pointLight color="#ffcc88" intensity={200} distance={body.size * 100} decay={1.5} />
    </group>
  );
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 200, 100, 0)');
  gradient.addColorStop(0.3, 'rgba(255, 200, 100, 0)');
  gradient.addColorStop(0.4, 'rgba(255, 200, 100, 0.8)');
  gradient.addColorStop(0.8, 'rgba(255, 100, 50, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  
  return new THREE.CanvasTexture(canvas);
}

function createGradientTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  
  // Radial gradient
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 200, 100, 0.8)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
