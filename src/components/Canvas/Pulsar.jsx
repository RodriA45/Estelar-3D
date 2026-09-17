import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';

const pulsarVertexShader = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const pulsarFragmentShader = `
  uniform float time;
  varying vec2 vUv;
  #include <logdepthbuf_pars_fragment>

  // Basic 3D Noise function for the neutron star surface
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

  void main() {
    vec2 p = (vUv - 0.5) * 2.0; 
    float r = length(p);
    
    // 1. Core parameters (Sharp blue/white star)
    float starRadius = 0.15;
    float horizonRadius = 0.30; // The black gap where light is trapped
    
    // Masks
    float isSpace = smoothstep(horizonRadius - 0.005, horizonRadius + 0.005, r);
    float isStar = 1.0 - smoothstep(starRadius - 0.005, starRadius + 0.005, r);
    
    // 2. Accretion Disk (Background gas)
    float diskInner = 0.35;
    float diskOuter = 0.95;
    
    float tilt = 3.5; // Disk angle
    float diskY = p.y * tilt;
    float diskR = sqrt(p.x * p.x + diskY * diskY);
    
    // Thin, wispy disk
    float frontDisk = smoothstep(diskOuter, diskOuter - 0.3, diskR) * smoothstep(diskInner, diskInner + 0.05, diskR);
    float bands = snoise(vec3(p * 12.0, time * 0.05)) * 0.5 + 0.5;
    float bands2 = snoise(vec3(p * 4.0, -time * 0.02)) * 0.5 + 0.5;
    frontDisk *= 0.2 + 0.8 * bands * bands2;

    // 3. GRAVITATIONAL LENSING (Einstein Ring)
    float angle = atan(p.y, p.x + 0.000001);
    float absSin = abs(sin(angle));
    
    // Sharp, thin ring hugging the void
    float haloR = abs(r - horizonRadius);
    float haloWidth = 0.015 + 0.015 * absSin;
    float halo = smoothstep(haloWidth, 0.0, haloR);
    
    // Fade at the equator to blend with the disk
    float haloMask = smoothstep(0.05, 0.4, abs(p.y));
    halo *= haloMask * 2.0;
    // Add turbulence to the lensed light
    halo *= 0.6 + 0.4 * snoise(vec3(p * 25.0, time * -0.1));

    // 4. COLOR MAPPING (Deep space orange/gold vs dark brown)
    vec3 colorBase = vec3(1.0, 0.45, 0.1); 
    vec3 colorDark = vec3(0.15, 0.02, 0.0);
    vec3 mappedColor = mix(colorDark, colorBase, smoothstep(diskInner, diskInner + 0.3, diskR));
    
    // 5. COMPOSITION
    vec3 finalColor = vec3(0.0);
    
    // Add disk and lensed ring
    finalColor += frontDisk * mappedColor * 1.2;
    finalColor += halo * colorBase * 1.8;
    
    // Pure black void between the ring and the star
    finalColor *= isSpace;
    
    // Solid glowing blue/white core
    vec3 coreColor = vec3(0.8, 0.9, 1.0);
    // Add slight surface detail to the core
    float coreDetail = snoise(vec3(p * 10.0, time * 0.5));
    coreColor *= 0.9 + 0.1 * coreDetail;
    
    finalColor += isStar * coreColor * 2.0;
    
    // Subtle blue atmospheric glow around the star core (inside the void)
    float starGlow = exp(-(r - starRadius) * 25.0);
    finalColor += starGlow * vec3(0.2, 0.5, 1.0) * (1.0 - isStar) * (1.0 - isSpace) * 1.5;
    
    // Tone mapping to preserve highlights
    finalColor = (finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14);
    
    float alpha = smoothstep(1.0, 0.8, max(abs(p.x), abs(p.y)));
    // Core is fully opaque
    alpha = max(alpha, isStar);
    if (alpha < 0.05) discard;
    
    gl_FragColor = vec4(finalColor, alpha);
    #include <logdepthbuf_fragment>
  }
`;

export default function Pulsar({ body, onClick, isTarget }) {
  const materialRef = useRef();

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <group position={body.position} name={body.id}>
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
            vertexShader={pulsarVertexShader}
            fragmentShader={pulsarFragmentShader}
            uniforms={{ time: { value: 0 } }}
            transparent={true}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>

      {/* Intense Point Light from the Core */}
      <pointLight color="#88bbff" intensity={800} distance={body.size * 200} decay={1.5} />
    </group>
  );
}
