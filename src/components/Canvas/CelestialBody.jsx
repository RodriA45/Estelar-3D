import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Html, useTexture, Billboard, Trail } from '@react-three/drei';
import * as THREE from 'three';
import { celestialBodies } from '../../data/celestialData';
import { waterVertexShader, waterFragmentShader, sandVertexShader, sandFragmentShader } from './SciFiShaders';
import { planetVertexShader, gasGiantFragmentShader, rockyFragmentShader, earthFragmentShader, venusFragmentShader } from './Shaders/PlanetShaders';

// Vertex shader for the star surface
const starVertexShader = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

// Fragment shader for the star surface (plasma effect)
const starFragmentShader = `
  uniform float time;
  uniform vec3 color;
  uniform float seed;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  #include <logdepthbuf_pars_fragment>
  
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

  void main() {
    // Add seed so each star has a unique noise pattern, without massive float overflows
    vec3 pos = vPosition + vec3(seed);
    
    // Basic noise layer
    float noise1 = snoise(pos * 2.0 + time * 0.2);
    float noise2 = snoise(pos * 4.0 - time * 0.4);
    
    // Combine noises
    float finalNoise = (noise1 + noise2) * 0.5; // Range roughly -1 to 1
    // Map to 0-1 and increase contrast
    finalNoise = smoothstep(0.0, 0.7, (finalNoise + 1.0) * 0.5);
    
    // Create distinct dark and hot colors that preserve the star's natural hue
    vec3 darkColor = color * 0.5; // Dark regions
    vec3 hotColor = color + vec3(0.3); // Bright regions, slightly desaturated to simulate heat
    
    vec3 finalColor = mix(darkColor, hotColor, finalNoise);

    // Boost based on max channel rather than luminance, so we don't blow out 
    // secondary colors (like green in a red dwarf) and turn everything white.
    float maxColor = max(color.r, max(color.g, color.b));
    float boost = 1.2 / max(maxColor, 0.1);
    
    gl_FragColor = vec4(finalColor * boost, 1.0);
    #include <logdepthbuf_fragment>
  }
`;

// Vertex shader for the soft glow


// Procedural Ring Shader
const ringVertexShader = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const ringFragmentShader = `
  varying vec2 vUv;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  #include <logdepthbuf_pars_fragment>
  
  void main() {
    // uv.x in RingGeometry maps from inner radius (0.0) to outer radius (1.0)
    float r = vUv.x;
    
    // Create concentric bands using sine waves and step functions
    float band1 = smoothstep(0.0, 0.1, r) * (1.0 - smoothstep(0.2, 0.3, r));
    float band2 = smoothstep(0.35, 0.4, r) * (1.0 - smoothstep(0.65, 0.7, r));
    float band3 = smoothstep(0.72, 0.75, r) * (1.0 - smoothstep(0.95, 1.0, r));
    
    float alpha = (band1 * 0.8) + (band2 * 0.9) + (band3 * 0.6);
    
    vec3 finalColor = mix(color1, color2, band2);
    finalColor = mix(finalColor, color3, band3);
    
    if (alpha < 0.05) discard;
    
    gl_FragColor = vec4(finalColor, alpha);
    #include <logdepthbuf_fragment>
  }
`;



const atmosphereVertexShader = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 color;
  varying vec3 vNormal;
  #include <logdepthbuf_pars_fragment>
  void main() {
    // Simple view-direction dot product in camera space
    float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0));
    float rim = 1.0 - intensity;
    
    // Very thin, sharp falloff for a realistic atmosphere
    float alpha = pow(rim, 6.0) * 1.5;
    
    // Smooth fade to strictly 0 at the absolute geometric edge to avoid hard cutoffs
    // In GLSL edge0 must be < edge1, so we use 1.0 - smoothstep(0.9, 1.0, rim)
    alpha *= (1.0 - smoothstep(0.9, 1.0, rim));
    
    // Add a tiny bit of haze to the center
    alpha += 0.05 * (1.0 - smoothstep(0.0, 0.5, rim));
    
    gl_FragColor = vec4(color, alpha);
    #include <logdepthbuf_fragment>
  }
