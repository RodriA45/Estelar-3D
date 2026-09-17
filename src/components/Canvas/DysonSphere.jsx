import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Billboard } from '@react-three/drei';
import * as THREE from 'three';

const godRaysVertexShader = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const godRaysFragmentShader = `
  uniform float time;
  varying vec2 vUv;
  #include <logdepthbuf_pars_fragment>

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float angle = atan(p.y, p.x);
    
    // Create radiating sun shafts
    float rays = sin(angle * 12.0 + time * 0.2) * 0.5 + 0.5;
    rays *= sin(angle * 30.0 - time * 0.1) * 0.5 + 0.5;
    rays *= sin(angle * 5.0) * 0.5 + 0.5;
    
    // Fade rays as they go outwards
    float falloff = exp(-r * 3.0);
    
    // Smooth fade to 0 before the quad edges to prevent square artifacts
    float edgeFade = 1.0 - smoothstep(0.7, 1.0, r);
    
    // Core glow
    float core = exp(-r * 8.0) * 2.0;
    
    float intensity = (rays * 1.5 + core) * falloff * edgeFade;
    
    vec3 color = vec3(1.0, 0.85, 0.6); // Warm golden star color
    
    gl_FragColor = vec4(color, intensity);
    #include <logdepthbuf_fragment>
  }
`;

// Creates a single band of the Dyson Swarm using InstancedMesh
function DysonSwarmBand({ count, radius, spread, panelSize, color, rotationSpeed, axis }) {
  const meshRef = useRef();
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useEffect(() => {
    if (!meshRef.current) return;
    
    for (let i = 0; i < count; i++) {
      // Random position along a ring
      const angle = Math.random() * Math.PI * 2;
      const r = radius + (Math.random() - 0.5) * spread;
      const y = (Math.random() - 0.5) * spread * 0.5; // Slight vertical spread
      
      dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      
      // Orient the panel to face the star (0,0,0)
      dummy.lookAt(0, 0, 0);
      
      // Add slight random tilt
      dummy.rotateX((Math.random() - 0.5) * 0.2);
      dummy.rotateY((Math.random() - 0.5) * 0.2);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count, radius, spread, dummy]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotateOnAxis(axis, rotationSpeed * delta);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <planeGeometry args={[panelSize, panelSize * 0.6]} />
      <meshStandardMaterial 
        color={color} 
        metalness={0.9} 
        roughness={0.2} 
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

export default function DysonSphere({ body, onClick, isTarget }) {
  const raysMaterialRef = useRef();
  const starRadius = body.size * 0.8;

  useFrame((state) => {
    if (raysMaterialRef.current) {
      raysMaterialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  // Define axes for the orbital bands
  const axis1 = useMemo(() => new THREE.Vector3(0, 1, 0).normalize(), []);
  const axis2 = useMemo(() => new THREE.Vector3(0.2, 1, 0.3).normalize(), []);
  const axis3 = useMemo(() => new THREE.Vector3(-0.3, 1, -0.1).normalize(), []);
  const axis4 = useMemo(() => new THREE.Vector3(0.5, 0.5, 1).normalize(), []);

  return (
    <group position={body.position} name={body.id}>
      
      {/* 1. Volumetric God Rays (Billboard placed behind everything) */}
      <Billboard>
        <mesh pointerEvents="none" position={[0, 0, -body.size * 0.5]}>
          <planeGeometry args={[body.size * 18, body.size * 18]} />
          <shaderMaterial 
            ref={raysMaterialRef}
            vertexShader={godRaysVertexShader}
            fragmentShader={godRaysFragmentShader}
            uniforms={{ time: { value: 0 } }}
            transparent={true}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </Billboard>

      {/* 2. The Central Star */}
      <Sphere 
        args={[starRadius, 64, 64]}
        onClick={(e) => {
          e.stopPropagation();
          onClick(body);
        }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        <meshBasicMaterial color="#ffeedd" />
      </Sphere>

      {/* Extreme light emitted from the star */}
      <pointLight color="#ffddaa" intensity={200} distance={body.size * 200} decay={1.5} />

      {/* 3. The Dyson Swarm (Multiple orbital bands of thousands of panels) */}
      <DysonSwarmBand 
        count={2500} 
        radius={body.size * 2.5} 
        spread={body.size * 0.4} 
        panelSize={body.size * 0.08} 
        color="#112233" 
        rotationSpeed={0.05} 
        axis={axis1} 
      />
      
      <DysonSwarmBand 
        count={2000} 
        radius={body.size * 3.2} 
        spread={body.size * 0.6} 
        panelSize={body.size * 0.1} 
        color="#223344" 
        rotationSpeed={0.03} 
        axis={axis2} 
      />
      
      <DysonSwarmBand 
        count={1500} 
        radius={body.size * 4.0} 
        spread={body.size * 0.8} 
        panelSize={body.size * 0.12} 
        color="#334455" 
        rotationSpeed={0.02} 
        axis={axis3} 
      />

      <DysonSwarmBand 
        count={800} 
        radius={body.size * 5.0} 
        spread={body.size * 1.5} 
        panelSize={body.size * 0.15} 
        color="#445566" 
        rotationSpeed={0.015} 
        axis={axis4} 
      />
    </group>
  );
}
