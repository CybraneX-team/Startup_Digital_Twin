// @ts-nocheck
/**
 * GalaxyParticles.js — Pure Particle Galaxy
 * 
 * No sprites, no boxes — everything is shader-based points.
 * Logarithmic spiral arms with muted, realistic space colors.
 * Industry positions marked by denser/brighter particle clusters.
 */

import * as THREE from 'three';
import gsap from 'gsap';
import galaxyVertexShader from '../shaders/galaxy/vertex.glsl';
import galaxyFragmentShader from '../shaders/galaxy/fragment.glsl';

const PERSISTED_ANGLES: Record<string, number> = {};

export class GalaxyParticles {
  constructor(scene, industries) {
    this.scene = scene;
    this.industries = industries;
    this.particles = null;
    this.material = null;
    this.backgroundStars = null;

    // Dynamically generate orbital config for any number of industries
    const TAU = Math.PI * 2;
    const N = industries.length;
    const fract = x => x - Math.floor(x);
    const pseudoRand = (idx, salt) => fract(Math.abs(Math.sin(idx * salt) * 43758.5453));
    this.galaxyOrbitData = industries.map((ind, idx) => ({
      id: ind.id,
      angle: PERSISTED_ANGLES[ind.id] !== undefined ? PERSISTED_ANGLES[ind.id] : TAU * (idx / N),
      radius: 14000,
      speed: 0.000055,
      size: 2.5 + pseudoRand(idx, 311.7) * 0.8,
      inclination: 0,
      ascNode: 0,
    }));

    // Adaptive quality
    this.perfTier = this._detectPerf();
    const counts = {
      low: { galaxy: 10000,  bg: 400 },
      mid: { galaxy: 20000, bg: 800 },
      high: { galaxy: 30000, bg: 1200 },
    };
    this.counts = counts[this.perfTier];

    this.params = {
      arms: 4,
      radius: 400000,
      coreRadius: 2000,
      armTight: 0.8,
      armSpread: 0.1,
    };

    this._createGalaxy();
    this._createBackgroundStars();
    this._createUniverseSphere();
    this._createBlackHole();
    this._createBlackHoleInterior();
    this.onEnterBH = null;
    this.onExitBH  = null;
    this._insideBH = false;
  }

