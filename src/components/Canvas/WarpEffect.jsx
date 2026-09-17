import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const warpVertexShader = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  uniform float time;
  uniform float warpSpeed;
  attribute float size;
  varying vec3 vColor;
  
  void main() {
    vColor = vec3(1.0, 1.0, 1.0);
    
    // Transform into camera space
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    if (warpSpeed > 0.0) {
      // In camera space, the camera is looking down the -Z axis.
      // Particles move from far away (-Z) towards the camera (+Z).
      float travelDistance = 4000.0;
      float zSpeed = warpSpeed * 4000.0; // Speed of the warp
      
      // Move Z towards positive
      float newZ = mvPosition.z + time * zSpeed;
      
      // Wrap the Z coordinate so it stays between -travelDistance and 0.
      // In GLSL, mod(x, y) is always positive if y is positive.
      mvPosition.z = mod(newZ, travelDistance) - travelDistance;
    }
    
    gl_Position = projectionMatrix * mvPosition;
    
    // As particles get closer to the camera (mvPosition.z approaches 0), they get larger.
    // Also stretch them slightly overall based on warpSpeed to look like lines.
    // (Since they are gl_Points, we just make them bigger and let the fragment shader handle it, 
    // or just rely on motion blur if we had it. Here we just increase size).
    float baseSize = size * 800.0;
    gl_PointSize = baseSize / max(-mvPosition.z, 1.0) * (1.0 + warpSpeed * 3.0);
    #include <logdepthbuf_vertex>
  }
`;

const warpFragmentShader = `
  varying vec3 vColor;
  #include <logdepthbuf_pars_fragment>
  void main() {
    // Make them look like glowing dots/streaks
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    // Soft circle
    if (dist > 0.5) discard;
    
    float intensity = pow(1.0 - (dist * 2.0), 1.5);
    
    gl_FragColor = vec4(vColor, intensity);
    #include <logdepthbuf_fragment>
  }
`;

export default function WarpEffect({ active }) {
  const pointsRef = useRef();
  const materialRef = useRef();
  const { camera } = useThree();
  const targetFov = useRef(60);
  const currentWarp = useRef(0);

  // Generate 8000 random points around the origin
  const [positions, sizes] = useMemo(() => {
    const count = 8000;
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Spread them in a massive volume so they wrap nicely
      pos[i * 3] = (Math.random() - 0.5) * 6000;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6000;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6000;
      sz[i] = Math.random() * 2.5 + 0.5; // Random sizes
    }
    return [pos, sz];
  }, []);

  useFrame((state, delta) => {
    // Smoothly interpolate warp factor
    const targetWarp = active ? 1.0 : 0.0;
    currentWarp.current = THREE.MathUtils.lerp(currentWarp.current, targetWarp, delta * 2.0);
    
    if (materialRef.current) {
      materialRef.current.uniforms.warpSpeed.value = currentWarp.current;
      materialRef.current.uniforms.time.value += delta;
    }

    // Dynamic FOV for hyperspace effect
    targetFov.current = active ? 110 : 60;
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov.current, delta * 3.0);
    camera.updateProjectionMatrix();
    
    // We must keep the particles surrounding the camera, so they don't get left behind
    if (pointsRef.current) {
       pointsRef.current.position.copy(camera.position); 
       
       // Add a very slight rotation to the starfield for dynamic feel
       if (currentWarp.current > 0.01) {
         pointsRef.current.rotation.z += delta * 0.05 * currentWarp.current;
       }
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={sizes.length} array={sizes} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial 
        ref={materialRef}
        uniforms={{
          time: { value: 0 },
          warpSpeed: { value: 0 }
        }}
        vertexShader={warpVertexShader}
        fragmentShader={warpFragmentShader}
        transparent={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
