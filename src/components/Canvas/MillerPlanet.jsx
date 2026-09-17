import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

const millerVertexShader = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vLocalPos;
  uniform float time;
  uniform float baseRadius;
  
  // Basic 3D Noise function
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
  
  // FBM for detailed displacement
  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    for(int i = 0; i < 4; i++) {
      sum += snoise(p * freq) * amp;
      amp *= 0.5;
      freq *= 2.0;
      p += vec3(100.0);
    }
    return sum;
  }

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vLocalPos = position;
    
    // Normalized position for noise
    vec3 normPos = normalize(position);
    
    // Create massive tidal waves by displacing vertices
    float wave1 = sin(normPos.x * 15.0 + time * 1.5) * 0.015;
    float wave2 = sin(normPos.z * 10.0 - time * 1.2) * 0.01;
    
    // A single immense tidal wave sweeping across the planet
    float tidalWave = sin(normPos.y * 10.0 + normPos.x * 5.0 + time * 3.0);
    tidalWave = pow(max(0.0, tidalWave), 12.0) * 0.04;
    
    float totalDisplacement = (wave1 + wave2 + tidalWave) * baseRadius;
    
    vec3 newPosition = position + normal * totalDisplacement;
    vPosition = newPosition;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const millerFragmentShader = `
  #include <logdepthbuf_pars_fragment>
  uniform float time;
  uniform float baseRadius;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vLocalPos;

  // Basic 3D Noise function
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

  // FBM for detailed clouds and ocean surface
  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    for(int i = 0; i < 5; i++) {
      sum += snoise(p * freq) * amp;
      amp *= 0.5;
      freq *= 2.0;
      p += vec3(100.0);
    }
    return sum;
  }

  void main() {
    // Determine wave peaks vs troughs by the height (magnitude of vLocalPos from origin)
    float height = length(vLocalPos);
    
    // Normalize height relative to baseRadius
    float normalizedHeight = height / baseRadius;
    float peakFactor = smoothstep(1.0, 1.04, normalizedHeight);
    
    vec3 normPos = normalize(vLocalPos);
    
    // Detailed ocean swirling noise
    float oceanNoise = fbm(normPos * 8.0 + time * 0.1);
    float cloudNoise = fbm(normPos * 4.0 - time * 0.05);
    
    // Deep ocean colors
    vec3 deepWater = vec3(0.05, 0.15, 0.25);
    vec3 shallowWater = vec3(0.2, 0.5, 0.6);
    vec3 waveCrest = vec3(0.8, 0.9, 1.0); // Foam
    
    // Base ocean color
    vec3 color = mix(deepWater, shallowWater, oceanNoise * 0.5 + 0.5);
    
    // Add white foam on the wave peaks
    color = mix(color, waveCrest, peakFactor * 0.8);
    
    // Add swirling atmospheric clouds (white-ish)
    float cloudAlpha = smoothstep(0.2, 0.8, cloudNoise);
    color = mix(color, vec3(0.85, 0.9, 0.95), cloudAlpha * 0.7); // 70% opacity clouds
    
    // Lighting
    vec3 lightDir = normalize(vec3(1.0, 0.8, 1.0)); // Light from Gargantua/accretion disk
    float diff = max(dot(vNormal, lightDir), 0.0);
    
    // Specular highlight for water
    vec3 viewDir = normalize(-vPosition);
    vec3 reflectDir = reflect(-lightDir, vNormal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    
    // Only water shines, clouds don't
    float specStrength = (1.0 - cloudAlpha) * (1.0 - peakFactor);
    
    // Combine lighting
    vec3 ambient = color * 0.2;
    vec3 diffuse = color * diff;
    vec3 specular = vec3(1.0) * spec * specStrength * 0.8;
    
    // Atmospheric rim lighting
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim = smoothstep(0.6, 1.0, rim);
    vec3 atmosphereGlow = vec3(0.5, 0.7, 0.9) * rim * 0.5;
    
    gl_FragColor = vec4(ambient + diffuse + specular + atmosphereGlow, 1.0);
    #include <logdepthbuf_fragment>
  }
`;

export default function MillerPlanet({ body, onClick, isTarget }) {
  const materialRef = useRef();
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1; 
    }
  });

  return (
    <group position={body.position} name={body.id} ref={groupRef}>
      <Sphere 
        args={[body.size, 128, 128]}
        onClick={(e) => {
          e.stopPropagation();
          onClick(body);
        }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        <shaderMaterial
          ref={materialRef}
          vertexShader={millerVertexShader}
          fragmentShader={millerFragmentShader}
          uniforms={{ 
            time: { value: 0 },
            baseRadius: { value: body.size }
          }}
        />
      </Sphere>
      
      {/* Atmosphere Glow */}
      <Sphere args={[body.size * 1.15, 32, 32]} pointerEvents="none">
        <meshBasicMaterial 
          color="#aaddff" 
          transparent 
          opacity={0.15} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
        />
      </Sphere>
    </group>
  );
}
