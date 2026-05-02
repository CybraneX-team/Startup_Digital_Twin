// @ts-nocheck
/**
 * NavigationManager.js — Unified Hierarchy Navigation
 * 
 * Hierarchy: Galaxy → Industry → Subdomain → Company → Department
 * Morphs systems in and out rather than toggling visibility.
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { ZOOM_LEVELS } from '../engine/CameraController.js';
import { SubdomainSolarSystem } from './SubdomainSolarSystem.js';

export class NavigationManager {
  constructor(camera, canvas, cameraController, systems) {
    this.camera = camera;
    this.canvas = canvas;
    this.container = systems.container || canvas.parentElement;
    this.cameraCtrl = cameraController;
    this.galaxyParticles = systems.galaxyParticles;
    this.systemParticles = systems.systemParticles;
    this._subdomainSolarSystem = systems.scene ? new SubdomainSolarSystem(systems.scene) : null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.currentLevel = ZOOM_LEVELS.GALAXY;
    this.navigationPath = [];
    this.hoveredObject = null;
    this.selectedIndustry = null;
    this.selectedSubdomain = null;
    this.selectedCompany = null;

    this.onNavigate = null;
    this.onNavigateBegin = null; // fires immediately at nav start — for early label/UI updates
    this.onHover = null;
    this.onSelect = null;

    this._afterNextNavigate = null;

    this._bind();
    this._initEvents();
  }

  // Called at the end of every navigation — fires one-shot callback if set
  _onNavigateDone(path, level) {
    if (this.onNavigate) this.onNavigate(path, level);
    if (this._afterNextNavigate) {
      const cb = this._afterNextNavigate;
      this._afterNextNavigate = null;
      cb();
    }
  }

  _bind() {
    this._onClick = this._onClick.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onKey = this._onKey.bind(this);
  }

  _initEvents() {
    this.canvas.addEventListener('click', this._onClick);
    this.canvas.addEventListener('mousemove', this._onMove);
    window.addEventListener('keydown', this._onKey);
  }

  _setMouse(e) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _onMove(e) { this._setMouse(e); this._hover(); }
  _onClick(e) { if (!this.cameraCtrl.isTransitioning) { this._setMouse(e); this._click(); } }
  _onKey(e) { if (e.key === 'Escape') { e.preventDefault(); this.goBack(); } }

  _hover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // ── GALAXY level: hover over industry galaxies ──
    if (this.currentLevel === ZOOM_LEVELS.GALAXY) {
      const clickMeshes = this.systemParticles.getGalaxyClickMeshes();
      if (this._iconParticles) {
        this._iconParticles.icons.forEach(({ points }) => clickMeshes.push(points));
      }
      const hits = this.raycaster.intersectObjects(clickMeshes, false);
      if (hits.length > 0) {
        const id = hits[0].object.userData._industryId || hits[0].object.userData.industryId;
        const industry = (this._industries || []).find(i => i.id === id);
        if (industry) {
          if (this._hoveredIndustryId !== id) {
            this._hoveredIndustryId = id;
            this.canvas.style.cursor = 'pointer';
            if (this.onHover) this.onHover({ type: 'industry', industry });
          }
          return;
        }
      }
      if (this._hoveredIndustryId) {
        this._hoveredIndustryId = null;
        this.canvas.style.cursor = 'default';
        if (this.onHover) this.onHover(null);
      }
      return;
    }

    // ── Deeper levels: hover over planets ──
    let hits = [];
    if (this.currentLevel === ZOOM_LEVELS.INDUSTRY && this.selectedIndustry) {
      const meshes = this.systemParticles.getSubdomainMeshes(this.selectedIndustry.id);
      hits = this.raycaster.intersectObjects(meshes);
    } else if (this.currentLevel === ZOOM_LEVELS.SUBDOMAIN && this.selectedSubdomain) {
      const meshes = this._subdomainSolarSystem?.companyMeshes?.length
        ? this._subdomainSolarSystem.companyMeshes
        : this.systemParticles.getCompanyMeshes(this.selectedIndustry.id, this.selectedSubdomain.id);
      hits = this.raycaster.intersectObjects(meshes);
    } else if (this.currentLevel === ZOOM_LEVELS.COMPANY && this.selectedCompany) {
      const meshes = this.systemParticles.getDeptMeshes(this.selectedIndustry.id, this.selectedSubdomain.id, this.selectedCompany.id);
      hits = this.raycaster.intersectObjects(meshes);
    }

    if (hits.length > 0) {
      const obj = hits[0].object;
      if (this.hoveredObject !== obj) {
        if (this.hoveredObject) this._unhover(this.hoveredObject);
        this.hoveredObject = obj;
        this._doHover(obj);
        this.canvas.style.cursor = 'pointer';
        if (this.onHover) this.onHover(obj.userData);
      }
    } else {
      if (this.hoveredObject) {
        this._unhover(this.hoveredObject);
        this.hoveredObject = null;
        this.canvas.style.cursor = 'default';
        if (this.onHover) this.onHover(null);
      }
    }
  }

  _doHover(o) {
    gsap.to(o.scale, { x: 1.25, y: 1.25, z: 1.25, duration: 0.25, ease: 'back.out(2)' });
    if (o.material && o.material.emissiveIntensity !== undefined) {
      o._origEmI = o.material.emissiveIntensity;
      gsap.to(o.material, { emissiveIntensity: 0.5, duration: 0.25 });
    }
  }

  _unhover(o) {
    gsap.to(o.scale, { x: 1, y: 1, z: 1, duration: 0.25, ease: 'power2.out' });
    if (o.material && o._origEmI !== undefined) {
      gsap.to(o.material, { emissiveIntensity: o._origEmI, duration: 0.25 });
    }
  }

  setIconParticles(iconParticles, industries) {
    this._iconParticles = iconParticles;
    this._industries = industries;
  }

  setSubdomainSolarSystem(sss) {
    this._subdomainSolarSystem = sss;
  }

  _click() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Galaxy level — click icon particles OR galaxy star/dust to navigate
    if (this.currentLevel === ZOOM_LEVELS.GALAXY) {
      const clickMeshes = this.systemParticles.getGalaxyClickMeshes();
      if (this._iconParticles) {
        this._iconParticles.icons.forEach(({ points }) => clickMeshes.push(points));
      }
      const hits = this.raycaster.intersectObjects(clickMeshes, false);
      if (hits.length > 0) {
        const obj = hits[0].object;
        const id = obj.userData._industryId || obj.userData.industryId;
        const idx = (this._industries || []).findIndex(i => i.id === id);
        if (idx >= 0) { this.navigateToIndustry(this._industries[idx], idx); return; }
      }
    }

    if (this.currentLevel === ZOOM_LEVELS.INDUSTRY && this.selectedIndustry) {
      const meshes = this.systemParticles.getSubdomainMeshes(this.selectedIndustry.id);
      const hits = this.raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const { subdomain, industry } = hits[0].object.userData;
        this.navigateToSubdomain(industry, subdomain);
        return;
      }
    } else if (this.currentLevel === ZOOM_LEVELS.SUBDOMAIN && this.selectedSubdomain) {
      const meshes = this._subdomainSolarSystem?.companyMeshes?.length
        ? this._subdomainSolarSystem.companyMeshes
        : this.systemParticles.getCompanyMeshes(this.selectedIndustry.id, this.selectedSubdomain.id);
      const hits = this.raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const { company, subdomain, industry } = hits[0].object.userData;
        this.navigateToCompany(industry, subdomain, company);
        return;
      }
    } else if (this.currentLevel === ZOOM_LEVELS.COMPANY && this.selectedCompany) {
      const meshes = this.systemParticles.getDeptMeshes(this.selectedIndustry.id, this.selectedSubdomain.id, this.selectedCompany.id);
      const hits = this.raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const { department, company, subdomain, industry } = hits[0].object.userData;
        this.navigateToDepartment(industry, subdomain, company, department);
        return;
      }
    }
  }

  // ═══ NAVIGATE TO INDUSTRY ═══
  navigateToIndustry(industry, idx, total) {
    if (this.cameraCtrl.isTransitioning) return;
    this.selectedIndustry = industry;
    // Set level IMMEDIATELY so main.js orbit loop stops overriding group positions this frame
    this.cameraCtrl.currentLevel = ZOOM_LEVELS.INDUSTRY;
    this.galaxyParticles.setInsideIndustry(true);

    // Push other galaxies to far edge + scale down
    // ← TUNING: FAR_RADIUS = fixed distance from active galaxy each other gets pushed to
    // ← TUNING: SIZE_SCALE = apparent size (0=invisible, 1=full)
    const FAR_RADIUS = 20000;  // huge distance — others become specks at edge
    const SIZE_SCALE = 0.08;
    const activePos  = this.galaxyParticles.getIndustryPosition(idx);

    this.systemParticles.systems.forEach((sys, id) => {
      if (id !== industry.id) {
        if (!sys.group.userData._origPos) {
          sys.group.userData._origPos = sys.group.position.clone();
        }
        const orig = sys.group.userData._origPos;
        // Direction from active → this galaxy, then place at FAR_RADIUS along that dir
        const dir = orig.clone().sub(activePos);
        if (dir.lengthSq() === 0) dir.set(1, 0, 0);
        dir.normalize().multiplyScalar(FAR_RADIUS);
        const target = activePos.clone().add(dir);

        gsap.killTweensOf(sys.group.position);
        gsap.killTweensOf(sys.group.scale);
        gsap.to(sys.group.position, { x: target.x, y: target.y, z: target.z, duration: 4.5, ease: 'power2.inOut' });
        gsap.to(sys.group.scale,    { x: SIZE_SCALE, y: SIZE_SCALE, z: SIZE_SCALE, duration: 4.0, ease: 'power2.inOut' });
      }
    });

    // Start morph mid-flight (slight delay for dramatic effect)
    setTimeout(() => {
      const sys = this.systemParticles.systems.get(industry.id);
      if (sys && sys.orbitGroup.scale.x < 0.5) {
        gsap.killTweensOf(sys.orbitGroup.scale);
        sys.orbitGroup.visible = true;
        gsap.to(sys.orbitGroup.scale, { x: 1, y: 1, z: 1, duration: 1.8, ease: 'power2.out' });
      }
    }, 300);

    const pos = this.galaxyParticles.getIndustryPosition(idx);
    this.cameraCtrl.flyTo(pos, 2500, ZOOM_LEVELS.INDUSTRY, () => {
      this.currentLevel = ZOOM_LEVELS.INDUSTRY;
      this.navigationPath = [{ level: ZOOM_LEVELS.INDUSTRY, id: industry.id, name: industry.name, data: industry }];
      // Cap zoom-out: just enough to see all subdomains, can't scroll back to galaxy
      this.cameraCtrl.setZoomCap(5500);
      if (this.onNavigate) this.onNavigate(this.navigationPath, this.currentLevel);
    });
  }

  // ── Simple fade-to-black scene swap ─────────────────────────────────────
  // Fade out (300ms) → onMidpoint (instant scene swap) → fade in (300ms) → onComplete
  _fadeSwap(onMidpoint, onComplete) {
    this.cameraCtrl.isTransitioning = true;
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;z-index:200;pointer-events:none;transition:opacity 0.15s ease';
    this.container.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      setTimeout(() => {
        onMidpoint();
        requestAnimationFrame(() => {
          el.style.opacity = '0';
          setTimeout(() => {
            el.remove();
            this.cameraCtrl.isTransitioning = false;
            if (onComplete) onComplete();
          }, 150);
        });
      }, 150);
    });
  }

  // ═══ NAVIGATE TO SUBDOMAIN ═══
  navigateToSubdomain(industry, subdomain) {
    if (this.cameraCtrl.isTransitioning) return;
    this.selectedIndustry = industry;
    this.selectedSubdomain = subdomain;

    const earlyPath = [
      { level: ZOOM_LEVELS.INDUSTRY, id: industry.id, name: industry.name, data: industry },
      { level: ZOOM_LEVELS.SUBDOMAIN, id: subdomain.id, name: subdomain.name, data: subdomain },
    ];
    if (this.onNavigateBegin) this.onNavigateBegin(earlyPath, ZOOM_LEVELS.SUBDOMAIN);

    // ── Morph-out during zoom-in ──────────────────────────────────────────────

    // INSTANT: other galaxy systems + spiral + bg stars + universe sphere snap away
    this.galaxyParticles.setSubdomainLevel(true, 0.25);
    this.systemParticles.systems.forEach((sys, id) => {
      if (id !== industry.id) {
        gsap.killTweensOf(sys.group.scale);
        gsap.to(sys.group.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.25, ease: 'power2.in' });
      }
    });

    // DELAYED: target industry core + sibling subdomains morph out after camera starts moving
    const DELAY = 0.5;   // wait 0.5s so user sees the zoom-in start before things vanish
    const MORPH_DUR = 1.4;
    const targetSys = this.systemParticles.systems.get(industry.id);
    if (targetSys) {
      gsap.killTweensOf(targetSys.coreGroup.scale);
      gsap.to(targetSys.coreGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: MORPH_DUR, delay: DELAY, ease: 'power3.inOut' });

      targetSys.subdomainContainers.forEach((sd, i) => {
        const mesh = targetSys.subdomainMeshes[i];
        if (mesh?.userData?.subdomain?.id !== subdomain.id) {
          gsap.killTweensOf(sd.container.scale);
          gsap.to(sd.container.scale, { x: 0.001, y: 0.001, z: 0.001, duration: MORPH_DUR, delay: DELAY, ease: 'power2.inOut' });
        }
      });

      if (targetSys.dustMat?.uniforms?.uSize) {
        gsap.killTweensOf(targetSys.dustMat.uniforms.uSize);
        gsap.to(targetSys.dustMat.uniforms.uSize, { value: 0, duration: MORPH_DUR, delay: DELAY, ease: 'power2.in' });
      }
    }

    // ── Phase 1: Fly INTO the subdomain planet ────────────────────────────────
    const wp = this.systemParticles.getSubdomainPosition(industry.id, subdomain.id);
    this.cameraCtrl.flyTo(wp, 5, ZOOM_LEVELS.SUBDOMAIN, () => {
      // ── Phase 2: Fade-swap scene ──────────────────────────────────────────
      this._fadeSwap(
        () => {
          this.galaxyParticles.setVisible(false);
          this.systemParticles.systems.forEach(s => { s.group.visible = false; });
          if (this._subdomainSolarSystem) this._subdomainSolarSystem.build(subdomain, industry);
          // Camera FAR away — solar system is a distant glowing cluster
          this.camera.position.set(0, 800, 6000);
          this.cameraCtrl.controls.target.set(0, 0, 0);
          this.cameraCtrl.controls.update();
        },
        () => {
          // ── Phase 3: Warp-zoom INTO solar system from deep space ─────────
          this.cameraCtrl.isTransitioning = true;
          gsap.to(this.camera.position, {
            x: 0, y: 200, z: 750,
            duration: 2.6,
            ease: 'power3.in',   // accelerates — pulled in by gravity
            onUpdate: () => { this.cameraCtrl.controls.update(); },
            onComplete: () => {
              this.cameraCtrl.isTransitioning = false;
              this.currentLevel = ZOOM_LEVELS.SUBDOMAIN;
              this.navigationPath = earlyPath;
              if (this.onNavigate) this.onNavigate(this.navigationPath, this.currentLevel);
            },
          });
          gsap.to(this.cameraCtrl.controls.target, { x: 0, y: 0, z: 0, duration: 2.6, ease: 'power3.in' });
        }
      );
    });
  }

  // ═══ NAVIGATE TO COMPANY ═══
  navigateToCompany(industry, subdomain, company) {
    if (this.cameraCtrl.isTransitioning) return;
    this.selectedCompany = company;

    // Get company world position — solar system if active, else system particles
    const wp = this._subdomainSolarSystem?.companyMeshes?.length
      ? this._subdomainSolarSystem.getCompanyWorldPosition(company.id)
      : this.systemParticles.getCompanyPosition(industry.id, subdomain.id, company.id);

    this.cameraCtrl.flyTo(wp, 50, ZOOM_LEVELS.COMPANY, () => {
      this.currentLevel = ZOOM_LEVELS.COMPANY;
      this.navigationPath = [
        { level: ZOOM_LEVELS.INDUSTRY, id: industry.id, name: industry.name, data: industry },
        { level: ZOOM_LEVELS.SUBDOMAIN, id: subdomain.id, name: subdomain.name, data: subdomain },
        { level: ZOOM_LEVELS.COMPANY, id: company.id, name: company.name, data: company },
      ];
      if (this.onNavigate) this.onNavigate(this.navigationPath, this.currentLevel);
    });
  }

  // ═══ NAVIGATE TO DEPARTMENT ═══
  navigateToDepartment(industry, subdomain, company, department) {
    if (this.cameraCtrl.isTransitioning) return;

    const wp = this.systemParticles.getDeptPosition(industry.id, subdomain.id, company.id, department.id);
    this.cameraCtrl.flyTo(wp, 12, ZOOM_LEVELS.DEPARTMENT, () => {
      this.currentLevel = ZOOM_LEVELS.DEPARTMENT;
      this.navigationPath = [
        { level: ZOOM_LEVELS.INDUSTRY, id: industry.id, name: industry.name, data: industry },
        { level: ZOOM_LEVELS.SUBDOMAIN, id: subdomain.id, name: subdomain.name, data: subdomain },
        { level: ZOOM_LEVELS.COMPANY, id: company.id, name: company.name, data: company },
        { level: ZOOM_LEVELS.DEPARTMENT, id: department.id, name: department.name, data: department },
      ];
      if (this.onNavigate) this.onNavigate(this.navigationPath, this.currentLevel);
      if (this.onSelect) this.onSelect(department);
    });
  }

  // ═══ GO BACK ═══
  goBack() {
    if (this.cameraCtrl.isTransitioning) return;

    if (this.currentLevel === ZOOM_LEVELS.DEPARTMENT) {
      // Back to company
      const company = this.navigationPath[2]?.data;
      const subdomain = this.navigationPath[1]?.data;
      const industry = this.navigationPath[0]?.data;
      if (!company || !subdomain || !industry) return;
      
      const wp = this.systemParticles.getCompanyPosition(industry.id, subdomain.id, company.id);
      this.cameraCtrl.flyTo(wp, 25, ZOOM_LEVELS.COMPANY, () => {
        this.currentLevel = ZOOM_LEVELS.COMPANY;
        this.navigationPath = this.navigationPath.slice(0, 3);
        this._onNavigateDone(this.navigationPath, this.currentLevel);
      });

    } else if (this.currentLevel === ZOOM_LEVELS.COMPANY) {
      const company = this.navigationPath[2]?.data;
      const subdomain = this.navigationPath[1]?.data;
      const industry = this.navigationPath[0]?.data;
      if (!company || !subdomain || !industry) return;

      // Restore all company containers
      const sdMesh2 = this.systemParticles.getSubdomainMesh(industry.id, subdomain.id);
      if (sdMesh2) {
        (sdMesh2.userData.companyContainers || []).forEach(cd => {
          gsap.killTweensOf(cd.container.scale);
          gsap.to(cd.container.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'power2.out' });
        });
      }

      const cMesh = this.systemParticles.getCompanyMesh(industry.id, subdomain.id, company.id);
      if (cMesh && cMesh.userData.deptGroup) {
        const _dg = cMesh.userData.deptGroup;
        gsap.killTweensOf(_dg.scale);
        gsap.to(_dg.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 1.0, ease: 'power3.inOut', onComplete: () => { _dg.visible = false; } });
      }

      this.selectedCompany = null;
      // Back to solar system center (if active) or original subdomain position
      const wp = this._subdomainSolarSystem?.group
        ? new THREE.Vector3(0, 0, 0)
        : this.systemParticles.getSubdomainPosition(industry.id, subdomain.id);
      this.cameraCtrl.flyTo(wp, 450, ZOOM_LEVELS.SUBDOMAIN, () => {
        this.currentLevel = ZOOM_LEVELS.SUBDOMAIN;
        this.navigationPath = this.navigationPath.slice(0, 2);
        this._onNavigateDone(this.navigationPath, this.currentLevel);
      });

    } else if (this.currentLevel === ZOOM_LEVELS.SUBDOMAIN) {
      const subdomain = this.navigationPath[1]?.data;
      const industry = this.navigationPath[0]?.data;
      if (!subdomain || !industry) return;

      const earlyPath = [{ level: ZOOM_LEVELS.INDUSTRY, id: industry.id, name: industry.name, data: industry }];
      if (this.onNavigateBegin) this.onNavigateBegin(earlyPath, ZOOM_LEVELS.INDUSTRY);

      // Phase 1: zoom out inside solar system — camera pulls back to reveal full layout
      this.cameraCtrl.isTransitioning = true;
      const tl = gsap.timeline({
        onComplete: () => {
          this.cameraCtrl.isTransitioning = false;

          // Phase 2: morph-fade to real universe
          this._fadeSwap(
            () => {
              if (this._subdomainSolarSystem) this._subdomainSolarSystem.destroy();
              this.galaxyParticles.setVisible(true);
              // Restore to INDUSTRY level state: spiral dim, bg stars bright, sphere dim
              // setInsideIndustry restores universeSphere visibility + opacity internally
              this.galaxyParticles.setInsideIndustry(true);

              const sys2 = this.systemParticles.systems.get(industry.id);
              this.systemParticles.systems.forEach((s) => {
                s.group.visible = true;
                s.group.scale.setScalar(1.0);
              });
              if (sys2) {
                gsap.to(sys2.coreGroup.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: 'power2.out' });
                gsap.to(sys2.coreGroup.position, { x: 0, y: 0, z: 0, duration: 1.2, ease: 'power2.out' });
                sys2.subdomainContainers.forEach((sd, i) => {
                  gsap.to(sd, { orbitRadius: sd._savedOrbitRadius || sd.orbitRadius, duration: 1.2, ease: 'power2.out' });
                  gsap.to(sd.container.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: 'power2.out' });
                });
                // Restore dust size that was zeroed on subdomain enter
                if (sys2.dustMat?.uniforms?.uSize) {
                  gsap.killTweensOf(sys2.dustMat.uniforms.uSize);
                  gsap.to(sys2.dustMat.uniforms.uSize, { value: 4.5, duration: 1.2, ease: 'power2.out' });
                }
                sys2.group.updateMatrixWorld(true);
              }

              const sdPos = this.systemParticles.getSubdomainPosition(industry.id, subdomain.id);
              this.camera.position.set(sdPos.x, sdPos.y + 25, sdPos.z + 40);
              this.cameraCtrl.controls.target.copy(sdPos);
              this.cameraCtrl.controls.update();
            },
            () => {
              this.selectedSubdomain = null;
              const idx2 = this.galaxyParticles.industries.findIndex(i => i.id === industry.id);
              const pos = this.galaxyParticles.getIndustryPosition(idx2);
              this.cameraCtrl.flyTo(pos, 2500, ZOOM_LEVELS.INDUSTRY, () => {
                this.currentLevel = ZOOM_LEVELS.INDUSTRY;
                this.navigationPath = this.navigationPath.slice(0, 1);
                this.cameraCtrl.setZoomCap(5500);
                this._onNavigateDone(this.navigationPath, this.currentLevel);
              });
            }
          );
        },
      });

      // Smoothly pull camera back to show the entire solar system
      tl.to(this.camera.position, { x: 0, y: 2000, z: 10000, duration: 2, ease: 'power2.inOut' }, 0);
 
      tl.to(this.cameraCtrl.controls.target, { x: 0, y: 0, z: 0, duration: 1.6, ease: 'power2.inOut' }, 0);

    } else if (this.currentLevel === ZOOM_LEVELS.INDUSTRY) {
      this._goToGalaxy();
    }
  }

  goToGalaxy() {
    if (this.cameraCtrl.isTransitioning) return;

    // Must step through intermediate levels — can't skip from subdomain straight to galaxy
    if (
      this.currentLevel === ZOOM_LEVELS.SUBDOMAIN ||
      this.currentLevel === ZOOM_LEVELS.COMPANY ||
      this.currentLevel === ZOOM_LEVELS.DEPARTMENT
    ) {
      // goBack brings us to INDUSTRY; chain another goToGalaxy from there
      this._afterNextNavigate = () => { this.goToGalaxy(); };
      this.goBack();
      return;
    }

    this._goToGalaxy();
  }

  _goToGalaxy() {
    this.cameraCtrl.setZoomCap(38000); // restore full zoom range at galaxy level
    this.galaxyParticles.setInsideIndustry(false);
    // Hide subdomain labels IMMEDIATELY — before any animation starts
    if (this.onNavigateBegin) this.onNavigateBegin([], ZOOM_LEVELS.GALAXY);
    // Morph ALL opened orbit groups back
    this.systemParticles.systems.forEach(sys => {
      sys.group.visible = true;
      gsap.killTweensOf(sys.group.scale);
      gsap.killTweensOf(sys.group.position);
      gsap.to(sys.group.scale, { x: 1, y: 1, z: 1, duration: 2.0, ease: 'power2.out' });
      // Restore original position
      const orig = sys.group.userData._origPos;
      if (orig) gsap.to(sys.group.position, { x: orig.x, y: orig.y, z: orig.z, duration: 2.5, ease: 'power2.out' });
      // Restore coreGroup + subdomain containers to full scale/position
      gsap.killTweensOf(sys.coreGroup.scale);
      gsap.to(sys.coreGroup.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: 'power2.out' });
      gsap.killTweensOf(sys.coreGroup.position);
      gsap.to(sys.coreGroup.position, { x: 0, y: 0, z: 0, duration: 1.2, ease: 'power2.out' });
      sys.subdomainContainers.forEach((sd, i) => {
        gsap.killTweensOf(sd);
        gsap.to(sd, { orbitRadius: sd._savedOrbitRadius || sd.orbitRadius, duration: 1.2, ease: 'power2.out' });
        gsap.killTweensOf(sd.container.scale);
        gsap.to(sd.container.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: 'power2.out' });
      });
      if (sys.dust && sys.dust.material) {
        gsap.killTweensOf(sys.dust.material.uniforms.uSize);
        gsap.to(sys.dust.material.uniforms.uSize, { value: 4.5, duration: 1.2, ease: 'power2.out' });
      }

      if (sys.orbitGroup.scale.x > 0.002) {
        const _og = sys.orbitGroup;
        gsap.killTweensOf(_og.scale);
        gsap.to(_og.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 1.2, ease: 'power3.inOut', onComplete: () => { _og.visible = false; } });
      } else {
        sys.orbitGroup.visible = false;
      }
      // Also collapse any opened company groups
      sys.subdomainMeshes.forEach(sdMesh => {
        if (sdMesh.userData.companyGroup) {
          const _cg = sdMesh.userData.companyGroup;
          if (_cg.scale.x > 0.002) {
            gsap.killTweensOf(_cg.scale);
            gsap.to(_cg.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 1.0, ease: 'power3.inOut', onComplete: () => { _cg.visible = false; } });
          } else {
            _cg.visible = false;
          }
        }
        (sdMesh.userData.companyMeshes || []).forEach(cMesh => {
          if (cMesh.userData.deptGroup) {
            const _dg = cMesh.userData.deptGroup;
            if (_dg.scale.x > 0.002) {
              gsap.killTweensOf(_dg.scale);
              gsap.to(_dg.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.8, ease: 'power3.inOut', onComplete: () => { _dg.visible = false; } });
            } else {
              _dg.visible = false;
            }
          }
        });
      });
    });

    this.cameraCtrl.flyToGalaxy(() => {
      this.currentLevel = ZOOM_LEVELS.GALAXY;
      this.navigationPath = [];
      this.selectedIndustry = null;
      this.selectedSubdomain = null;
      this.selectedCompany = null;
      if (this.onNavigate) this.onNavigate(this.navigationPath, this.currentLevel);
    });
  }

  navigateToLevel(levelIndex) {
    if (levelIndex < 0) this.goToGalaxy();
    else if (levelIndex < this.navigationPath.length - 1) this.goBack();
  }

  dispose() {
    this.canvas.removeEventListener('click', this._onClick);
    this.canvas.removeEventListener('mousemove', this._onMove);
    window.removeEventListener('keydown', this._onKey);
    if (this._subdomainSolarSystem) this._subdomainSolarSystem.destroy?.();
  }
}
