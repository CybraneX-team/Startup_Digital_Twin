// Star Fragment Shader — Realistic solar surface
// Granulation + sunspots + limb darkening + plasma flows

#include ../lib/noise.glsl

uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying vec2 vUv;
varying vec3 vLocalNormal;

void main() {
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float NdotV = max(dot(normalize(vNormal), viewDir), 0.0);

  // === LIMB DARKENING (physically correct: edges darker on real stars) ===
  float limbDark = pow(NdotV, 0.35);  // subtle darkening toward edges

  // === GRANULATION (solar convection cells) ===
  // Two frequencies: large supergranules + small granules
  float gran1 = snoise(vLocalNormal * 9.0  + uTime * 0.04) * 0.5 + 0.5;
  float gran2 = snoise(vLocalNormal * 21.0 + uTime * 0.09) * 0.5 + 0.5;
  float gran3 = snoise(vLocalNormal * 45.0 + uTime * 0.18) * 0.5 + 0.5;
  float granulation = gran1 * 0.55 + gran2 * 0.30 + gran3 * 0.15;

  // === SUNSPOTS (dark magnetic field regions) ===
  float spotField = fbm3(vLocalNormal * 3.5 + vec3(uTime * 0.018, 0.0, uTime * 0.012));
  float spots = smoothstep(0.10, 0.28, spotField); // 0 = dark spot, 1 = bright surface
  float umbra  = smoothstep(0.04, 0.14, spotField); // darker inner region

  // === TEMPERATURE MAP ===
  // White-hot center of granules → orange-red cooler intergranular lanes
  vec3 hotColor   = vec3(1.00, 0.97, 0.80); // white-yellow photosphere
  vec3 midColor   = mix(hotColor, uColor * 1.3, 0.45);
  vec3 coolColor  = uColor * 0.55 + vec3(0.28, 0.08, 0.0);
  vec3 spotColor  = uColor * 0.25 + vec3(0.05, 0.02, 0.0); // dark umbra

  vec3 surfaceColor = mix(coolColor, hotColor, granulation);
  surfaceColor = mix(spotColor, surfaceColor, umbra);    // blend in spots
  surfaceColor = mix(surfaceColor, midColor, 0.2);       // tint toward industry color

  // === MAGNETIC PLASMA FLOWS (bright streaks near surface) ===
  float flow1 = fbm3(vLocalNormal * 6.0 - vec3(uTime * 0.09)) * 0.5 + 0.5;
  float flow2 = snoise(vLocalNormal * 12.0 + uTime * 0.22) * 0.5 + 0.5;
  float plasma = flow1 * flow2;
  vec3 plasmaColor = mix(uColor * 1.8, vec3(1.0, 0.75, 0.3), 0.5);
  surfaceColor = mix(surfaceColor, plasmaColor, plasma * 0.18);

  // === CORONA (outer glow — only visible at edges via fresnel) ===
  float fresnel = 1.0 - NdotV;
  fresnel = pow(fresnel, 1.5);
  vec3 coronaColor = uColor * 1.6 + vec3(0.5, 0.25, 0.0);

  // === ASSEMBLE ===
  vec3 finalColor = surfaceColor * limbDark * uIntensity;

  // Add displacement brightness (raised areas hotter)
  finalColor *= (1.0 + vDisplacement * 1.8);

  // Corona rim
  finalColor += coronaColor * fresnel * 0.7 * uIntensity;

  // Subtle pulse
  float pulse = sin(uTime * 1.6) * 0.04 + 0.96;
  finalColor *= pulse;

  gl_FragColor = vec4(clamp(finalColor, 0.0, 3.0), 1.0);
}
