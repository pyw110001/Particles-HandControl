import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ColorTheme } from '../types';

interface ParticleSystemProps {
  count: number;
  expansion: number; // 0 to 1
  isHovering: boolean; // Is hand detected
  rotation: number; // Hand rotation in radians
  theme: ColorTheme;
}

// Vertex Shader
const vertexShader = `
  uniform float uTime;
  uniform float uExpansion; // 0.0 (fist) to 1.0 (open)
  uniform float uHovering;
  uniform float uRotation;
  
  // Theme Colors passed as uniforms for instant updates
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  
  attribute float size;
  attribute float randomness;
  attribute float colorMix; // 0.0 to 1.0 determing position in gradient
  
  varying vec3 vColor;
  varying float vAlpha;

  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
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
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y
    i = mod289(i);
    vec4 p = permute( permute( permute( 
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)
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
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    // Base position
    vec3 pos = position;
    
    // DEMO MOVEMENT
    float noiseFreq = 0.5;
    vec3 noisePos = vec3(
      snoise(vec3(pos.x * noiseFreq + uTime * 0.2, pos.y * noiseFreq, pos.z * noiseFreq)),
      snoise(vec3(pos.x * noiseFreq, pos.y * noiseFreq + uTime * 0.2, pos.z * noiseFreq)),
      snoise(vec3(pos.x * noiseFreq, pos.y * noiseFreq, pos.z * noiseFreq + uTime * 0.2))
    );
    
    // INTERACTIVE STATES
    
    // 1. Contracted State (Fist): Implode to center + Dynamic Vortex
    // High density, need to pull them tight but keep some volume
    vec3 contractedBase = normalize(pos) * (0.8 + randomness * 0.4); 
    
    // Dynamic Vortex/Swirl when closed
    float fistDynamic = (1.0 - uExpansion); 
    // Spiral logic
    float angleSpiral = atan(pos.z, pos.x) + uTime * (2.0 + randomness);
    float radiusSpiral = length(pos.xz) * (0.2 + 0.8 * uExpansion);
    vec3 vortexPos = vec3(
       cos(angleSpiral) * radiusSpiral,
       pos.y * 0.5 + sin(uTime * 3.0 + pos.x) * 0.2 * fistDynamic,
       sin(angleSpiral) * radiusSpiral
    );
    
    // Add jitter
    vec3 jitter = vec3(
       snoise(vec3(pos.x, uTime * 3.0, pos.z)) * 0.1,
       snoise(vec3(uTime * 3.0, pos.y, pos.z)) * 0.1,
       snoise(vec3(pos.x, pos.y, uTime * 3.0)) * 0.1
    ) * fistDynamic;

    // Mix vortex into contracted state
    vec3 contractedPos = mix(contractedBase, vortexPos, 0.3 * fistDynamic) + jitter;
    
    // 2. Expanded State (Open Hand): Explode outwards
    // Spread them out significantly to reduce overexposure
    vec3 expandedPos = pos * (3.0 + randomness * 3.0) + noisePos * 1.5;
    
    // 3. Demo State
    vec3 demoPos = pos * 1.5 + noisePos * 0.8;

    vec3 finalPos;
    if (uHovering > 0.5) {
       finalPos = mix(contractedPos, expandedPos, uExpansion);
    } else {
       finalPos = demoPos;
    }
    
    // Rotations
    float angle = uTime * 0.1;
    if (uHovering > 0.5) {
      angle = uRotation;
    }
    
    float c = cos(angle);
    float s = sin(angle);
    mat3 rotZ = mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0);
    
    float yAngle = uTime * 0.05;
    mat3 rotY = mat3(cos(yAngle), 0.0, sin(yAngle), 0.0, 1.0, 0.0, -sin(yAngle), 0.0, cos(yAngle));
    
    finalPos = rotZ * (rotY * finalPos);
    
    // Color Calculation based on Uniforms
    vec3 baseC = uColor1;
    if (colorMix < 0.5) {
       baseC = mix(uColor1, uColor2, colorMix * 2.0);
    } else {
       baseC = mix(uColor2, uColor3, (colorMix - 0.5) * 2.0);
    }
    
    // Visual Enhancements
    float distToCenter = length(finalPos);
    
    // Brightness pulse
    float pulse = 0.8 + 0.2 * sin(uTime * 2.0 - distToCenter * 0.5 + randomness * 5.0);
    if (uHovering > 0.5 && uExpansion < 0.2) {
       pulse += 0.3 * sin(uTime * 15.0); // Flicker when compressed
    }
    
    vColor = baseC * pulse;
    
    // Calculate Alpha to prevent whiteout
    // When contracted (dense), alpha must be very low.
    // When expanded (spread), alpha can be higher.
    float densityAlpha = mix(0.02, 0.15, uExpansion); 
    if (uHovering < 0.5) densityAlpha = 0.08; // Demo mode default

    // Fade edges of the cluster
    float edgeFade = 1.0 - smoothstep(0.0, 8.0, distToCenter); 
    
    vAlpha = densityAlpha; // * edgeFade;

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Smaller point size multiplier (150.0 instead of 300.0)
    float twinkle = 0.8 + 0.2 * sin(uTime * 4.0 + randomness * 100.0);
    gl_PointSize = size * twinkle * (150.0 / -mvPosition.z);
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    // Soft circle particle
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    
    // Soft gradient from center of particle
    float particleAlpha = 1.0 - smoothstep(0.1, 0.5, dist);
    
    // Final alpha combines system density and particle softness
    gl_FragColor = vec4(vColor, vAlpha * particleAlpha);
  }
`;

