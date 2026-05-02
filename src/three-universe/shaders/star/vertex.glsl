// Star Vertex Shader — Enhanced solar surface
#include ../lib/noise.glsl

uniform float uTime;
uniform float uIntensity;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying vec2 vUv;
varying vec3 vLocalNormal;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vLocalNormal = normal; // undisplaced for surface detail sampling

  // Multi-octave solar turbulence — coarse convection + fine granulation + flare spikes
  float d1 = fbm5(normal * 2.2 + uTime * 0.12) * 0.22;
  float d2 = snoise(normal * 6.5 + uTime * 0.38) * 0.07;
  float d3 = snoise(normal * 15.0 + uTime * 0.85) * 0.022;

  // Solar flare spikes — rare, high-energy protrusions
  float flare = max(0.0, snoise(normal * 1.1 + uTime * 0.07) - 0.55);
  flare = flare * flare * 0.9;

  float displacement = (d1 + d2 + d3 + flare) * uIntensity;

  float pulse = sin(uTime * 1.1) * 0.012 + 1.0;
  vec3 newPosition = position * pulse + normal * displacement * length(position) * 0.018;
  vDisplacement = displacement;
  vPosition = newPosition;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
