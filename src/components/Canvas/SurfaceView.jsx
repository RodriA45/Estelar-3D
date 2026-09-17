import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';

const terrainVertexShader = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  // Simplex noise (approximate)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  uniform float seed;
  uniform float roughness;
  
  void main() {
    vUv = uv;
    vNormal = normal;
    
    // Calculate fractal noise for terrain height
    vec3 pos = position;
    
    float elevation = 0.0;
    float frequency = 0.02;
    float amplitude = 15.0 * roughness;
    
    for(int i = 0; i < 4; i++) {
        elevation += snoise(vec3(pos.x * frequency, pos.y * frequency, seed)) * amplitude;
        frequency *= 2.5;
        amplitude *= 0.4;
    }
    
    // Add craters for moon/mercury
    if (roughness > 1.5) {
        float craterNoise = snoise(vec3(pos.x * 0.05, pos.y * 0.05, seed + 10.0));
        if (craterNoise > 0.4) {
            elevation -= pow((craterNoise - 0.4) * 5.0, 2.0);
        }
    }
    
    pos.z += elevation;
    vPosition = pos;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const terrainFragmentShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  uniform vec3 baseColor;
  uniform vec3 highColor;
  #include <logdepthbuf_pars_fragment>
  
  void main() {
    // Basic height-based coloring
    float heightMix = clamp((vPosition.z + 10.0) / 20.0, 0.0, 1.0);
    vec3 finalColor = mix(baseColor, highColor, heightMix);
    
    // Fake lighting based on height derivative (very simple)
    float light = clamp(vPosition.z * 0.05 + 0.5, 0.2, 1.0);
    
    gl_FragColor = vec4(finalColor * light, 1.0);
    #include <logdepthbuf_fragment>
  }
`;

export default function SurfaceView({ targetId }) {
  const meshRef = useRef();

  // Determine planet characteristics
  const planetConfig = useMemo(() => {
    switch (targetId) {
      case 'mars':
        return {
          baseColor: '#8c3b1a',
          highColor: '#c46033',
          roughness: 1.2,
          sky: { turbidity: 10, rayleigh: 3, mieCoefficient: 0.1, mieDirectionalG: 0.8, sunPosition: [100, 20, 100] },
          hasAtmosphere: true,
          atmosphereColor: '#ffbb88'
        };
      case 'moon':
      case 'mercury':
        return {
          baseColor: '#444444',
          highColor: '#888888',
          roughness: 1.8,
          sky: null,
          hasAtmosphere: false
        };
      case 'earth':
        return {
          baseColor: '#2d4c1e',
          highColor: '#5c5443',
          roughness: 0.8,
          sky: { turbidity: 10, rayleigh: 2, mieCoefficient: 0.005, mieDirectionalG: 0.8, sunPosition: [100, 50, 100] },
          hasAtmosphere: true,
          atmosphereColor: '#aaddff'
        };
      case 'venus':
        return {
          baseColor: '#d6b85a',
          highColor: '#a37c32',
          roughness: 0.5, // Flattened due to pressure
          sky: { turbidity: 20, rayleigh: 10, mieCoefficient: 0.5, mieDirectionalG: 0.9, sunPosition: [100, 10, 100] },
          hasAtmosphere: true,
          atmosphereColor: '#ffcc66'
        };
      default:
        // Generic fallback for any other rocky body
        return {
          baseColor: '#555555',
          highColor: '#aaaaaa',
          roughness: 1.0,
          sky: null,
          hasAtmosphere: false
        };
    }
  }, [targetId]);

  const terrainMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        seed: { value: Math.random() * 100 },
        roughness: { value: planetConfig.roughness },
        baseColor: { value: new THREE.Color(planetConfig.baseColor) },
        highColor: { value: new THREE.Color(planetConfig.highColor) }
      },
      vertexShader: terrainVertexShader,
      fragmentShader: terrainFragmentShader,
      side: THREE.DoubleSide
    });
  }, [planetConfig]);

  return (
    <>
      <OrbitControls 
        makeDefault
        enableDamping
        dampingFactor={0.05}
        // Restrict polar angle so we don't go under the ground
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={2}
        maxDistance={50}
        target={[0, 0, 0]}
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[100, 100, 50]} intensity={1.5} />
      
      {/* Atmosphere / Sky */}
      {planetConfig.hasAtmosphere ? (
        <>
          <Sky 
            turbidity={planetConfig.sky.turbidity} 
            rayleigh={planetConfig.sky.rayleigh} 
            mieCoefficient={planetConfig.sky.mieCoefficient} 
            mieDirectionalG={planetConfig.sky.mieDirectionalG} 
            sunPosition={planetConfig.sky.sunPosition}
          />
          <fog attach="fog" args={[planetConfig.atmosphereColor, 20, 400]} />
        </>
      ) : (
        <>
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          {/* Black space fog so the terrain fades out at the edges */}
          <fog attach="fog" args={['#000000', 50, 300]} />
        </>
      )}

      {/* Procedural Terrain Mesh */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
        {/* Very high segment count for displacement shader */}
        <planeGeometry args={[1000, 1000, 256, 256]} />
        <primitive object={terrainMaterial} attach="material" />
      </mesh>
    </>
  );
}
