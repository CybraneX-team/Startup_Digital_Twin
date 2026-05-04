// @ts-nocheck
/**
 * SubdomainSolarSystem.js
 * Built fresh on every subdomain entry at world origin (0,0,0).
 * Sun (star shader) + company planets + local star field.
 */

import * as THREE from 'three';
import gsap from 'gsap';
import starVertexShader   from '../shaders/star/vertex.glsl';
import starFragmentShader from '../shaders/star/fragment.glsl';
import atmVert from '../shaders/atmosphere/vertex.glsl';
import atmFrag from '../shaders/atmosphere/fragment.glsl';
import { TextureGenerator } from '../engine/TextureGenerator.js';

let _glowTex = null;
const getGlow = () => {
  if (!_glowTex) _glowTex = new THREE.CanvasTexture(TextureGenerator.createGlowTexture(128));
  return _glowTex;
};

export class SubdomainSolarSystem {
  constructor(scene) {
    this.scene  = scene;
    this.group  = null;
    this._sunMat = null;
    this._containers = [];   // { container, orbitRadius, angle, speed }
    this._atmoMats   = [];
    this.companyMeshes = [];  // exposed for raycasting
  }

  // ── BUILD ────────────────────────────────────────────────────────────────
  build(subdomain, industry) {
    this.destroy();

    this.group = new THREE.Group();
    this._containers   = [];
    this._atmoMats     = [];
    this.companyMeshes = [];
    this.active = true;

    const color = new THREE.Color(industry.color);

    // ─ SUN ─
    const sunMat = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uTime:      { value: 0 },
        uColor:     { value: color.clone() },
        uIntensity: { value: 0.65 },
      },
    });
    this._sunMat = sunMat;
    const sun = new THREE.Mesh(new THREE.IcosahedronGeometry(28, 3), sunMat);
    this.group.add(sun);

    // Sun glow sprite — keep small so company planets aren't swallowed
    const glowSpr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlow(), color, transparent: true, opacity: 0.65,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glowSpr.scale.set(75, 75, 1);
    this.group.add(glowSpr);

    // Point light from sun
    this.group.add(new THREE.PointLight(color.getHex(), 1.4, 900, 2.0));

    // Ambient light so dark sides of planets are still visible
    this.group.add(new THREE.AmbientLight(0x223344, 0.8));

    // ─ COMPANY PLANETS ─
    const companies = subdomain.companies || [];
    const maxEmp    = Math.max(...companies.map(c => c.employees || 1), 1);

    companies.forEach((company, idx) => {
      const orbitRadius = 130 + idx * 75;
      const angle = (idx / companies.length) * Math.PI * 2;
      const speed = 3.0 / Math.sqrt(orbitRadius); // rad/sec — inner ~25s rev, outer ~50s

      const container = new THREE.Group();
      container.position.set(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius);

      const r = 8 + ((company.employees || 0) / maxEmp) * 12;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 32, 32),
        new THREE.MeshStandardMaterial({
          color: color.clone().multiplyScalar(0.4),
          emissive: color, emissiveIntensity: 0.3,
          roughness: 0.4, metalness: 0.6,
        })
      );
      mesh.userData = { type: 'company', company, subdomain, industry, planetSize: r };
      
      const wire = new THREE.Mesh(
        new THREE.SphereGeometry(r + 0.2, 16, 16),
        new THREE.MeshBasicMaterial({
          color: color.clone().multiplyScalar(1.5),
          wireframe: true,
          transparent: true,
          opacity: 0.3,
        })
      );
      mesh.add(wire);
      
      container.add(mesh);
      this.companyMeshes.push(mesh);

      // Glow
      const cgSpr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: getGlow(), color, transparent: true, opacity: 0.25,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      cgSpr.scale.set(r * 5, r * 5, 1);
      container.add(cgSpr);

      this.group.add(container);
      this._containers.push({ container, orbitRadius, angle, speed });
    });

    // ─ LOCAL STAR FIELD ─
    const N   = 900;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const r  = 350 + Math.random() * 1100;
      pos[i*3]   = r * Math.sin(ph) * Math.cos(th);
      pos[i*3+1] = r * Math.sin(ph) * Math.sin(th);
      pos[i*3+2] = r * Math.cos(ph);
      // White + subtle industry tint
      col[i*3]   = 0.75 + color.r * 0.2 * Math.random();
      col[i*3+1] = 0.75 + color.g * 0.2 * Math.random();
      col[i*3+2] = 0.85 + color.b * 0.1 * Math.random();
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    this._starMat = new THREE.PointsMaterial({
      vertexColors: true, size: 1.3, sizeAttenuation: true,
      transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.group.add(new THREE.Points(starGeo, this._starMat));

    this.scene.add(this.group);

    // Fade stars in
    gsap.to(this._starMat, { opacity: 0.85, duration: 1.8, ease: 'power2.out' });
  }

  // ── UPDATE (called every frame) ──────────────────────────────────────────
  update(elapsed) {
    if (!this.group) return;
    if (this._sunMat) this._sunMat.uniforms.uTime.value = elapsed;
    const ts = 0.016 * 0.12;
    this._containers.forEach(cc => {
      cc.angle += cc.speed * ts;
      cc.container.position.set(
        Math.cos(cc.angle) * cc.orbitRadius,
        Math.sin(cc.angle * 1.5) * 2.5,
        Math.sin(cc.angle) * cc.orbitRadius
      );
    });
    this._atmoMats.forEach(m => { m.uniforms.uTime.value = elapsed; });
  }

  // ── DESTROY ──────────────────────────────────────────────────────────────
  destroy() {
    if (!this.group) return;
    if (this._starMat) gsap.to(this._starMat, { opacity: 0, duration: 0.2 });
    this.scene.remove(this.group);
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material.dispose();
      }
    });
    this.group      = null;
    this._sunMat    = null;
    this._containers = [];
    this._atmoMats  = [];
    this.companyMeshes = [];
    this.active = false;
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────
  getCompanyWorldPosition(companyId) {
    const mesh = this.companyMeshes.find(m => m.userData.company.id === companyId);
    if (!mesh) return new THREE.Vector3();
    const wp = new THREE.Vector3();
    mesh.getWorldPosition(wp);
    return wp;
  }
}