`;

// Shaders for Procedural Clouds
const cloudVertexShader = `
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

const cloudFragmentShader = `
  uniform float time;
  uniform vec3 color;
  varying vec2 vUv;
  varying vec3 vPosition;
  #include <logdepthbuf_pars_fragment>

  // Simple noise for clouds
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
    // Generate organic cloudy patterns with higher frequency (much finer detail)
    float noise1 = snoise(vec3(vPosition * 12.0 + time * 0.02));
    float noise2 = snoise(vec3(vPosition * 24.0 - time * 0.015));
    float noise3 = snoise(vec3(vPosition * 48.0 + time * 0.01));
    
    // Cloud density map
    float density = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);
    
    // Smooth threshold for distinct clouds vs clear sky
    float cloudAlpha = smoothstep(0.15, 0.45, density) * 0.5; // Max opacity 0.5
    
    gl_FragColor = vec4(color, cloudAlpha);
    #include <logdepthbuf_fragment>
  }
`;

// Shaders for Earth's City Lights on the dark side
const earthNightVertexShader = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    // Calculate normal in WORLD space so it doesn't shift when the camera moves!
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    
    gl_Position = projectionMatrix * viewMatrix * worldPos;
    #include <logdepthbuf_vertex>
  }
`;

const earthNightFragmentShader = `
  uniform sampler2D map;
  uniform vec3 sunPosition;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  #include <logdepthbuf_pars_fragment>

  // Simple noise for city lights
  float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }
  
  // Smooth noise based on hash
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
  }

  void main() {
    vec4 texColor = texture2D(map, vUv);
    
    // Determine if we are on the dark side (dot product of normal and direction to sun)
    vec3 lightDir = normalize(sunPosition - vWorldPosition);
    float lightIntensity = dot(vNormal, lightDir);
    
    // Smooth transition for dark side
    float darkSide = 1.0 - smoothstep(-0.2, 0.1, lightIntensity);
        // Land detection heuristic (Earth texture): if it's mostly blue, it's ocean
    // Sometimes the texture is too blue everywhere or compressed. Let's make it more forgiving.
    float isLand = step(texColor.b * 0.9, max(texColor.r, texColor.g));
    
    // Fallback: If it's too dark (space/edge), don't show lights
    float isNotEdge = step(0.05, texColor.r + texColor.g + texColor.b);
    
    // Prevent lights at the extreme poles where ice/distortion occurs
    float isNotPole = step(0.15, vUv.y) * step(vUv.y, 0.85); // Exclude poles
    
    // Generate scattered city lights using smooth noise for natural clusters
    vec2 noisePos = vUv * 250.0; // Higher frequency
    float n1 = noise(noisePos);
    float n2 = noise(noisePos * 2.0);
    
    // City light intensity (boosted for visibility but clustered naturally)
    // Needs to be very spiky to look like cities, not just a glow
    float cityLights = pow(n1 * n2, 4.0) * 25.0;
    
    // Add some random coloring to the lights (orange/yellow/white)
    vec3 lightColor = mix(vec3(1.0, 0.7, 0.2), vec3(1.0, 0.9, 0.6), noise(noisePos * 0.5));
    
    // If it's night, show lights.
    // For safety, even if isLand fails, let's show SOME lights but dim them
    float landFactor = mix(0.1, 1.0, isLand);
    vec3 finalGlow = lightColor * cityLights * landFactor * darkSide * isNotPole * isNotEdge;
    
    // Add a very faint blue atmospheric scatter on the terminator line
    float terminator = smoothstep(-0.2, 0.2, lightIntensity) * smoothstep(0.2, -0.2, lightIntensity);
    vec3 twilightGlow = vec3(0.1, 0.2, 0.4) * terminator * 0.5;
    
    gl_FragColor = vec4(finalGlow + twilightGlow, 1.0); 
  }
