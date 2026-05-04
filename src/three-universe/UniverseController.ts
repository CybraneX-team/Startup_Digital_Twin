// @ts-nocheck
/**
 * UniverseController — Mountable 3D Universe
 *
 * Wraps all Three.js rendering into a single class that mounts
 * into a container div. Used by the React <UniverseCanvas /> component.
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { Engine } from './engine/Engine';
import { CameraController, ZOOM_LEVELS } from './engine/CameraController';
import { PostProcessing } from './engine/PostProcessing';
import { GalaxyParticles } from './particles/GalaxyParticles';
import { SystemParticles } from './particles/SystemParticles';
import { PolytopeRenderer } from './particles/PolytopeRenderer';
import { NavigationManager } from './navigation/NavigationManager';
import { Labels } from './ui/Labels';
import { IconParticles } from './particles/IconParticles';
import { SubdomainSolarSystem } from './navigation/SubdomainSolarSystem';
import type { UniverseData, UniverseIndustry } from '../data/universeGraph';

import './styles/universe.css';

export type ZoomLevel = typeof ZOOM_LEVELS[keyof typeof ZOOM_LEVELS];

export interface NavPathEntry {
  level: ZoomLevel;
  id: string;
  name: string;
  data: any;
}

export interface HoverTarget {
  type: string;
  [key: string]: any;
}

export interface UniverseCallbacks {
  onNavigate?: (path: NavPathEntry[], level: ZoomLevel) => void;
  onHover?: (target: HoverTarget | null) => void;
  onCreateCompany?: (industry: any, subdomain: any) => void;
}

const _orbitPos = new THREE.Vector3();

export class UniverseController {
  private container: HTMLElement;
  private engine: Engine;
  private cameraCtrl: CameraController;
  private postProcessing: PostProcessing;
  private galaxyParticles: GalaxyParticles;
  private systemParticles: SystemParticles;
  private polytopeRenderer: PolytopeRenderer;
  private navigation: NavigationManager;
  private labels: Labels;
  private iconParticles: IconParticles;
  private subdomainSolarSystem: SubdomainSolarSystem;
  private _data: UniverseData | null = null;
  private _disposed = false;

  constructor(
    container: HTMLElement,
    data: UniverseData,
    callbacks?: UniverseCallbacks,
  ) {
    this.container = container;
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    this._data = data;
    this._callbacks = callbacks ?? {};

    this._init(data);
  }

  private async _init(data: UniverseData) {
    try {
      // Transform UniverseData industries into the shape the particle system expects
      const industries = this._mapIndustries(data);
      this._industries = industries; // cache for panel navigation

      // 1. Engine — mounts into container
      this.engine = new Engine(this.container);

      // 2. Camera Controller
      this.cameraCtrl = new CameraController(this.engine.camera, this.engine.canvas);

      // Set camera to gallery-view position immediately if intro already played,
      // so the renderer never shows the default Engine position (0, 5000, 32000) — prevents snap glitch.
      if (sessionStorage.getItem('universe3d_intro_done')) {
        this.engine.camera.position.set(
          Math.cos(Math.PI * 0.3 + Math.PI * 1.4) * 28000,
          6000,
          Math.sin(Math.PI * 0.3 + Math.PI * 1.4) * 28000,
        );
        this.engine.camera.lookAt(0, 0, 0);
      }

      // 3. Lighting
      this._setupLighting();

      // 4. Galaxy Particles
      this.galaxyParticles = new GalaxyParticles(this.engine.scene, industries);

      // 5. System Particles (industry solar systems)
      this.systemParticles = new SystemParticles(this.engine.scene);
      industries.forEach((industry, idx) => {
        const pos = this.galaxyParticles.getIndustryPosition(idx);
        const sizeMult = this.galaxyParticles.getSizeMultiplier(idx);
        this.systemParticles.createSystem(industry, pos, sizeMult);
      });

      // Staggered galaxy creation (skip if returning to page this session)
      const skipIntro = !!sessionStorage.getItem('universe3d_intro_done');
      industries.forEach((industry, idx) => {
        const sys = this.systemParticles.systems.get(industry.id);
        if (sys?.group) {
          if (skipIntro) {
            sys.group.scale.setScalar(1);
          } else {
            sys.group.scale.setScalar(0.001);
            setTimeout(() => {
              if (this._disposed) return;
              gsap.to(sys.group.scale, { x: 1, y: 1, z: 1, duration: 1.5 + idx * 0.1, ease: 'power2.out' });
            }, 800 + idx * 180);
          }
        }
      });

      // Polytope Renderer
      this.polytopeRenderer = new PolytopeRenderer(this.engine.scene);
      this.polytopeRenderer.renderPolytope("Work OS Orbit", industries, "#4ade80");

      // 6. Post-Processing
      this.postProcessing = new PostProcessing(
        this.engine.renderer,
        this.engine.scene,
        this.engine.camera
      );
      this.engine.composer = this.postProcessing.composer;
      this.engine.onResize = (w, h) => this.postProcessing.resize(w, h);

      // 7. Navigation Manager
      this.navigation = new NavigationManager(
        this.engine.camera,
        this.engine.canvas,
        this.cameraCtrl,
        {
          galaxyParticles: this.galaxyParticles,
          systemParticles: this.systemParticles,
          scene: this.engine.scene,
          container: this.container,
        }
      );

      // 8. Labels — mount into container
      this.labels = new Labels(this.engine.scene, this.engine.camera, this.container);
      this._createIndustryLabels(industries);
      this._setupLabelNavigation(industries);

      // 8b. Icon Particles
      this.iconParticles = new IconParticles(this.engine.scene, this.engine.camera);
      await this.iconParticles.createAll(industries);
      if (this._disposed) return;
      this.iconParticles.attachToSystems(this.systemParticles.systems);
      this.navigation.setIconParticles(this.iconParticles, industries);

      // 8c. Subdomain Solar System
      this.subdomainSolarSystem = new SubdomainSolarSystem(this.engine.scene);
      this.navigation.setSubdomainSolarSystem(this.subdomainSolarSystem);

      // 9. Wire navigation callbacks → React
      this._setupNavigationCallbacks(industries);

      // 10. Start render loop
      this.engine.start((delta, elapsed) => this._update(delta, elapsed, industries));

      // 11. Play intro orbit (only once per session)
      setTimeout(() => {
        if (this._disposed) return;
        const alreadyPlayed = sessionStorage.getItem('universe3d_intro_done');
        if (alreadyPlayed) {
          // Skip animation — set camera to final position directly
          const ctrl = this.cameraCtrl;
          const cam = this.engine.camera;
          cam.position.set(
            Math.cos(Math.PI * 0.3 + Math.PI * 1.4) * 28000,
            6000,
            Math.sin(Math.PI * 0.3 + Math.PI * 1.4) * 28000,
          );
          cam.lookAt(0, 0, 0);
          ctrl.controls.target.set(0, 0, 0);
          ctrl.controls.enabled = true;
          ctrl.controls.update();
          ctrl.isTransitioning = false;
          ctrl.currentLevel = ZOOM_LEVELS.GALAXY;
          ctrl.autoRotateEnabled = true;
          ctrl.controls.autoRotate = true;
        } else {
          this._playIntroOrbit();
          sessionStorage.setItem('universe3d_intro_done', '1');
        }
      }, 300);

    } catch (err) {
      console.error('Failed to initialize Universe:', err);
    }
  }

  private _mapIndustries(data: UniverseData) {
    return data.industries.map((ind) => ({
      id: ind.id,
      name: ind.name,
      description: ind.description,
      color: ind.color,
      angle: ind.angle,
      subdomains: ind.subdomains.map(sd => ({
        id: sd.id,
        name: sd.name,
        description: sd.description,
        orbit_index: sd.orbit_index,
        color: sd.color,
        companies: sd.companies.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          founded: c.founded,
          funding: c.funding,
          employees: c.employees,
          departments: c.departments || [],
        })),
      })),
      companies: data.industries
        .find(i => i.id === ind.id)
        ?.subdomains.flatMap(sd => sd.companies) ?? [],
    }));
  }

  private _setupLighting() {
    const ambient = new THREE.AmbientLight(0x161633, 0.4);
    this.engine.scene.add(ambient);
    const coreLight = new THREE.PointLight(0x7c3aed, 3, 600, 1.5);
    coreLight.position.set(0, 5, 0);
    this.engine.scene.add(coreLight);
    const coreLight2 = new THREE.PointLight(0xffd4a0, 1.5, 300, 2);
    coreLight2.position.set(0, -3, 0);
    this.engine.scene.add(coreLight2);
    const hemi = new THREE.HemisphereLight(0x2a2a66, 0x090912, 0.15);
    this.engine.scene.add(hemi);
  }

  private _createIndustryLabels(industries: any[]) {
    this.labels.createIndustryLabels(
      industries,
      (idx) => this.galaxyParticles.getIndustryPosition(idx)
    );
  }

  private _setupLabelNavigation(industries: any[]) {
    this.labels.onLabelClick = (type, data, arg2, arg3) => {
      if (type === 'industry') {
        this.navigation.navigateToIndustry(data, arg2, arg3);
      } else if (type === 'subdomain') {
        this.navigation.navigateToSubdomain(arg2, data);
      } else if (type === 'company') {
        this.navigation.navigateToCompany(arg3, arg2, data);
      }
    };
  }

  private _setupNavigationCallbacks(industries: any[]) {
    const originalOnNavigate = this.navigation.onNavigate;
    this.navigation.onNavigate = (path, level) => {
      if (originalOnNavigate) originalOnNavigate(path, level);
      this._updateLabelsForLevel(path, level, industries);
      const activeId = level === ZOOM_LEVELS.GALAXY ? null : path[0]?.data?.id || null;
      this.labels.setActiveIndustry(activeId);

      // Create button appears ONLY after the solar system is fully built (onNavigate, not onNavigateBegin)
      if (level === ZOOM_LEVELS.SUBDOMAIN) {
        const industry = path[0]?.data;
        const subdomain = path[1]?.data;
        if (industry && subdomain) {
          setTimeout(() => {
            if (this._disposed) return;
            this.labels.createSunCreateButton(industry.color, () => {
              this._callbacks?.onCreateCompany?.(industry, subdomain);
            });
          }, 400); // slight delay so camera settles first
        }
      } else {
        this.labels.removeSunCreateButton();
      }

      this._callbacks?.onNavigate?.(path, level);
    };
    this.navigation.onNavigateBegin = (path, level) => {
      this._updateLabelsForLevel(path, level, industries);
      // Remove stale create button immediately when leaving subdomain
      if (level !== ZOOM_LEVELS.SUBDOMAIN) {
        this.labels.removeSunCreateButton();
      }
    };
    this.navigation.onHover = (target) => {
      this._callbacks?.onHover?.(target);
    };
  }

  private _updateLabelsForLevel(path: any[], level: string, industries: any[]) {
    this.labels.setVisibility('subdomain-', false);
    this.labels.removeByPrefix('company-');
    this.labels.removeByPrefix('dept-');

    if (level === ZOOM_LEVELS.INDUSTRY) {
      const industry = path[0]?.data;
      if (industry) {
        this.labels.createSubdomainLabels(industry, () => this.systemParticles.getSubdomainMeshes(industry.id));
        this.labels.setVisibility('subdomain-', true);
      }
    } else if (level === ZOOM_LEVELS.SUBDOMAIN) {
      this.labels.setVisibility('subdomain-', false);
      const industry = path[0]?.data;
      const subdomain = path[1]?.data;
      if (industry && subdomain) {
        this.labels.createCompanyLabels(subdomain, () => this.subdomainSolarSystem.companyMeshes);
        this.labels.setVisibility('company-', true);
      }
    } else if (level === ZOOM_LEVELS.COMPANY) {
      this.labels.setVisibility('subdomain-', true);
      this.labels.setVisibility('company-', true);
      const industry = path[0]?.data;
      const subdomain = path[1]?.data;
      const company = path[2]?.data;
      if (industry && subdomain && company) {
        this.labels.createCompanyLabels(subdomain, () => this.subdomainSolarSystem.companyMeshes);
        this.labels.createDepartmentLabels(company, () => this.systemParticles.getDeptMeshes(industry.id, subdomain.id, company.id));
        this.labels.setVisibility('dept-', true);
      }
    } else if (level === ZOOM_LEVELS.DEPARTMENT) {
      this.labels.setVisibility('subdomain-', true);
      this.labels.setVisibility('company-', true);
      this.labels.setVisibility('dept-', true);
    }
  }

  private _playIntroOrbit() {
    const cam = this.engine.camera;
    const ctrl = this.cameraCtrl;

    ctrl.isTransitioning = true;
    ctrl.controls.enabled = false;
    ctrl.controls.autoRotate = false;

    const ORBIT_RADIUS_START = 32000;
    const ORBIT_RADIUS_END   = 28000;
    const ELEV_START = 12000;
    const ELEV_END   = 6000;
    const START_ANGLE = Math.PI * 0.3;
    const SWEEP      = Math.PI * 1.4;
    const DURATION   = 9.0;

    const proxy = { t: 0 };

    cam.position.set(
      Math.cos(START_ANGLE) * ORBIT_RADIUS_START,
      ELEV_START,
      Math.sin(START_ANGLE) * ORBIT_RADIUS_START,
    );
    cam.lookAt(0, 0, 0);

    gsap.to(proxy, {
      t: 1,
      duration: DURATION,
      ease: 'power4.inOut',
      onUpdate: () => {
        if (this._disposed) return;
        const angle  = START_ANGLE + SWEEP * proxy.t;
        const radius = ORBIT_RADIUS_START + (ORBIT_RADIUS_END - ORBIT_RADIUS_START) * proxy.t;
        const elev   = ELEV_START + (ELEV_END - ELEV_START) * proxy.t;
        cam.position.set(Math.cos(angle) * radius, elev, Math.sin(angle) * radius);
        cam.lookAt(0, 0, 0);
      },
      onComplete: () => {
        if (this._disposed) return;
        ctrl.controls.target.set(0, 0, 0);
        ctrl.controls.enabled = true;
        ctrl.controls.update();
        ctrl.isTransitioning = false;
        ctrl.currentLevel = ZOOM_LEVELS.GALAXY;
        setTimeout(() => {
          if (this._disposed) return;
          ctrl.autoRotateEnabled = true;
          ctrl.controls.autoRotate = true;
        }, 1200);
      },
    });
  }

  private _update(delta: number, elapsed: number, industries: any[]) {
    if (this._disposed) return;

    this.cameraCtrl.update();

    let zoomLevelFactor = 1.0;
    if (this.cameraCtrl.currentLevel === ZOOM_LEVELS.INDUSTRY) zoomLevelFactor = 0.3;
    else if (this.cameraCtrl.currentLevel === ZOOM_LEVELS.SUBDOMAIN) zoomLevelFactor = 0.1;
    else if (this.cameraCtrl.currentLevel === ZOOM_LEVELS.COMPANY) zoomLevelFactor = 0.03;
    else if (this.cameraCtrl.currentLevel === ZOOM_LEVELS.DEPARTMENT) zoomLevelFactor = 0.01;

    this.galaxyParticles.update(elapsed, 0.0);
    this.systemParticles.update(elapsed, zoomLevelFactor);

    if (this.cameraCtrl.currentLevel === ZOOM_LEVELS.GALAXY) {
      const camPos = this.engine.camera.position;
      this.systemParticles.systems.forEach(sys => {
        const dist = camPos.distanceTo(sys.group.position);
        const opacity = Math.max(0.01, 0.10 * (3000 / dist));
        sys.glowMat.opacity = opacity;
      });
    }

    if (this.cameraCtrl.currentLevel === ZOOM_LEVELS.GALAXY) {
      this.galaxyParticles.advanceOrbits();
      industries.forEach((industry, idx) => {
        this.galaxyParticles.getIndustryPosition(idx, _orbitPos);
        this.systemParticles.updateGroupPosition(industry.id, _orbitPos);
        this.labels.updateIndustryLabelPosition(`industry-${industry.id}`, _orbitPos);
      });
    }

    this.polytopeRenderer.update(elapsed);

    if (this.subdomainSolarSystem?.active) {
      this.subdomainSolarSystem.update(elapsed, delta);
    }

    if (this.iconParticles) {
      this.iconParticles.update();
      const activeId = this.navigation.selectedIndustry?.id || null;
      this.iconParticles.updateForDistance(
        this.engine.camera.position,
        this.systemParticles.systems,
        activeId
      );
    }

    this.labels.render();

    if (this.cameraCtrl.isTransitioning) {
      this.postProcessing.setZoomIntensity(0.4);
    } else {
      this.postProcessing.setZoomIntensity(0);
    }
  }

  // Public API

  updateData(data: UniverseData) {
    if (this._disposed) return;
    this._data = data;
    this._industries = this._mapIndustries(data);

    // If we are currently inside a subdomain, update it live
    if (
      this.cameraCtrl.currentLevel === ZOOM_LEVELS.SUBDOMAIN ||
      this.cameraCtrl.currentLevel === ZOOM_LEVELS.COMPANY ||
      this.cameraCtrl.currentLevel === ZOOM_LEVELS.DEPARTMENT
    ) {
      const activeInd = this.navigation?.selectedIndustry;
      const activeSd = this.navigation?.selectedSubdomain;
      if (activeInd && activeSd) {
        const freshInd = this._industries.find(i => i.id === activeInd.id);
        const freshSd = freshInd?.subdomains.find(s => s.id === activeSd.id);
        if (freshInd && freshSd) {
          this.navigation.selectedIndustry = freshInd;
          this.navigation.selectedSubdomain = freshSd;
          if (this.subdomainSolarSystem) {
            this.subdomainSolarSystem.build(freshSd, freshInd);
          }
          if (this.navigation.navigationPath.length >= 2) {
            this.navigation.navigationPath[0].data = freshInd;
            this.navigation.navigationPath[1].data = freshSd;
          }
          
          // Rebuild the labels for the new meshes
          this._updateLabelsForLevel(this.navigation.navigationPath, this.cameraCtrl.currentLevel, this._industries);
        }
      }
    }
  }

  navigate(path: NavPathEntry[]): void {
    // Programmatic navigation — not used in v1, available for future
  }

  async routeTo(targetLevel: ZoomLevel, industryId?: string, subdomainId?: string, companyId?: string): Promise<void> {
    if (!this.navigation || !this._industries) return;

    // Prevent multiple routes running at once
    if ((this as any)._isRouting) return;
    (this as any)._isRouting = true;

    try {
      const waitForIdle = () => new Promise<void>(resolve => {
        const check = () => {
          if (!this.cameraCtrl.isTransitioning) resolve();
          else setTimeout(check, 100);
        };
        setTimeout(check, 50); // delay first check to let transitions begin
      });

      // Phase 1: Go up until we reach the common ancestor
      while (true) {
        await waitForIdle();
        const lvl = this.getCurrentLevel();
        if (lvl === ZOOM_LEVELS.GALAXY) break;
        
        const curPath = this.getNavigationPath();
        const curInd = curPath[0]?.id;
        const curSub = curPath[1]?.id;
        
        const sameInd = (curInd === industryId);
        const sameSub = (sameInd && curSub === subdomainId);

        if (lvl === ZOOM_LEVELS.DEPARTMENT || lvl === ZOOM_LEVELS.COMPANY) {
          // If we are at a company, and we want another company in the SAME subdomain, we can just pan directly!
          if (sameSub && targetLevel === ZOOM_LEVELS.COMPANY) {
            break; 
          }
          this.goBack();
          continue;
        }
        
        if (lvl === ZOOM_LEVELS.SUBDOMAIN) {
          if (!sameInd || targetLevel === ZOOM_LEVELS.INDUSTRY || !sameSub) {
            this.goBack();
            continue;
          }
          break; // we are in the correct subdomain
        }
        
        if (lvl === ZOOM_LEVELS.INDUSTRY) {
          if (!sameInd) {
            this.goToGalaxy();
            continue;
          }
          break; // we are in the correct industry
        }
      }

      // Phase 2: Go down to target
      await waitForIdle();
      if (this.getCurrentLevel() === ZOOM_LEVELS.GALAXY && industryId) {
        this.zoomToIndustry(industryId);
        await waitForIdle();
      }
      
      if (this.getCurrentLevel() === ZOOM_LEVELS.INDUSTRY && subdomainId) {
        this.zoomToSubdomain(industryId, subdomainId);
        await waitForIdle();
      }
      
      if ((this.getCurrentLevel() === ZOOM_LEVELS.SUBDOMAIN || this.getCurrentLevel() === ZOOM_LEVELS.COMPANY) && companyId && subdomainId && industryId) {
        this.zoomToCompany(industryId, subdomainId, companyId);
        await waitForIdle();
      }
    } finally {
      (this as any)._isRouting = false;
    }
  }

  goBack(): void {
    this.navigation?.goBack();
  }

  goToGalaxy(): void {
    this.navigation?.goToGalaxy();
  }

  zoomToIndustry(industryId: string): void {
    if (!this.navigation || !this._industries) return;
    const idx = this._industries.findIndex((i) => i.id === industryId);
    if (idx < 0) return;
    this.navigation.navigateToIndustry(this._industries[idx], idx, this._industries.length);
  }

  zoomToSubdomain(industryId: string, subdomainId: string): void {
    if (!this.navigation || !this._industries) return;
    const industry = this._industries.find((i) => i.id === industryId);
    if (!industry) return;
    const subdomain = industry.subdomains.find((s) => s.id === subdomainId);
    if (!subdomain) return;
    this.navigation.navigateToSubdomain(industry, subdomain);
  }

  zoomToCompany(industryId: string, subdomainId: string, companyId: string): void {
    if (!this.navigation || !this._industries) return;
    const industry = this._industries.find((i) => i.id === industryId);
    if (!industry) return;
    const subdomain = industry.subdomains.find((s) => s.id === subdomainId);
    if (!subdomain) return;
    const company = subdomain.companies.find((c) => c.id === companyId);
    if (!company) return;
    this.navigation.navigateToCompany(industry, subdomain, company);
  }

  getCurrentLevel(): ZoomLevel {
    return this.navigation?.currentLevel ?? ZOOM_LEVELS.GALAXY;
  }

  getNavigationPath(): NavPathEntry[] {
    return this.navigation?.navigationPath ?? [];
  }

  /** Force renderer + camera to re-read container dimensions. Call after visibility changes. */
  resize(): void {
    if (this._disposed || !this.engine) return;
    const { width, height } = this.engine._getSize();
    if (width === 0 || height === 0) return;
    this.engine.camera.aspect = width / height;
    this.engine.camera.updateProjectionMatrix();
    this.engine.renderer.setSize(width, height);
    if (this.engine.onResize) this.engine.onResize(width, height);
  }

  /**
   * Spawn a draft company planet into the current subdomain solar system.
   * Returns the draft company ID so React can track it for form binding.
   */
  spawnDraftCompany(industryId: string, subdomainId: string): string | null {
    if (!this.subdomainSolarSystem?.active) return null;
    const industry = this._industries?.find(i => i.id === industryId);
    const subdomain = industry?.subdomains.find(s => s.id === subdomainId);
    if (!industry || !subdomain) return null;

    const draftId = `draft-${Date.now()}`;
    const draftCompany = { id: draftId, name: 'New Company', employees: 10, departments: [] };

    const mesh = this.subdomainSolarSystem.addCompanyPlanet(draftCompany, subdomain, industry);
    if (!mesh) return null;

    // Add a floating label for the new planet
    this.labels.addSingleCompanyLabel(draftId, 'New Company', mesh, industry.color);

    return draftId;
  }

  /** Live-update the draft planet's label text as user types */
  updateDraftName(draftId: string, name: string): void {
    this.labels.updateCompanyLabelText(draftId, name);
    this.subdomainSolarSystem?.updateCompanyLabel(draftId, name);
  }

  /** Remove the draft company planet if the user cancels creation */
  removeDraftCompany(draftId: string): void {
    this.labels.removeSpecific(`company-${draftId}`);
    this.subdomainSolarSystem?.removeCompanyPlanet(draftId);
  }

  /**
   * Get the screen-space (CSS pixel) position of a company planet.
   * Used by React to draw a connector line from the form modal to the planet.
   */
  getCompanyScreenPos(companyId: string): { x: number; y: number } | null {
    if (!this.subdomainSolarSystem?.active || !this.engine) return null;
    const wp = this.subdomainSolarSystem.getCompanyWorldPosition(companyId);
    if (wp.lengthSq() === 0) return null;

    const v = wp.clone().project(this.engine.camera);
    const rect = this.container.getBoundingClientRect();
    return {
      x: (v.x * 0.5 + 0.5) * rect.width + rect.left,
      y: (-v.y * 0.5 + 0.5) * rect.height + rect.top,
    };
  }

  /**
   * Fly the camera to a draft company planet and freeze all orbits.
   * Planet is positioned so it fills the right portion of the screen
   * while the form panel sits on the left.
   */
  focusDraftPlanet(draftId: string): void {
    if (!this.subdomainSolarSystem?.active || !this.engine) return;
    const wp = this.subdomainSolarSystem.getCompanyWorldPosition(draftId);
    if (wp.lengthSq() === 0) return;

    // Freeze all orbits so the planet stays locked in place
    this.subdomainSolarSystem.freeze();

    // Hide the sun create button — it will reappear when modal closes
    this.labels.removeSunCreateButton();

    // Disable user controls so nothing interferes with the cinematic
    this.cameraCtrl.controls.enabled = false;

    // Camera positioned to the upper-left of the planet so it dominates
    // the RIGHT half of the screen while the form modal sits on the LEFT.
    // Distance ~38 units → planet (r=12) subtends ~35° of vertical FOV → very large.
    const camTarget = wp.clone();
    const camPos = wp.clone().add(new THREE.Vector3(-18, 8, 32));

    this.cameraCtrl.isTransitioning = true;
    gsap.to(this.engine.camera.position, {
      x: camPos.x, y: camPos.y, z: camPos.z,
      duration: 1.8,
      ease: 'power3.inOut',
      onUpdate: () => {
        this.engine.camera.lookAt(camTarget);
        this.cameraCtrl.controls.target.copy(camTarget);
      },
      onComplete: () => {
        this.cameraCtrl.isTransitioning = false;
        this.cameraCtrl.controls.target.copy(camTarget);
        // Keep controls disabled — user can only interact via the form
      },
    });
  }

  /** Unfreeze all orbits, re-enable controls, and fly camera back to subdomain overview. */
  unfocusDraftPlanet(): void {
    if (!this.subdomainSolarSystem?.active) return;
    this.subdomainSolarSystem.unfreeze();

    if (!this.engine) return;
    this.cameraCtrl.isTransitioning = true;
    gsap.to(this.engine.camera.position, {
      x: 0, y: 200, z: 750,
      duration: 1.4,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.engine.camera.lookAt(0, 0, 0);
        this.cameraCtrl.controls.target.set(0, 0, 0);
      },
      onComplete: () => {
        this.cameraCtrl.isTransitioning = false;
        this.cameraCtrl.controls.target.set(0, 0, 0);
        this.cameraCtrl.controls.update();
        this.cameraCtrl.controls.enabled = true;  // restore user controls

        // Re-show the create button
        const path = this.navigation?.navigationPath ?? [];
        const level = this.navigation?.currentLevel;
        if (level === ZOOM_LEVELS.SUBDOMAIN) {
          const industry = path[0]?.data;
          const subdomain = path[1]?.data;
          if (industry && subdomain) {
            this.labels.createSunCreateButton(industry.color, () => {
              this._callbacks?.onCreateCompany?.(industry, subdomain);
            });
          }
        }
      },
    });
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    gsap.globalTimeline.clear();

    this.engine?.stop();
    this.navigation?.dispose();
    this.labels?.dispose();
    this.iconParticles?.dispose();
    this.galaxyParticles?.dispose();
    this.cameraCtrl?.dispose();
    this.postProcessing?.dispose?.();
    this.engine?.dispose();
  }
}

export { ZOOM_LEVELS };
