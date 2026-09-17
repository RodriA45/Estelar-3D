import * as THREE from 'three';

// --------------------------------------------------------
// COMMON NOISE FUNCTIONS (Simplex 3D)
// --------------------------------------------------------
const noiseCommon = `
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

  // Fractional Brownian Motion
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
`;

// --------------------------------------------------------
// COMMON LIGHTING FUNCTION
// --------------------------------------------------------
const lightingCommon = `
  vec3 calculateLighting(vec3 color, vec3 normal, vec3 sunDirection) {
    // Diffuse lighting
    float diff = max(dot(normal, sunDirection), 0.0);
    
    // Ambient light (very dark space)
    vec3 ambient = color * 0.02;
    
    // Diffuse light (bright side)
    vec3 diffuse = color * diff;
    
    return ambient + diffuse;
  }
`;

// --------------------------------------------------------
// COMMON VERTEX SHADER
// --------------------------------------------------------
export const planetVertexShader = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
void main() {
    vUv = uv;
    vPosition = position;
    // Calculate normal in world space for lighting
    vNormal = normalize(mat3(modelMatrix) * normal);
    
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    
    gl_Position = projectionMatrix * viewMatrix * worldPos;
    #include <logdepthbuf_vertex>
  }
`;

// --------------------------------------------------------
// 1. GAS GIANT SHADER (Jupiter, Saturn, Uranus, Neptune)
// --------------------------------------------------------
export const gasGiantFragmentShader = `
  uniform vec3 color1; // Base color
  uniform vec3 color2; // Band color 1
  uniform vec3 color3; // Band color 2
  uniform float time;
  uniform vec3 sunPosition;
  uniform float seed;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  #include <logdepthbuf_pars_fragment>
${noiseCommon}
  ${lightingCommon}
  
  void main() {
    // Base bands using the Y coordinate (latitude)
    float lat = vPosition.y;
    
    // Create turbulent banded noise
    vec3 p = vPosition * 4.0 + vec3(seed);
    
    // Domain warping to create storms and swirls
    float q = fbm(p + vec3(0.0, time * 0.05, 0.0));
    float r = fbm(p + vec3(q * 4.0, lat * 2.0, time * -0.03));
    
    // Main bands
    float bands = sin(lat * 15.0 + r * 2.0) * 0.5 + 0.5;
    
    // Sub-bands
    float subBands = snoise(vec3(0.0, lat * 30.0, 0.0)) * 0.5 + 0.5;
    
    // Mix colors based on bands
    vec3 finalColor = mix(color1, color2, bands);
    finalColor = mix(finalColor, color3, subBands * 0.5);
    
    // Add some overall noise for texture
    float fineNoise = snoise(vPosition * 20.0) * 0.05;
    finalColor += vec3(fineNoise);
    
    // Lighting
    vec3 sunDirection = normalize(sunPosition - vWorldPosition);
    vec3 litColor = calculateLighting(finalColor, vNormal, sunDirection);
    
    // Dim the color slightly so it doesn't trigger the HDR bloom effect (threshold 0.85)
    litColor *= 0.6;
    gl_FragColor = vec4(litColor, 1.0);
    #include <logdepthbuf_fragment>
}
`;

// --------------------------------------------------------
// 2. ROCKY PLANET SHADER (Mercury, Mars, Moon, Pluto)
// --------------------------------------------------------
export const rockyFragmentShader = `
  uniform vec3 color1; // Base color (e.g. Red for Mars)
  uniform vec3 color2; // Secondary color (e.g. Dark Red/Brown)
  uniform vec3 color3; // Crater color (e.g. Dark Grey/Black)
  uniform vec3 sunPosition;
  uniform float seed;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  #include <logdepthbuf_pars_fragment>
${noiseCommon}
  ${lightingCommon}
  
  void main() {
    vec3 p = normalize(vPosition) * 5.0 + vec3(seed);
    
    // Base elevation noise
    float elevation = fbm(p);
    
    // Craters (inverse ridged noise approximation)
    float craters = abs(snoise(p * 2.5));
    craters = smoothstep(0.1, 0.3, craters);
    
    // Mix base colors based on elevation
    vec3 finalColor = mix(color1, color2, elevation * 0.5 + 0.5);
    
    // Apply craters
    finalColor = mix(color3, finalColor, craters);
    
    // Small high-frequency noise for rocky texture
    float rocky = fbm(p * 10.0);
    finalColor *= (0.8 + rocky * 0.4);
    
    // Lighting
    vec3 sunDirection = normalize(sunPosition - vWorldPosition);
    
    // Fake bump mapping based on noise
    vec3 bumpedNormal = normalize(vNormal + vec3(rocky * 0.1, elevation * 0.1, 0.0));
    
    vec3 litColor = calculateLighting(finalColor, bumpedNormal, sunDirection);
    
    // Dim the color slightly so it doesn't trigger the HDR bloom effect (threshold 0.85)
    litColor *= 0.6;
    gl_FragColor = vec4(litColor, 1.0);
    #include <logdepthbuf_fragment>
}
`;

// --------------------------------------------------------
// 3. EARTH SHADER
// --------------------------------------------------------
export const earthFragmentShader = `
  uniform float time;
  uniform vec3 sunPosition;
  uniform float seed;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  #include <logdepthbuf_pars_fragment>
