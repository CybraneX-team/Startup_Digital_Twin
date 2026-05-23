# Dynamic Spectrum Recoloring for the 15‑Dimensional ORG Polytope

This upgrade preserves the entire geometry, topology, controls, projection system, and interaction model of the existing visualization while replacing the static department colors with a mathematically distributed spectral gradient.

The new color system:

- Assigns each department a hue based on its ordered vertex index.
- Produces a continuous rainbow‑style spectrum.
- Automatically adapts if the number of dimensions/nodes changes.
- Blends edge colors from connected vertices.
- Preserves the glowing warm ORG CORE.
- Maintains the dark cinematic background.

---

# Generalized N‑Node Ordering

The visualization now uses a fully procedural N‑node spectral system instead of a fixed department count.

The hue assignment is:

\[
\text{hue} = \left(\frac{nodeIndex}{N}\right) \times 360^\circ
\]

Where:

- `N` = total number of active nodes/vertices/dimensions.
- `nodeIndex` = zero‑based index of each node in the generated topology.

This formulation automatically adapts to:

- 15‑dimensional projections
- 24‑cell expansions
- Higher‑dimensional polytopes
- Runtime graph changes
- Dynamic topology generation

No hardcoded department count should exist anywhere in the implementation.

---

# Visual Parameters

| Property | Value |
|---|---|
| Saturation | 85% |
| Lightness | 65% |
| Background | #050b1a |
| ORG CORE Emission | #FFE6B3 |
| Hue Distribution | Evenly spaced |
| Edge Coloring | Averaged endpoint colors |

---

# Three.js Integration Strategy

The cleanest implementation is:

1. Pass a vertex index attribute into the shader.
2. Compute HSL color directly in the vertex shader.
3. Blend colors along edges.
4. Preserve all geometry and camera systems.

This keeps the system procedural and dimension‑independent.

---

# Vertex Attributes

Add a vertex index buffer:

```js
const N = vertices.length;

const nodeIndices = new Float32Array(N);

for (let i = 0; i < N; i++) {
  nodeIndices[i] = i;
}

geometry.setAttribute(
  'nodeIndex',
  new THREE.BufferAttribute(nodeIndices, 1)
);
```

---

# GLSL HSL → RGB Conversion

Use a perceptually balanced HSL conversion inside the shader.

```glsl
vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb = clamp(
        abs(mod(hsl.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0,
        0.0,
        1.0
    );

    rgb = rgb * rgb * (3.0 - 2.0 * rgb);

    float c = (1.0 - abs(2.0 * hsl.z - 1.0)) * hsl.y;

    return (rgb - 0.5) * c + hsl.z;
}
```

---

# Vertex Shader

```glsl
attribute float nodeIndex;

uniform float totalNodes;

varying vec3 vColor;

vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb = clamp(
        abs(mod(hsl.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0,
        0.0,
        1.0
    );

    rgb = rgb * rgb * (3.0 - 2.0 * rgb);

    float c = (1.0 - abs(2.0 * hsl.z - 1.0)) * hsl.y;

    return (rgb - 0.5) * c + hsl.z;
}

void main() {

    float hue = nodeIndex / totalNodes;

    vec3 hsl = vec3(
        hue,
        0.85,
        0.65
    );

    vColor = hsl2rgb(hsl);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

---

# Fragment Shader

```glsl
varying vec3 vColor;

void main() {
    gl_FragColor = vec4(vColor, 1.0);
}
```

---

# Shader Material

```js
const material = new THREE.ShaderMaterial({
  uniforms: {
    totalNodes: {
      value: N
    }
  },

  vertexShader,
  fragmentShader,

  transparent: false,
  vertexColors: true
});
```

---

# Edge Color Blending

For edges, compute the blended midpoint color.

## CPU‑Side Edge Coloring

```js
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5
      ? l * (1 + s)
      : l + s - l * s;

    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [r, g, b];
}
```

---

```js
function nodeHue(index, N) {
  return index / N;
}
```

---

```js
function blendedEdgeColor(a, b, N) {

  const hueA = nodeHue(a, N);
  const hueB = nodeHue(b, N);

  const avgHue = (hueA + hueB) * 0.5;

  return hslToRgb(avgHue, 0.85, 0.65);
}
```

This produces smooth spectral transitions along the topology.

---

# Optional Perceptual Refinement (CIEDE2000)

To improve local perceptual spacing:

1. Generate evenly distributed hues.
2. Convert HSL → LAB.
3. Compute CIEDE2000 between adjacent cyclic vertices.
4. Shift hue slightly toward under‑separated neighbors.
5. Clamp adjustment to ±5°.
6. Repeat 3–5 iterations.

Pseudo‑logic:

```js
for (let iteration = 0; iteration < 5; iteration++) {

  for (let i = 0; i < totalVertices; i++) {

    const next = (i + 1) % totalVertices;

    const delta = cie2000(colors[i], colors[next]);

    if (delta < threshold) {
      hues[i] += 0.01;
    } else {
      hues[i] -= 0.01;
    }
  }
}
```

This step is optional because the evenly distributed spectral mapping is already highly readable.

---

# ORG CORE Preservation

Keep the center node visually dominant.

```js
const coreMaterial = new THREE.MeshStandardMaterial({
  color: '#FFE6B3',
  emissive: '#FFE6B3',
  emissiveIntensity: 2.5
});
```

Retain:

- Pulsation animation.
- Glow bloom.
- Central anchoring.
- Warm contrast against cool spectral ring.

---

# Unchanged Systems

The following systems remain exactly unchanged:

- 15‑dimensional projection mathematics.
- 24‑cell or expanded topology.
- Vertex positioning.
- Edge connectivity.
- Rotation controls.
- Zoom controls.
- Focus interactions.
- Camera behavior.
- Scene composition.
- Dark background (#050b1a).
- High‑dimensional spatial aesthetic.

---

# Final Visual Result

The updated visualization becomes:

- A continuously flowing rainbow‑spectrum polytope.
- Procedurally scalable to arbitrary N‑node structures.
- Department or topology order encoded directly through hue progression.
- Perceptually smooth and mathematically structured.
- More readable than discrete categorical blocks.
- More futuristic and alive.
- Strongly aligned with high‑dimensional topology aesthetics.
- Automatically adaptive to dimensional expansion and runtime node changes.
- Stable under dynamic graph generation.
- Independent of fixed organizational layouts.

The structure remains analytical and geometric, while the new spectral encoding introduces motion, continuity, and hierarchy awareness through color alone.