`;

export default function CelestialBody({ body, onClick, isTarget, activeTarget, timeScale = 1 }) {
  const meshRef = useRef();
  const timeRef = useRef(0);
  
  const texturedBodies = ['earth', 'jupiter', 'mars', 'mercury', 'moon', 'neptune', 'saturn', 'sun', 'uranus', 'venus'];
  const hasRealTexture = texturedBodies.includes(body.id);
  
  const isLuminous = body.id === 'sun' || 
    (body.type && body.type.includes('Enana') && !body.type.includes('Planeta')) || 
    (body.type && body.type.includes('Secuencia')) || 
    (body.type && body.type.includes('Gigante') && !body.type.includes('Gaseoso') && !body.type.includes('Hielo')) || 
    (body.type && body.type.includes('Estrella')) || 
    (body.type && body.type.includes('Púlsar')) || 
    (body.type && body.type.includes('Binario')) || 
    body.id === 'gargantua';
  
  // Conditionally load texture if it exists
  const texture = useTexture(hasRealTexture ? `/textures/${body.id}.jpg` : '/textures/sun.jpg');
  
  const isStar = body.id === 'sun' || 
    body.type.toLowerCase().includes('estrella') || 
    body.type.toLowerCase().includes('enana blanca') || 
    body.type.toLowerCase().includes('enana roja') || 
    body.type.toLowerCase().includes('enana amarilla') || 
    body.type.toLowerCase().includes('enana naranja') || 
    (body.type.toLowerCase().includes('gigante') && !body.type.toLowerCase().includes('gaseoso') && !body.type.toLowerCase().includes('hielo')) || 
    body.type.toLowerCase().includes('agujero negro') || 
    body.type.toLowerCase().includes('púlsar') || 
    body.type.toLowerCase().includes('secuencia principal');

  // Generate a deterministic unique seed for this body based on its ID
  const uniqueSeed = useMemo(() => {
    return body.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 12.34;
  }, [body.id]);

  // Find parent sun position if it has a parent
  const activeSunPosition = useMemo(() => {
    if (body.parent) {
      const parentBody = celestialBodies.find(b => b.id === body.parent);
      if (parentBody && parentBody.position) {
        return new THREE.Vector3(...parentBody.position);
      }
    }
    return new THREE.Vector3(0, 0, 0);
  }, [body.parent]);

  // Custom materials for realism
  const starMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(body.color) },
        seed: { value: uniqueSeed }
      },
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
    });
  }, [body.color, uniqueSeed]);



  const earthNightMaterial = useMemo(() => {
    if (body.id !== 'earth') return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: null },
        sunPosition: { value: activeSunPosition } 
      },
      vertexShader: earthNightVertexShader,
      fragmentShader: earthNightFragmentShader,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    });
  }, [body.id]);

  const atmosphereMaterial = useMemo(() => {
    if (!body.hasAtmosphere) return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(body.atmosphereColor || '#ffffff') }
      },
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide // FrontSide with custom shader for a smooth fade
    });
  }, [body.hasAtmosphere, body.atmosphereColor]);

  const cloudMaterial = useMemo(() => {
    // Determine if it's a gas giant (no separate cloud layer needed)
    const isGasGiant = body.type && (body.type.toLowerCase().includes('gaseoso') || body.type.toLowerCase().includes('hielo'));
    
    // Disable procedural clouds for gas giants, planets with real baked textures (except maybe we want them for some, but let's disable for Venus/Jupiter for sure)
    // Actually, let's disable for all real textured planets to let the NASA texture shine, except earth where we might want moving clouds, but Earth texture already has baked clouds.
    if (!body.hasAtmosphere || body.id === 'arrakis' || isGasGiant || hasRealTexture) return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color('#ffffff') } // White clouds
      },
      vertexShader: cloudVertexShader,
      fragmentShader: cloudFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
  }, [body.hasAtmosphere, body.id]);

  // SCI-FI CUSTOM MATERIALS
  const millerMaterial = useMemo(() => {
    if (body.id !== 'miller') return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color('#113355') },
        crestColor: { value: new THREE.Color('#336699') }
      },
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader
    });
  }, [body.id]);

  const arrakisMaterial = useMemo(() => {
    if (body.id !== 'arrakis') return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color('#c26d36') }
      },
      vertexShader: sandVertexShader,
      fragmentShader: sandFragmentShader
    });
  }, [body.id]);

  // NEW PROCEDURAL PLANET MATERIALS
  const proceduralMaterial = useMemo(() => {
    // Only apply to standard planets, not stars, black holes, or special sci-fi planets
    if (hasRealTexture || isStar || body.isBlackHole || body.id === 'miller' || body.id === 'arrakis' || body.id === 'halo' || body.id === 'gargantua' || body.id === 'endor') {
      return null;
    }

    const isGasGiant = body.type.toLowerCase().includes('gaseoso') || body.type.toLowerCase().includes('hielo');
    const isRocky = body.type.toLowerCase().includes('rocoso') || body.type.toLowerCase().includes('terrestre') || body.type.toLowerCase().includes('enano') || body.type.toLowerCase().includes('satélite') || body.type.toLowerCase().includes('desértico');

    let vShader = planetVertexShader;
    let fShader = rockyFragmentShader;
    
    let uniforms = {
      time: { value: 0 },
      sunPosition: { value: activeSunPosition }, // Point to actual parent star
      seed: { value: uniqueSeed },
      color1: { value: new THREE.Color(body.color) },
      color2: { value: new THREE.Color(body.color).multiplyScalar(0.5) },
      color3: { value: new THREE.Color(body.color).multiplyScalar(0.2) }
    };

    if (body.id === 'earth') {
      fShader = earthFragmentShader;
    } else if (body.id === 'venus') {
      fShader = venusFragmentShader;
      uniforms.color2 = { value: new THREE.Color('#ccaadd') }; // toxic clouds
    } else if (isGasGiant) {
      fShader = gasGiantFragmentShader;
      if (body.id === 'jupiter') {
        uniforms.color1 = { value: new THREE.Color('#ddaa77') };
        uniforms.color2 = { value: new THREE.Color('#bb7755') };
        uniforms.color3 = { value: new THREE.Color('#eeddcc') };
      } else if (body.id === 'saturn') {
        uniforms.color1 = { value: new THREE.Color('#eedd99') };
        uniforms.color2 = { value: new THREE.Color('#ccbb77') };
        uniforms.color3 = { value: new THREE.Color('#ffeeaa') };
      } else if (body.id === 'uranus') {
        uniforms.color1 = { value: new THREE.Color('#aaddff') };
        uniforms.color2 = { value: new THREE.Color('#88ccff') };
        uniforms.color3 = { value: new THREE.Color('#eeffff') };
      } else if (body.id === 'neptune') {
        uniforms.color1 = { value: new THREE.Color('#3355ff') };
        uniforms.color2 = { value: new THREE.Color('#1122aa') };
        uniforms.color3 = { value: new THREE.Color('#5588ff') };
      } else {
        uniforms.color1 = { value: new THREE.Color(body.color) };
        uniforms.color2 = { value: new THREE.Color(body.color).multiplyScalar(0.7) };
        uniforms.color3 = { value: new THREE.Color(body.color).multiplyScalar(1.3) };
      }
    } else {
      // Rocky
      if (body.id === 'mars') {
        uniforms.color1 = { value: new THREE.Color('#ff5522') };
        uniforms.color2 = { value: new THREE.Color('#aa3311') };
        uniforms.color3 = { value: new THREE.Color('#441100') };
      } else if (body.id === 'moon') {
        uniforms.color1 = { value: new THREE.Color('#aaaaaa') };
        uniforms.color2 = { value: new THREE.Color('#777777') };
        uniforms.color3 = { value: new THREE.Color('#333333') };
      } else if (body.id === 'mercury') {
        uniforms.color1 = { value: new THREE.Color('#b5a595') };
        uniforms.color2 = { value: new THREE.Color('#8a7b6e') };
        uniforms.color3 = { value: new THREE.Color('#4a4038') };
      } else if (body.id === 'pluto') {
        uniforms.color1 = { value: new THREE.Color('#dddddd') };
        uniforms.color2 = { value: new THREE.Color('#bbaaaa') };
        uniforms.color3 = { value: new THREE.Color('#887777') };
      } else if (body.id === 'io') {
        uniforms.color1 = { value: new THREE.Color('#e0c241') };
        uniforms.color2 = { value: new THREE.Color('#a08020') };
        uniforms.color3 = { value: new THREE.Color('#506020') }; // Sulfur spots
      } else if (body.id === 'europa') {
        uniforms.color1 = { value: new THREE.Color('#e6ebf0') };
        uniforms.color2 = { value: new THREE.Color('#aab0b5') };
        uniforms.color3 = { value: new THREE.Color('#807060') }; // Brownish ice cracks
      } else if (body.id === 'ganymede') {
        uniforms.color1 = { value: new THREE.Color('#9ca1a6') };
        uniforms.color2 = { value: new THREE.Color('#70757a') };
        uniforms.color3 = { value: new THREE.Color('#c0c5ca') }; // Bright impacts
      } else if (body.id === 'callisto') {
        uniforms.color1 = { value: new THREE.Color('#5a574e') };
        uniforms.color2 = { value: new THREE.Color('#3a372e') };
        uniforms.color3 = { value: new THREE.Color('#9a978e') }; // Very bright craters on dark surface
      } else if (body.id === 'titan') {
        uniforms.color1 = { value: new THREE.Color('#d9a13f') };
        uniforms.color2 = { value: new THREE.Color('#b07020') };
        uniforms.color3 = { value: new THREE.Color('#704010') };
      } else {
        uniforms.color1 = { value: new THREE.Color(body.color) };
        uniforms.color2 = { value: new THREE.Color(body.color).multiplyScalar(0.7) };
        uniforms.color3 = { value: new THREE.Color(body.color).multiplyScalar(0.3) };
      }
    }

    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vShader,
      fragmentShader: fShader
    });
  }, [body.id, body.type, body.color, isStar, body.isBlackHole]);

  // Set the texture for the night material once loaded
  if (earthNightMaterial && texture) {
    earthNightMaterial.uniforms.map.value = texture;
  }
  
  const orbitGroupRef = useRef();
  const satelliteGroupRef = useRef();
  const moonBaseGroupRef = useRef();
  
  const isDistantStar = body.distance && body.distance.includes('Años Luz');

  // Calculate orbit radius from initial position (only for solar system bodies)
  const orbitRadius = useMemo(() => {
    if (isDistantStar || body.id === 'sun' || body.isBlackHole) return 0;
    return Math.sqrt(body.position[0]**2 + body.position[1]**2 + body.position[2]**2);
  }, [body.position, isDistantStar, body.id, body.isBlackHole]);
  
  // Outer planets move slower
  const orbitSpeed = useMemo(() => {
    // Make orbital translation more noticeable but still realistic-ish relative
    return orbitRadius > 0 ? (1 / Math.sqrt(orbitRadius)) * 0.05 : 0;
  }, [orbitRadius]);

  const parentBody = useMemo(() => {
    if (body.orbits) {
      return celestialBodies.find(b => b.id === body.orbits);
    }
    return null;
  }, [body.orbits]);

  // Randomize initial moon orbit angles
  useEffect(() => {
    if (parentBody && orbitGroupRef.current) {
      // Use the body's size and distance as a deterministic seed for the angle
      // so it's consistent across renders, but looks random
      const pseudoRandomAngle = (body.size * 100 + (body.orbitDistance || 0) * 10) % (Math.PI * 2);
      orbitGroupRef.current.rotation.y = pseudoRandomAngle;
    }
  }, [parentBody, body.size, body.orbitDistance]);

  // Special rotation speeds based on planet (radians per second)
  const baseRotationSpeed = useMemo(() => {
    if (body.id === 'sun') return 0.02; // Very slow
    if (body.id === 'pulsar') return 30.0; // Crazy fast
    if (body.id === 'miller') return 0.01; // Tidally locked / extremely slow
    if (body.id === 'jupiter' || body.id === 'saturn') return 0.15; // Fast gas giants
    if (body.id === 'venus') return -0.01; // Retrograde and slow
    return 0.05; // Normal rocky (about 2 minutes per rotation at x1)
  }, [body.id]);
  useFrame((state, delta) => {
    // We use the same time scale variable to speed up cloud/star animations
    const animationSpeed = Math.min(10, timeScale); // Cap animation speed so shaders don't go crazy
    timeRef.current += delta * 0.1 * animationSpeed;
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (starMaterial) starMaterial.uniforms.time.value = timeRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (cloudMaterial) cloudMaterial.uniforms.time.value = timeRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (millerMaterial) millerMaterial.uniforms.time.value = timeRef.current * 0.2; // Slow waves
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (arrakisMaterial) arrakisMaterial.uniforms.time.value = timeRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (proceduralMaterial) proceduralMaterial.uniforms.time.value = timeRef.current;

    const scaledDelta = delta * timeScale;

    // Rotate the celestial body around its own axis
    if (meshRef.current) {
      meshRef.current.rotation.y += baseRotationSpeed * scaledDelta;
    }

    if (orbitGroupRef.current && orbitRadius > 0 && body.id !== 'sun' && !body.isFictional) {
      if (parentBody) {
        // This is a moon orbiting a parent body.
        // It always continues to orbit its parent even when focused.
        const moonOrbitSpeed = body.orbitSpeed || 0.2; // default if not provided
        orbitGroupRef.current.rotation.y += scaledDelta * moonOrbitSpeed;
        
        // Also we must rotate the Moon's base group to match parent's orbit around the sun.
        // ONLY do this if we are NOT locked onto a target, preventing the camera from whipping around.
        if (moonBaseGroupRef.current && !activeTarget) {
          const parentRadius = Math.sqrt((parentBody.position[0])**2 + (parentBody.position[2])**2);
          const parentOrbitSpeed = parentRadius > 0 ? (1 / Math.sqrt(parentRadius)) * 0.05 : 0;
          moonBaseGroupRef.current.rotation.y += scaledDelta * parentOrbitSpeed;
        }
      } else {
        // Main planets orbit the Sun ONLY when we are in Map mode (no active target).
        // If the user selects a planet, we freeze orbital movement so the camera doesn't spin wildly.
        if (!activeTarget) {
          orbitGroupRef.current.rotation.y += scaledDelta * orbitSpeed;
        }
      }
    }
    
    // Animate artificial satellite around Earth
    if (body.id === 'earth' && satelliteGroupRef.current) {
      satelliteGroupRef.current.rotation.y += scaledDelta * 1.5;
      satelliteGroupRef.current.rotation.z += scaledDelta * 0.5;
    }
  });

  // Calculate relative position. For the moon, it should be relative to Earth.
  const actualPosition = useMemo(() => {
    if (parentBody) {
      // Make Moon's local position relative to Parent so it orbits Parent.
      // Place it at a safe distance from Parent
      const dist = body.orbitDistance || 0.8;
      return [dist, 0.1, 0.0]; 
    }
    return body.position;
  }, [parentBody, body.orbitDistance, body.position]);

  // Determine the final group structure
  const renderBody = () => (
    <>
      {body.id === 'ringworld' ? (
        <group>
          {/* Local Artificial Star / Illumination for the Ringworld */}
          <pointLight color="#ffeedd" intensity={1000} distance={body.size * 10} decay={2} position={[0, body.size * 0.5, 0]} />
          {/* Secondary light for the outer hull */}
          <pointLight color="#4455aa" intensity={200} distance={body.size * 5} decay={2} position={[body.size * 2, -body.size, body.size * 2]} />
          
          <mesh
            ref={meshRef}
            onClick={(e) => { e.stopPropagation(); onClick(body); }}
            onPointerOver={() => document.body.style.cursor = 'pointer'}
            onPointerOut={() => document.body.style.cursor = 'auto'}
            rotation={[Math.PI / 4, 0, 0]}
          >
            <cylinderGeometry args={[body.size, body.size, body.size * 0.2, 128, 1, true]} />
            <meshStandardMaterial 
              color="#2244aa" 
              emissive="#001133"
              emissiveIntensity={0.5}
              side={THREE.BackSide} 
              roughness={0.7} 
            />
            {/* Outer hull */}
            <mesh>
              <cylinderGeometry args={[body.size * 1.01, body.size * 1.01, body.size * 0.21, 128, 1, true]} />
              <meshStandardMaterial 
                color="#333333" 
                emissive="#050505"
                emissiveIntensity={0.2}
                metalness={0.8} 
                roughness={0.2} 
                side={THREE.FrontSide} 
              />
            </mesh>
          </mesh>
        </group>
      ) : body.id === 'dyson-sphere' ? (
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onClick(body); }}
          onPointerOver={() => document.body.style.cursor = 'pointer'}
          onPointerOut={() => document.body.style.cursor = 'auto'}
        >
          <icosahedronGeometry args={[body.size, 4]} />
          <meshStandardMaterial 
            color="#111111" 
            metalness={0.9} 
            roughness={0.1}
            wireframe={true}
          />
          {/* Inner Star */}
          <mesh>
            <sphereGeometry args={[body.size * 0.95, 32, 32]} />
            <meshBasicMaterial color="#ffaa00" />
          </mesh>
        </mesh>
      ) : !isStar && !body.isBlackHole ? (
        <Sphere 
          args={[body.size, 64, 64]} 
          ref={meshRef}
          castShadow={body.id !== 'sun'} 
          receiveShadow={body.id !== 'sun'}
          onClick={(e) => {
            e.stopPropagation();
            onClick(body);
          }}
          onPointerOver={() => document.body.style.cursor = 'pointer'}
          onPointerOut={() => document.body.style.cursor = 'auto'}
        >
          {body.id === 'miller' ? (
            <primitive object={millerMaterial} attach="material" />
          ) : body.id === 'arrakis' ? (
            <primitive object={arrakisMaterial} attach="material" />
          ) : hasRealTexture ? (
            <>
              <meshStandardMaterial 
                map={texture} 
                roughness={0.8} 
                emissive={body.id === 'sun' ? body.color : '#000000'} 
                emissiveIntensity={body.id === 'sun' ? 4.0 : 0} 
              />
              
              {/* Earth Night Lights */}
              {body.id === 'earth' && earthNightMaterial && (
                <mesh material={earthNightMaterial}>
                  <sphereGeometry args={[body.size * 1.001, 64, 64]} />
                </mesh>
              )}

              {/* Atmosphere Glow (Fresnel) */}
              {body.hasAtmosphere && atmosphereMaterial && (
                <mesh material={atmosphereMaterial}>
                  <sphereGeometry args={[body.size * 1.02, 64, 64]} />
                </mesh>
              )}

              {/* Procedural Cloud Layer */}
              {body.hasAtmosphere && cloudMaterial && (
                <mesh material={cloudMaterial}>
                  <sphereGeometry args={[body.size * 1.01, 64, 64]} />
                </mesh>
              )}

              {/* Earth Satellite */}
              {body.id === 'earth' && (
                <group ref={satelliteGroupRef}>
                  <mesh position={[body.size * 1.2, 0, 0]}>
                    <boxGeometry args={[0.02, 0.01, 0.04]} />
                    <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
                    <mesh position={[0, 0, 0.03]}>
                      <boxGeometry args={[0.005, 0.05, 0.03]} />
                      <meshStandardMaterial color="#2244aa" metalness={0.9} roughness={0.1} />
                    </mesh>
                    <mesh position={[0, 0, -0.03]}>
                      <boxGeometry args={[0.005, 0.05, 0.03]} />
                      <meshStandardMaterial color="#2244aa" metalness={0.9} roughness={0.1} />
                    </mesh>
                  </mesh>
                </group>
              )}
            </>
          ) : proceduralMaterial ? (
            <primitive object={proceduralMaterial} attach="material" />
          ) : (
            <meshStandardMaterial 
              map={hasRealTexture ? texture : undefined} 
              color={hasRealTexture ? '#ffffff' : body.color} 
              roughness={body.id === 'earth' ? 0.6 : 0.8} 
              metalness={body.id === 'earth' ? 0.1 : 0.0}
            />
          )}
        </Sphere>
      ) : (
        <Sphere 
          args={[body.size, 64, 64]} 
          ref={meshRef}
          material={starMaterial}
          onClick={(e) => {
            e.stopPropagation();
            onClick(body);
          }}
          onPointerOver={() => document.body.style.cursor = 'pointer'}
          onPointerOut={() => document.body.style.cursor = 'auto'}
        >
        </Sphere>
      )}

      {body.id === 'jupiter' && (
        <mesh rotation={[-Math.PI / 2 + 0.05, 0, 0]} castShadow receiveShadow>
          <ringGeometry args={[body.size * 1.4, body.size * 1.6, 64]} />
          <meshStandardMaterial color="#eeddcc" side={THREE.DoubleSide} transparent opacity={0.3} roughness={0.9} />
        </mesh>
      )}

      {body.id === 'saturn' && (
        <mesh rotation={[-Math.PI / 2 + 0.4, 0, 0]} castShadow receiveShadow>
          <ringGeometry args={[body.size * 1.4, body.size * 2.4, 64]} />
          <meshStandardMaterial color="#c0b59b" side={THREE.DoubleSide} transparent opacity={0.6} roughness={0.9} />
        </mesh>
      )}
      {body.id === 'uranus' && (
        <mesh rotation={[-Math.PI / 2 + 1.7, 0, 0]}>
          <ringGeometry args={[body.size * 1.6, body.size * 1.9, 64]} />
          <meshStandardMaterial color="#88bbdd" side={THREE.DoubleSide} transparent opacity={0.3} roughness={0.9} />
        </mesh>
      )}


      
      {isLuminous && (
        <pointLight 
          castShadow={body.id === 'sun'} 
          shadow-mapSize={[2048, 2048]} 
          shadow-bias={-0.0001}
          // The sun mesh is yellow/orange, but the light it emits should be pure white 
          // so that planet textures (like Earth) are not tinted muddy green
          color={body.id === 'sun' ? '#ffffff' : body.color} 
          // Cap intensity to 1.5 so planets don't bloom with the lowered threshold
          intensity={Math.min(1.5, body.emissiveIntensity || 1.0)} 
          distance={body.size * 500} 
          decay={0.5} 
        />
      )}

      {isTarget && (
        <Html position={[0, body.size * 1.5, 0]} center>
          <div className="flex flex-col items-center pointer-events-none animate-bounce">
            <div className="w-1 h-8 bg-gradient-to-t from-accent to-transparent rounded-full mb-2"></div>
          </div>
        </Html>
      )}
    </>
  );

  const trailWidth = body.isFictional ? 0 : Math.max(0.5, body.size * 0.3);
  
  if (parentBody) {
    return (
      <group ref={moonBaseGroupRef}>
        <group position={parentBody.position}>
          <group ref={orbitGroupRef}>
            <group position={actualPosition} name={body.id}>
              {renderBody()}
            </group>
          </group>
        </group>
      </group>
    );
  }

  return (
    <group position={[0, 0, 0]}>
      <group ref={orbitGroupRef}>
        <group position={actualPosition} name={body.id}>
          {/* Main planet trail removed due to lag at high time speeds */}
          {renderBody()}
        </group>
      </group>
    </group>
  );
}