${noiseCommon}
  ${lightingCommon}
  
  void main() {
    vec3 p = normalize(vPosition) * 3.0 + vec3(seed);
    
    // Continents vs Oceans mask
    float mask = fbm(p);
    
    vec3 waterColor = vec3(0.0, 0.15, 0.4);
    vec3 shallowWaterColor = vec3(0.1, 0.3, 0.6);
    vec3 landColor = vec3(0.1, 0.4, 0.1);
    vec3 mountainColor = vec3(0.4, 0.3, 0.2);
    vec3 snowColor = vec3(0.9, 0.9, 1.0);
    
    vec3 finalColor;
    float spec = 0.0;
    
    if (mask < 0.0) {
      // Water
      float depth = smoothstep(-1.0, 0.0, mask);
      finalColor = mix(waterColor, shallowWaterColor, depth);
      spec = 0.8; // Water is shiny
    } else {
      // Land
      float elevation = fbm(p * 2.0);
      finalColor = mix(landColor, mountainColor, smoothstep(0.0, 0.5, mask));
      
      // Peaks get snow
      if (mask > 0.4 && elevation > 0.2) {
        finalColor = mix(finalColor, snowColor, smoothstep(0.4, 0.6, mask));
      }
      spec = 0.1; // Land is matte
    }
    
    // Clouds
    float cloudNoise = fbm((p + vec3(time * 0.02, 0.0, 0.0)) * 3.0);
    float cloudAlpha = smoothstep(0.2, 0.7, cloudNoise);
    vec3 cloudColor = vec3(1.0);
    
    // Mix clouds over planet
    finalColor = mix(finalColor, cloudColor, cloudAlpha * 0.9);
    
    // Lighting
    vec3 sunDirection = normalize(sunPosition - vWorldPosition);
    
    // Diffuse
    float diff = max(dot(vNormal, sunDirection), 0.0);
    vec3 diffuse = finalColor * diff;
    
    // Specular (for oceans)
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 reflectDir = reflect(-sunDirection, vNormal);
    float specAmount = pow(max(dot(viewDir, reflectDir), 0.0), 16.0);
    vec3 specular = vec3(1.0) * specAmount * spec * (1.0 - cloudAlpha); // No spec where clouds are
    
    vec3 ambient = finalColor * 0.02;
    
    vec3 litColor = ambient + diffuse + specular;
    
    // Dim the color slightly so it doesn't trigger the HDR bloom effect (threshold 0.85)
    litColor *= 0.6;
    gl_FragColor = vec4(litColor, 1.0);
    #include <logdepthbuf_fragment>
}
`;

// --------------------------------------------------------
// 4. VENUS SHADER
// --------------------------------------------------------
export const venusFragmentShader = `
  uniform float time;
  uniform vec3 color1;
  uniform vec3 color3;
  uniform vec3 sunPosition;
  uniform float seed;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  #include <logdepthbuf_pars_fragment>
${noiseCommon}
  ${lightingCommon}
  
  void main() {
    vec3 p = normalize(vPosition) * 3.0 + vec3(seed);
    
    // Dense swirling atmosphere
    float q = fbm(p + vec3(time * 0.02));
    float r = fbm(p + vec3(q * 2.0, 0.0, time * -0.01));
    
    // Swirls
    float clouds = fbm(p * r * 3.0);
    
    vec3 finalColor = mix(color1, color2, clouds * 0.5 + 0.5);
    
    // Add fine toxic swirls
    float fineSwirl = snoise(p * 10.0 + time * 0.05);
    finalColor += vec3(fineSwirl * 0.05);
    
    // Lighting
    vec3 sunDirection = normalize(sunPosition - vWorldPosition);
    vec3 litColor = calculateLighting(finalColor, vNormal, sunDirection);
    
    // Dim the color slightly so it doesn't trigger the HDR bloom effect (threshold 0.85)
    litColor *= 0.6;
    gl_FragColor = vec4(litColor, 1.0);
    #include <logdepthbuf_fragment>
}
`;
