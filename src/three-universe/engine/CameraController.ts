// @ts-nocheck
/**
 * CameraController.js — Cinematic Camera System
 * 
 * Smooth zoom-based navigation:
 * - Scroll wheel = continuous zoom in/out
 * - Orbit controls with heavy damping for cinematic feel
 * - GSAP fly-to for click-based transitions
 * - Auto-rotation at galaxy level
 * - Zoom threshold detection for level transitions
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';

export const ZOOM_LEVELS = {
  GALAXY: 'galaxy',
  INDUSTRY: 'industry',
  SUBDOMAIN: 'subdomain',
  COMPANY: 'company',
  DEPARTMENT: 'department',
};

export class CameraController {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;
    this.currentLevel = ZOOM_LEVELS.GALAXY;
    this.isTransitioning = false;
    this.autoRotateEnabled = true;
    this._flyTimeline = null;

    // Zoom state for massive scale
    this.targetDistance = 18000;
    this.currentDistance = 18000;

    this._initControls();
  }

  _initControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);

    // Heavy damping for smooth, cinematic feel
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.04;

    // Zoom range limits
    this.controls.minDistance = 3;
    this.controls.maxDistance = 38000;

    // Smooth zoom speed
    this.controls.zoomSpeed = 0.6;

    // Pan
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.4;

    // Rotation limits
    this.controls.maxPolarAngle = Math.PI * 0.82;
    this.controls.minPolarAngle = Math.PI * 0.18;

    // Rotation inertia
    this.controls.rotateSpeed = 0.5;

    // Auto-rotate at galaxy level
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.06;

    // Disable the default scroll zoom — we'll override
    this.controls.enableZoom = true;

    // Mouse buttons
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };

    // Touch
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // Manage auto-rotate on user interaction
    this._autoRotateTimer = null;
    this.controls.addEventListener('start', () => {
      this.autoRotateEnabled = false;
      this.controls.autoRotate = false;
      clearTimeout(this._autoRotateTimer);
    });

    this.controls.addEventListener('end', () => {
      clearTimeout(this._autoRotateTimer);
      this._autoRotateTimer = setTimeout(() => {
        if (this.currentLevel === ZOOM_LEVELS.GALAXY && !this.isTransitioning) {
          this.autoRotateEnabled = true;
          this.controls.autoRotate = true;
        }
      }, 6000);
    });
  }

  /**
   * Fly the camera to a target with cinematic GSAP transition.
   */
  flyTo(targetPosition, distance, level, onComplete) {
    if (this.isTransitioning) {
      // Kill previous transition
      if (this._flyTimeline) this._flyTimeline.kill();
    }
    this.isTransitioning = true;
    this.controls.autoRotate = false;

    // Calculate camera destination
    const currentDir = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls.target)
      .normalize();

    // If direction is too vertical, adjust
    if (Math.abs(currentDir.y) > 0.9) {
      currentDir.set(0.5, 0.4, 0.5).normalize();
    }

    const newCamPos = new THREE.Vector3()
      .copy(targetPosition)
      .add(currentDir.multiplyScalar(distance));

    // Ensure above plane
    newCamPos.y = Math.max(newCamPos.y, targetPosition.y + distance * 0.25);

    const duration = this._getTransitionDuration(distance);

    this._flyTimeline = gsap.timeline({
      onComplete: () => {
        this.currentLevel = level;
        this.isTransitioning = false;
        this._flyTimeline = null;

        // Resume auto-rotate at galaxy level
        if (level === ZOOM_LEVELS.GALAXY) {
          this._autoRotateTimer = setTimeout(() => {
            this.autoRotateEnabled = true;
            this.controls.autoRotate = true;
            this.controls.autoRotateSpeed = 0.06;
          }, 1000);
        }

        if (onComplete) onComplete();
      },
    });

    // Animate camera position with strong ease
    this._flyTimeline.to(
      this.camera.position,
      {
        x: newCamPos.x,
        y: newCamPos.y,
        z: newCamPos.z,
        duration,
        ease: 'power3.inOut',
      },
      0
    );

    // Animate orbit target
    this._flyTimeline.to(
      this.controls.target,
      {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration,
        ease: 'power3.inOut',
      },
      0
    );
  }

  /**
   * Get transition duration based on travel distance
   */
  _getTransitionDuration(targetDistance) {
    const currentDist = this.getDistanceToTarget();
    const travel = Math.abs(currentDist - targetDistance);

    // Massive travel distances require slightly more time, but keep it speedy
    if (travel > 10000) return 2.8;
    if (travel > 2000) return 2.2;
    if (travel > 1000) return 1.8;
    if (travel > 300) return 1.5;
    if (travel > 50) return 1.2;
    return 0.9;
  }

  /**
   * Fly back to galaxy view
   */
  flyToGalaxy(onComplete) {
    this.flyTo(
      new THREE.Vector3(0, 0, 0),
      28000,
      ZOOM_LEVELS.GALAXY,
      onComplete
    );
  }

  /**
   * Get current camera distance to orbit target
   */
  /** Cap zoom-out at industry level so user can't drift to galaxy view manually */
  setZoomCap(max) {
    this.controls.maxDistance = max;
  }

  getDistanceToTarget() {
    return this.camera.position.distanceTo(this.controls.target);
  }

  /**
   * Get normalized zoom (0 = closest, 1 = farthest)
   */
  getZoomNormalized() {
    const dist = this.getDistanceToTarget();
    return THREE.MathUtils.clamp(
      (dist - this.controls.minDistance) /
        (this.controls.maxDistance - this.controls.minDistance),
      0,
      1
    );
  }

  update() {
    this.controls.update();
  }

  dispose() {
    this.controls.dispose();
    clearTimeout(this._autoRotateTimer);
    if (this._flyTimeline) this._flyTimeline.kill();
  }
}