  _detectPerf() {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return 'low';
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const r = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL).toLowerCase() : '';
      if (r.includes('intel') || r.includes('mesa') || r.includes('swift')) return 'low';
      if (window.devicePixelRatio <= 1.5) return 'mid';
      return 'high';
    } catch { return 'mid'; }
  }

  _gauss() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  _createGalaxy() {
    const count = this.counts.galaxy;
    const p = this.params;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);
    const brightness = new Float32Array(count);

    // Muted, realistic space palette per industry — supports both raw and ind-prefixed IDs
    const palettes = {
      'technology':                 { h: 0.73, s: 0.45, l: 0.65 },
      'finance':                    { h: 0.44, s: 0.4, l: 0.6 },
      'manufacturing':              { h: 0.08, s: 0.35, l: 0.58 },
      'healthcare':                 { h: 0.97, s: 0.4, l: 0.62 },
      'education':                  { h: 0.6, s: 0.4, l: 0.65 },
      'media--entertainment':       { h: 0.07, s: 0.4, l: 0.62 },
      'commerce':                   { h: 0.9, s: 0.35, l: 0.65 },
      'energy--sustainability':     { h: 0.38, s: 0.35, l: 0.58 },
      'government--public-systems': { h: 0.55, s: 0.3, l: 0.55 },
      'mobility--transportation':   { h: 0.15, s: 0.4, l: 0.6 },
      'real-estate--infrastructure':{ h: 0.08, s: 0.3, l: 0.62 },
      'agriculture--food':          { h: 0.33, s: 0.4, l: 0.55 },
      // FounderOS ind-prefixed IDs
      'ind-saas':           { h: 0.73, s: 0.45, l: 0.65 },
      'ind-fintech':        { h: 0.44, s: 0.4, l: 0.6 },
      'ind-healthtech':     { h: 0.97, s: 0.4, l: 0.62 },
      'ind-edtech':         { h: 0.6, s: 0.4, l: 0.65 },
      'ind-ecommerce':      { h: 0.9, s: 0.35, l: 0.65 },
      'ind-aiml':           { h: 0.12, s: 0.45, l: 0.65 },
      'ind-cleantech':      { h: 0.38, s: 0.35, l: 0.58 },
      'ind-logistics':      { h: 0.15, s: 0.4, l: 0.6 },
      'ind-gaming':         { h: 0.07, s: 0.4, l: 0.62 },
      'ind-mobility':       { h: 0.15, s: 0.4, l: 0.6 },
      'ind-media':          { h: 0.07, s: 0.4, l: 0.62 },
      'ind-agritech':       { h: 0.33, s: 0.4, l: 0.55 },
      'ind-cyber':          { h: 0.68, s: 0.4, l: 0.6 },
      'ind-space':          { h: 0.48, s: 0.35, l: 0.6 },
      'ind-proptech':       { h: 0.08, s: 0.3, l: 0.62 },
    };

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Radial distribution — massive center bias, long infinite tail
      const t = Math.random();
      const dist = Math.pow(t, 2.0) * p.radius;

      // Spiral arm
      const armIdx = Math.floor(Math.random() * p.arms);
      const armBase = (armIdx / p.arms) * Math.PI * 2;
      const spiral = p.armTight * Math.log(Math.max(dist, 1)) * 3;
      
      // Deviation increases drastically further out (gas diffusion)
      const deviation = this._gauss() * p.armSpread * Math.max(0.2, (dist / 1000));
      const angle = armBase + spiral + deviation;

      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const thickness = 20 * Math.exp(-dist / (p.coreRadius));
      const y = this._gauss() * thickness;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      // Color — find nearest industry and apply muted palette
      const pAngle = Math.atan2(z, x);
      let nearest = this.industries[0];
      let nearDist = Infinity;
      for (const ind of this.industries) {
        let diff = Math.abs(pAngle - ind.angle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < nearDist) { nearDist = diff; nearest = ind; }
      }

      const pal = palettes[nearest.id] || { h: 0, s: 0, l: 0.7 };
      const ownership = Math.max(0, 1 - nearDist / (Math.PI / this.industries.length));

      const coreness = Math.max(0, 1 - dist / p.coreRadius);
      const color = new THREE.Color();

      // Core: warm tint, reduced brightness so it doesn't bloom white from industry view
      if (coreness > 0.3) {
        color.setHSL(
          0.1,
          0.15 * (1 - coreness),
          0.52 + coreness * 0.10  // ← TUNING: lower = dimmer core
        );
      } else {
        color.setHSL(
          pal.h + (Math.random() - 0.5) * 0.03,
          pal.s * (0.3 + ownership * 0.7) * 0.8,
          pal.l + (Math.random() - 0.5) * 0.1
        );
      }

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Size — bigger near core
      sizes[i] = (0.3 + Math.random() * 1.2) * (1 + coreness * 2.5);

      // Orbital speed — Keplerian
      speeds[i] = (0.008 + Math.random() * 0.012) / Math.max(Math.pow(dist / 40, 0.5), 0.3);

      // Brightness
      brightness[i] = 0.30 + Math.random() * 0.4 + coreness * 0.30;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: galaxyVertexShader,
      fragmentShader: galaxyFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 3.5 },
        uZoomLevel: { value: 0.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geo, this.material);
    this.scene.add(this.particles);
  }

  _createBackgroundStars() {
    const count = this.counts.bg;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 25000 + Math.random() * 15000; // Massively pushed back
      pos[i3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = r * Math.cos(phi);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xaaaacc,
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      fog: false,
    });

    this.backgroundStars = new THREE.Points(geo, mat);
    this.scene.add(this.backgroundStars);
  }

  _createUniverseSphere() {
    // Observable universe boundary sphere — camera maxDistance=30000, sphere at 32000
    // sizeAttenuation:false keeps particles as fixed screen-size dots regardless of distance
    const count = 1000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      // Shell just outside galaxy orbits (max 16000) — camera zooms out to 38000 to see it as a circle
      const r = 20000 + (Math.random() - 0.5) * 800;

      pos[i3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = r * Math.cos(phi);

      // Blue-white cosmic boundary color
      const tint = Math.random();
      if (tint < 0.55) {
        // Pure white
        col[i3] = 0.95; col[i3 + 1] = 0.95; col[i3 + 2] = 1.0;
      } else if (tint < 0.80) {
        // Blue-white
        col[i3] = 0.6 + Math.random() * 0.2;
        col[i3 + 1] = 0.75 + Math.random() * 0.15;
        col[i3 + 2] = 1.0;
      } else {
        // Soft purple
        col[i3] = 0.7 + Math.random() * 0.2;
        col[i3 + 1] = 0.5 + Math.random() * 0.2;
        col[i3 + 2] = 1.0;
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      size: 6.0,
      fog: false,
    });

    this.universeSphere = new THREE.Points(geo, mat);
    this.scene.add(this.universeSphere);
  }

  _createBlackHole() {
    const EH_R  = 900;    // event horizon radius
    const IN_R  = 1050;   // disk inner edge
    const OUT_R = 5200;   // disk outer edge (wider for particle spread)

    const group = new THREE.Group();

    // ── Event horizon ──────────────────────────────────────────────────
    // renderOrder 999 + depthTest:false → paints black over EVERY pixel
    // in its silhouette (particles, stars, disk, whatever rendered before).
    // depthWrite:true → writes depth so ring/arc can test against it.
    const ehMesh = new THREE.Mesh(
      new THREE.SphereGeometry(EH_R, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,   // transparent bucket → renders AFTER disk/particles
        opacity: 1.0,
        depthWrite: true,
        depthTest: false,
      }),
    );
    ehMesh.renderOrder = 999;
    group.add(ehMesh);


    this._bhGroup = group;
    this.scene.add(group);

    // Accretion disk as particle system (added after group is in scene)
    this._createAccretionParticles(EH_R, IN_R, OUT_R);
  }

  _createAccretionParticles(EH_R: number, IN_R: number, OUT_R: number) {
    const COUNT       = 7000;
    const NUM_ARMS    = 5;       // 5 spiral arms
    const ARM_TIGHT   = 2.6;    // logarithmic spiral tightness

    const aR     = new Float32Array(COUNT);
    const aA0    = new Float32Array(COUNT);
    const aSpd   = new Float32Array(COUNT);
    const aSize  = new Float32Array(COUNT);
    const aColor = new Float32Array(COUNT * 3);

    // Box-Muller gaussian
    const gauss = () => {
      let u = 0, v = 0;
      while (!u) u = Math.random();
      while (!v) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    for (let i = 0; i < COUNT; i++) {
      // Strong inner bias: pow² → most particles near inner edge,
      // counts drop sharply toward outer edge.
      const t = Math.pow(Math.random(), 2.2);
      const r = IN_R + (OUT_R - IN_R) * t;
      aR[i] = r;

      // Place on a logarithmic spiral arm
      const arm = Math.floor(Math.random() * NUM_ARMS);
      const armBase    = (arm / NUM_ARMS) * Math.PI * 2;
      const spiralAng  = armBase + ARM_TIGHT * Math.log(r / IN_R);

      // Angular scatter: zero at inner edge, broadens outward
      const scatter = gauss() * 0.22 * Math.pow(t, 0.55);
      aA0[i] = spiralAng + scatter;

      // Keplerian: ω ∝ r^(-3/2), scaled for visual speed
      aSpd[i] = 0.11 / Math.sqrt(r / IN_R);

      // Smaller tight particles inner, larger diffuse outer
      aSize[i] = 0.5 + t * 2.8;

      // Color: white-yellow (inner) → orange → dark red (outer)
      let cr: number, cg: number, cb: number;
      if (t < 0.28) {
        const lt = t / 0.28;
        cr = 1.00; cg = 0.90 - lt * 0.50; cb = 0.65 - lt * 0.58;
      } else if (t < 0.62) {
        const lt = (t - 0.28) / 0.34;
        cr = 1.00; cg = 0.40 - lt * 0.26; cb = 0.07;
      } else {
        const lt = (t - 0.62) / 0.38;
        cr = 0.95 - lt * 0.52; cg = 0.14 - lt * 0.12; cb = 0.07;
      }
      const j = (Math.random() - 0.5) * 0.10;
      aColor[i * 3]     = Math.min(1, Math.max(0, cr + j));
      aColor[i * 3 + 1] = Math.min(1, Math.max(0, cg + j * 0.4));
      aColor[i * 3 + 2] = Math.min(1, Math.max(0, cb));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    geo.setAttribute('aR',     new THREE.BufferAttribute(aR,    1));
    geo.setAttribute('aA0',    new THREE.BufferAttribute(aA0,   1));
    geo.setAttribute('aSpd',   new THREE.BufferAttribute(aSpd,  1));
    geo.setAttribute('aSize',  new THREE.BufferAttribute(aSize, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:       { value: 0 },
        uPixelRatio: { value: window.devicePixelRatio || 1 },
        uInner:      { value: IN_R },
        uOuter:      { value: OUT_R },
      },
      vertexShader: `
        attribute float aR;
        attribute float aA0;
        attribute float aSpd;
        attribute float aSize;
        attribute vec3  aColor;

        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uInner;
        uniform float uOuter;

        varying vec3  vColor;
        varying float vAlpha;

        void main() {
          float angle = aA0 - uTime * aSpd;

          float x = aR * cos(angle);
          float z = aR * sin(angle);

          // Vertical scatter: thin disk, thickens slightly outward
          float t = (aR - uInner) / (uOuter - uInner);
          float ySpread = 28.0 + t * 90.0;
          float y = sin(aA0 * 4.9 + aR * 0.0007) * ySpread * 0.5;

          vec4 mvPos    = modelViewMatrix * vec4(x, y, z, 1.0);
          float camDist = max(-mvPos.z, 1.0);

          float sz = uPixelRatio * aSize * (8000.0 / camDist);
          gl_PointSize = clamp(sz, 0.5, 10.0 * uPixelRatio);
          gl_Position  = projectionMatrix * mvPos;

          // Doppler brightening (relativistic approximation)
          float doppler = 0.55 + 0.45 * cos(angle);
          // Alpha: strong falloff at outer edge → sparse rim feel
          vAlpha  = pow(1.0 - t, 1.80) * (0.55 + 0.45 * doppler);
          vColor  = aColor * (0.75 + 0.50 * doppler);
        }
      `,
      fragmentShader: `
        varying vec3  vColor;
        varying float vAlpha;
        void main() {
          vec2  uv = gl_PointCoord - 0.5;
          float d  = length(uv);
          if (d > 0.5) discard;
          float soft = 1.0 - smoothstep(0.08, 0.50, d);
          gl_FragColor = vec4(vColor, vAlpha * soft);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this._bhAccretionMat = mat;
    this._bhAccretionGeo = geo;
    this._bhGroup.add(new THREE.Points(geo, mat));
  }

  _createBlackHoleInterior() {
    const EH_R = 900;
    const group = new THREE.Group();

    // ── BackSide occluder ──────────────────────────────────────────────
    // Rendered only from inside (back faces face inward toward camera).
    // depthTest:false + renderOrder 998 → paints solid black over every
    // external object (disk, stars, industries) when camera is inside.
    const occluder = new THREE.Mesh(
      new THREE.SphereGeometry(EH_R * 0.99, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.BackSide,
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
        depthTest: false,
      }),
    );
    occluder.renderOrder = 998;
    group.add(occluder);

    // ── Pulsing edge shader ────────────────────────────────────────────
    const makeEdgeMat = (r: number, g: number, b: number) =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uAlpha: { value: 0.0 } },
        vertexShader: `
          uniform float uTime;
          varying float vGlow;
          void main() {
            float phase = position.x * 0.003 + position.y * 0.002 + position.z * 0.003;
            vGlow = 0.5 + 0.5 * sin(phase * 6.283 + uTime * 2.2);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uAlpha;
          varying float vGlow;
          void main() {
            gl_FragColor = vec4(${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)},
                                uAlpha * (0.55 + 0.45 * vGlow));
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

    // Outer icosahedron (detail=1 → denser edge mesh)
    const icoMat = makeEdgeMat(0.50, 0.20, 1.00); // purple
    const ico = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(670, 1)), icoMat);
    ico.renderOrder = 1001;
    group.add(ico);

    // Middle dodecahedron
    const dodMat = makeEdgeMat(0.10, 0.80, 1.00); // cyan
    const dod = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.DodecahedronGeometry(440)), dodMat);
    dod.renderOrder = 1001;
    group.add(dod);

    // Inner octahedron
    const octMat = makeEdgeMat(1.00, 0.25, 0.65); // magenta-pink
    const oct = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.OctahedronGeometry(230)), octMat);
    oct.renderOrder = 1001;
    group.add(oct);

    // Central singularity glow
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xaa33ff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(55, 16, 16), coreMat);
    core.renderOrder = 1002;
    group.add(core);

    this._bhInteriorGroup  = group;
    this._bhIcoMesh = ico;  this._bhDodMesh = dod;  this._bhOctMesh = oct;
    this._bhInteriorMats   = [icoMat, dodMat, octMat];
    this._bhSingularityMat = coreMat;

    this.scene.add(group);
  }

  _transitionBHInterior(enter: boolean) {
    const dur = 1.2;
    const ease = 'power2.inOut';

    if (enter) {
      this._bhInteriorGroup.visible = true;
      for (const m of this._bhInteriorMats) {
        gsap.killTweensOf(m.uniforms.uAlpha);
        gsap.to(m.uniforms.uAlpha, { value: 0.80, duration: dur, ease });
      }
      gsap.killTweensOf(this._bhSingularityMat);
      gsap.to(this._bhSingularityMat, {
        opacity: 0.75, duration: dur, ease,
        onUpdate: () => { this._bhSingularityMat.needsUpdate = true; },
      });
      // Fade out galaxy elements
      if (this.material)
        gsap.to(this.material.uniforms.uSize, { value: 0, duration: dur * 0.5, ease });
      if (this.backgroundStars?.material) {
        const m = this.backgroundStars.material as THREE.PointsMaterial;
        gsap.to(m, { opacity: 0, duration: dur * 0.5, ease,
          onUpdate: () => { m.needsUpdate = true; } });
      }
      if (this.universeSphere?.material) {
        const m = this.universeSphere.material as THREE.PointsMaterial;
        gsap.to(m, { opacity: 0, duration: dur * 0.5, ease,
          onUpdate: () => { m.needsUpdate = true; } });
      }
      this.onEnterBH?.();
    } else {
      for (const m of this._bhInteriorMats) {
        gsap.killTweensOf(m.uniforms.uAlpha);
        gsap.to(m.uniforms.uAlpha, {
          value: 0, duration: dur * 0.5, ease,
          onComplete: () => { this._bhInteriorGroup.visible = false; },
        });
      }
      gsap.to(this._bhSingularityMat, {
        opacity: 0, duration: dur * 0.5, ease,
        onUpdate: () => { this._bhSingularityMat.needsUpdate = true; },
      });
      // Restore galaxy elements
      if (this.material)
        gsap.to(this.material.uniforms.uSize, { value: 3.5, duration: dur, ease });
      if (this.backgroundStars?.material) {
        const m = this.backgroundStars.material as THREE.PointsMaterial;
        gsap.to(m, { opacity: 0.40, duration: dur, ease,
          onUpdate: () => { m.needsUpdate = true; } });
      }
      if (this.universeSphere?.material) {
        const m = this.universeSphere.material as THREE.PointsMaterial;
        gsap.to(m, { opacity: 0.90, duration: dur, ease,
          onUpdate: () => { m.needsUpdate = true; } });
      }
      this.onExitBH?.();
    }
  }

  getIndustryPosition(idx, target) {
    const d = this.galaxyOrbitData[idx];
    const ox = Math.cos(d.angle) * d.radius;
    const oz = Math.sin(d.angle) * d.radius;
    if (target) { target.set(ox, 0, oz); return target; }
    return new THREE.Vector3(ox, 0, oz);
  }

  advanceOrbits() {
    this.galaxyOrbitData.forEach(d => { 
      d.angle += d.speed; 
      PERSISTED_ANGLES[d.id] = d.angle;
    });
  }

  getSizeMultiplier(idx) {
    return this.galaxyOrbitData[idx].size;
  }

  update(elapsed, zoomLevel, camPos?: THREE.Vector3) {
    if (this.material) {
      this.material.uniforms.uTime.value = elapsed;
      this.material.uniforms.uZoomLevel.value = zoomLevel;
    }
    // Animate accretion particle disk
    if (this._bhAccretionMat) this._bhAccretionMat.uniforms.uTime.value = elapsed;

    // Black hole interior — camera-inside detection
    if (camPos && this._bhInteriorGroup) {
      const EH_R = 900;
      const inside = camPos.lengthSq() < EH_R * EH_R;
      if (inside !== this._insideBH) {
        this._insideBH = inside;
        this._transitionBHInterior(inside);
      }
      if (inside && this._bhInteriorMats) {
        for (const m of this._bhInteriorMats) m.uniforms.uTime.value = elapsed;
        this._bhIcoMesh.rotation.y += 0.0007;
        this._bhIcoMesh.rotation.x += 0.0003;
        this._bhDodMesh.rotation.y -= 0.0005;
        this._bhDodMesh.rotation.z += 0.00020;
        this._bhOctMesh.rotation.x += 0.0015;
        this._bhOctMesh.rotation.y += 0.0010;
      }
    }
  }

  setVisible(v) {
    if (this.particles) this.particles.visible = v;
    if (this.backgroundStars) this.backgroundStars.visible = v;
    if (this.universeSphere) this.universeSphere.visible = v;
  }

  /** Fully hide spiral + bg stars + universe sphere (subdomain level) */
  setSubdomainLevel(inside, dur = 2.8) {
    const ease = 'power3.inOut';
    // ShaderMaterial — animate uSize to 0
    if (this.material) {
      gsap.killTweensOf(this.material.uniforms.uSize);
      gsap.to(this.material.uniforms.uSize, { value: inside ? 0 : 3.5, duration: dur, ease });
    }
    // Background stars
    if (this.backgroundStars) {
      const m = this.backgroundStars.material;
      this.backgroundStars.visible = true;
      gsap.killTweensOf(m);
      gsap.to(m, { opacity: inside ? 0 : 0.40, duration: dur, ease,
        onUpdate: () => { m.needsUpdate = true; },
        onComplete: () => { if (inside) this.backgroundStars.visible = false; },
      });
    }
    // Universe sphere (outer star shell)
    if (this.universeSphere) {
      const m = this.universeSphere.material;
      this.universeSphere.visible = true;
      gsap.killTweensOf(m);
      gsap.to(m, { opacity: inside ? 0 : 0.9, duration: dur * 0.7, ease,
        onUpdate: () => { m.needsUpdate = true; },
        onComplete: () => { if (inside) this.universeSphere.visible = false; },
      });
    }
  }

  /** Shrink particles when inside an industry — restore at galaxy level */
  setInsideIndustry(inside) {
    const dur = 2.8;
    const ease = 'power3.inOut';

    if (this.material) {
      gsap.killTweensOf(this.material.uniforms.uSize);
      gsap.to(this.material.uniforms.uSize, { value: inside ? 1 : 3.5, duration: dur, ease });
    }

    if (this.backgroundStars) {
      const m = this.backgroundStars.material;
      this.backgroundStars.visible = true;
      gsap.killTweensOf(m);
      gsap.to(m, { size: inside ? 3.5 : 1.5, opacity: inside ? 0.55 : 0.40, duration: dur, ease,
        onUpdate: () => { m.needsUpdate = true; },
      });
    }

    // Universe sphere dims but stays visible inside industry
    if (this.universeSphere) {
      const m = this.universeSphere.material;
      this.universeSphere.visible = true;
      gsap.killTweensOf(m);
      gsap.to(m, { opacity: inside ? 0.15 : 0.9, duration: dur, ease,
        onUpdate: () => { m.needsUpdate = true; },
      });
    }
  }

  dispose() {
    if (this.particles) { this.particles.geometry.dispose(); this.material.dispose(); this.scene.remove(this.particles); }
    if (this.backgroundStars) { this.backgroundStars.geometry.dispose(); this.backgroundStars.material.dispose(); this.scene.remove(this.backgroundStars); }
    if (this.universeSphere) { this.universeSphere.geometry.dispose(); this.universeSphere.material.dispose(); this.scene.remove(this.universeSphere); }
    if (this._bhGroup)         this.scene.remove(this._bhGroup);
    if (this._bhAccretionMat)  this._bhAccretionMat.dispose();
    if (this._bhAccretionGeo)  this._bhAccretionGeo.dispose();
    if (this._bhInteriorGroup) this.scene.remove(this._bhInteriorGroup);
    if (this._bhInteriorMats)  this._bhInteriorMats.forEach(m => m.dispose());
  }
}
