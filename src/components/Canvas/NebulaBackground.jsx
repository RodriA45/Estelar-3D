import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const nebulaVertexShader = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const nebulaFragmentShader = `
  uniform float time;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  #include <logdepthbuf_pars_fragment>

  // Classic 3D noise (Simplex/Perlin approximation)
  // Permutation polynomial
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  // Fractal Brownian Motion
  float fbm(vec3 x) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 5; ++i) {
      v += a * snoise(x);
      x = x * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Very slow drift, scaled for massive, distant gas clouds
    vec3 p = normalize(vPosition) * 3.0; 
    float t = time * 0.01;
    
    // Generate organic cloudy shapes with multiple frequencies
    float noise1 = fbm(p + vec3(t, t, t));
    float noise2 = fbm(p * 2.0 - vec3(t, t * 0.5, -t));
    float noise3 = fbm(p * 4.0 + vec3(-t, t, t * 0.2));
    
    // Combine noise to create dense pockets and empty space
    float baseNoise = noise1 * 0.6 + noise2 * 0.3 + noise3 * 0.1;
    
    // Very soft threshold for vast, faint, diffuse gas
    float finalNoise = smoothstep(0.2, 0.9, baseNoise);
    
    // Mix subtle, realistic cosmic colors
    vec3 colorMix1 = mix(color1, color2, smoothstep(0.3, 0.7, noise1));
    vec3 finalColor = mix(colorMix1, color3, smoothstep(0.4, 0.8, noise2));
    
    // Subtle dust highlights
    float edgeHighlight = smoothstep(0.5, 0.8, baseNoise);
    finalColor += color3 * edgeHighlight * 0.5;

    // STARFIELD GENERATOR (High frequency noise thresholded to create stars)
    // We create tiny, very bright spots that will trigger the bloom effect
    float starNoise = fbm(p * 20.0);
    float stars = smoothstep(0.85, 1.0, starNoise);
    
    // Add bright glowing stars embedded in the nebula
    // They are brighter in the dense parts of the nebula (baseNoise > 0.4)
    float starCluster = stars * smoothstep(0.2, 0.8, baseNoise) * 3.0;
    finalColor += vec3(1.0, 0.9, 0.8) * starCluster; // Warm white stars
    
    // Also add some sparse bright blue stars everywhere
    float blueStars = smoothstep(0.95, 1.0, fbm(p * 15.0 + vec3(100.0)));
    finalColor += vec3(0.5, 0.8, 1.0) * blueStars * 2.5;

    // Opacity is mostly based on the gas, but stars are always fully opaque (alpha=1)
    float alpha = finalNoise * 0.35 + (starCluster + blueStars);

    // Discard completely empty space
    if (alpha < 0.005) discard;

    gl_FragColor = vec4(finalColor, alpha);
    #include <logdepthbuf_fragment>
  }
`;

export default function NebulaBackground() {
  const materialRef = useRef();

  useFrame((state) => {
    if (materialRef.current) {
      // Time flows for the slowly shifting clouds
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh>
      {/* Giant sphere encompassing the solar system */}
      <sphereGeometry args={[50000, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={{
          time: { value: 0 },
          // Deep, realistic cosmic colors (NASA/SpaceEngine style)
          color1: { value: new THREE.Color('#010103') }, // Extremely dark void
          color2: { value: new THREE.Color('#0f172a') }, // Very subtle deep blue
          color3: { value: new THREE.Color('#311624') }, // Faint dark burgundy/rust
        }}
        vertexShader={nebulaVertexShader}
        fragmentShader={nebulaFragmentShader}
        side={THREE.BackSide}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