const ParticleSystem: React.FC<ParticleSystemProps> = ({ count, expansion, isHovering, rotation, theme }) => {
  const meshRef = useRef<THREE.Points>(null);
  
  // Create particles data once - Geometry is static, visual changes handled by shaders
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colorMix = new Float32Array(count); // Replaces explicit colors
    const sizes = new Float32Array(count);
    const randomness = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Use Gaussian-like distribution for a denser core, lighter edges
      // Or keep spherical. Let's do a slightly randomized sphere.
      const r = 5 * Math.pow(Math.random(), 0.5); // Sqrt to push more to outside? No, cbrt is uniform. pow(x, 1/3).
      // Let's use a distribution that looks good for a nebula.
      // Normal distribution for X/Y/Z
      
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const rad = 4 * Math.cbrt(Math.random());

      positions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = rad * Math.cos(phi);

      colorMix[i] = Math.random(); // 0 to 1
      sizes[i] = Math.random() * 1.5 + 0.2; // slightly smaller min size
      randomness[i] = Math.random();
    }
    
    return { positions, colorMix, sizes, randomness };
  }, [count]); // Only recreate if count changes, ignore theme here

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uExpansion: { value: 0.5 },
    uHovering: { value: 0.0 },
    uRotation: { value: 0.0 },
    // Initialize with default colors
    uColor1: { value: new THREE.Color('#0F4C75') },
    uColor2: { value: new THREE.Color('#00CED1') },
    uColor3: { value: new THREE.Color('#7FFFD4') }
  }), []);

  // Update uniforms when theme changes
  useEffect(() => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uColor1.value.set(theme.start);
      material.uniforms.uColor2.value.set(theme.mid);
      material.uniforms.uColor3.value.set(theme.end);
    }
  }, [theme]);

  useFrame((state) => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
      
      material.uniforms.uExpansion.value = THREE.MathUtils.lerp(
        material.uniforms.uExpansion.value,
        expansion,
        0.1
      );

      material.uniforms.uHovering.value = THREE.MathUtils.lerp(
        material.uniforms.uHovering.value,
        isHovering ? 1.0 : 0.0,
        0.05
      );

      material.uniforms.uRotation.value = THREE.MathUtils.lerp(
        material.uniforms.uRotation.value,
        rotation,
        0.1
      );
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-colorMix"
          count={particles.colorMix.length}
          array={particles.colorMix}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particles.sizes.length}
          array={particles.sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-randomness"
          count={particles.randomness.length}
          array={particles.randomness}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        // Removed vertexColors={true} as we are calculating color in shader manually
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
      />
    </points>
  );
};

export default ParticleSystem;