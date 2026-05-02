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
      speed: 0.000035 + pseudoRand(idx, 127.1) * 0.000065,
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

  update(elapsed, zoomLevel) {
    if (this.material) {
      this.material.uniforms.uTime.value = elapsed;
      this.material.uniforms.uZoomLevel.value = zoomLevel;
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
  }
}
