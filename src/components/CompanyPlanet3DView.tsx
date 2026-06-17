import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';


import type { CompanyPlanetContext } from '../data/companyPlanetRoots';
import { getPlanetNodesAtPath, canDrillInto } from '../data/companyPlanetRoots';
import { PlasmaSphere } from './PolytopeShared';
import { useSavedWorkflows, COMPANY_TAG_COLORS } from '../lib/useSavedWorkflows';
import { InternalNode } from './polytope/InternalNode';
import { computeInternalNodePosition, computeCameraFraming } from './polytope/internalNodeLayout';
import type { UExternalNode } from '../lib/universalPolytopeData';
import { U_DOMAIN_COLOR } from '../lib/universalPolytopeData';
import { useDragWorkspaceStore } from '../lib/useDragWorkspaceStore';

export interface CompanyPlanet3DViewProps {
  context: CompanyPlanetContext;
  depth: number;
  path: string[];
  requestFocusRootId?: string | null;
  onFocusTransitionComplete: (rootId: string) => void;
  onDrillInto: (nodeId: string) => void;
  onDrillBack: () => void;
  onActionNodeClick?: (rootId: string, branchId: string, actionId: string) => void;
  industryColor?: string;
  /** When set, the scene animates zooming OUT from this root node position */
  zoomOutFromRootId?: string | null;
  /** Called when zoom-out animation finishes */
  onZoomOutComplete?: () => void;
  coreColor?: string;

  // Unified drill-in state
  insideRootPolytope?: boolean;
  activeRootDept?: UExternalNode | null;
  rootPolytopeInternalPath?: string[];
  onInternalPathChange?: (path: string[]) => void;
  rootPolytopeBackStep?: number;
  onBack?: () => void;
  rootSwitchKey?: number;
}

const RING_RADIUS = 7.5;
const CORE_RADIUS = 1.4;
const NODE_RADIUS = 0.8;

// Phase 1: camera zooms toward the node (0.8s)
const ZOOM_IN_DURATION = 0.8;
// Phase 2: short pause while node is filling view (0.05s)
const HOLD_DURATION = 0.05;
// Total time before we signal transition complete
export const ROOT_FOCUS_TOTAL_MS = (ZOOM_IN_DURATION + HOLD_DURATION) * 1000 + 100;

// Zoom-out timing
const ZOOM_OUT_DURATION = 0.9;

function SceneContent({
  context,
  path,
  requestFocusRootId,
  onFocusTransitionComplete,
  onDrillInto,
  industryColor = '#C1AEFF',
  zoomOutFromRootId,
  onZoomOutComplete,
  coreColor = '#C1AEFF',
  insideRootPolytope,
  activeRootDept,
  rootPolytopeInternalPath = [],
  onInternalPathChange,
  rootPolytopeBackStep = 0,
  onBack,
}: CompanyPlanet3DViewProps) {
  const { camera } = useThree();
  const orbitRef = useRef<any>(null);
  const isDragging = useDragWorkspaceStore(s => s.isDragging);
  
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusRootId, setFocusRootId] = useState<string | null>(null);
  
  // Animated values for smooth fade of non-focused nodes
  const fadeProgress = useRef(0); // 0 = all visible, 1 = only focused visible
  const scaleProgress = useRef(1); // scale of the focused node (grows as we zoom in)
  const expandProgress = useRef(0); // 0 = sub-nodes at center, 1 = fully expanded
  const isFirstMountRef = useRef(true);
  const rootEdgesMatRef = useRef<THREE.LineBasicMaterial>(null);

  // Sync focusRootId state with activeRootDept prop
  useEffect(() => {
    if (activeRootDept) {
      setFocusRootId(activeRootDept.id);
    } else {
      setFocusRootId(null);
    }
  }, [activeRootDept]);

  const nodes = useMemo(() => getPlanetNodesAtPath(context, path), [context, path]);

  // Node layout on the XY plane
  const layout = useMemo(() => {
    const n = Math.max(nodes.length, 1);
    return nodes.map((node, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * RING_RADIUS;
      const y = Math.sin(angle) * RING_RADIUS;
      const z = 0;
      return {
        ...node,
        angle,
        pos: new THREE.Vector3(x, y, z),
      };
    });
  }, [nodes]);

  // Initial camera pos
  useEffect(() => {
    if (!isFirstMountRef.current) return;
    isFirstMountRef.current = false;

    // If we are zooming out from a root, start camera at that node
    if (zoomOutFromRootId) {
      const targetNode = layout.find(n => n.id === zoomOutFromRootId);
      if (targetNode) {
        camera.position.set(targetNode.pos.x, targetNode.pos.y, targetNode.pos.z + 7.5);
        if (orbitRef.current) {
          orbitRef.current.target.set(targetNode.pos.x, targetNode.pos.y, targetNode.pos.z);
        }
        camera.lookAt(targetNode.pos.x, targetNode.pos.y, targetNode.pos.z);
        fadeProgress.current = 1; // everything hidden initially
        return;
      }
    }
    camera.position.set(0, 0, 28);
    camera.lookAt(0, 0, 0);
  }, [camera, layout, zoomOutFromRootId]);

  // 1. Progress transitions (runs when entering/exiting root polytope)
  useEffect(() => {
    if (insideRootPolytope && activeRootDept) {
      gsap.to(expandProgress, {
        current: 1,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.4,
      });

      gsap.to(scaleProgress, {
        current: 1.0,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.4,
      });
    } else {
      gsap.to(expandProgress, {
        current: 0,
        duration: 0.4,
        ease: 'power2.out',
      });
      gsap.to(scaleProgress, {
        current: 1.0,
        duration: 0.4,
        ease: 'power2.out',
      });
    }
  }, [insideRootPolytope, !!activeRootDept]);

  // 2. Camera Focus & Framing transitions (runs on drill-down level/path changes)
  useEffect(() => {
    if (!insideRootPolytope || !activeRootDept) return;

    const deptNode = layout.find(n => n.id === activeRootDept.id);
    if (!deptNode) return;

    const ROOT_POS = deptNode.pos;
    let targetPos = ROOT_POS.clone();
    let childrenCount = activeRootDept.internalNodes.length;
    let baseZoomDist = 14.5;

    if (rootPolytopeInternalPath.length === 1) {
      const branchId = rootPolytopeInternalPath[0];
      const branchIdx = activeRootDept.internalNodes.findIndex(n => n.id === branchId);
      if (branchIdx !== -1) {
        targetPos = computeInternalNodePosition(ROOT_POS, branchIdx, activeRootDept.internalNodes.length, 'flat');
        const branch = activeRootDept.internalNodes[branchIdx];
        childrenCount = branch.children?.length ?? 0;
        baseZoomDist = 10;
      }
    } else if (rootPolytopeInternalPath.length === 2) {
      const branchId = rootPolytopeInternalPath[0];
      const actionId = rootPolytopeInternalPath[1];
      const branchIdx = activeRootDept.internalNodes.findIndex(n => n.id === branchId);
      if (branchIdx !== -1) {
        const branch = activeRootDept.internalNodes[branchIdx];
        const branchPos = computeInternalNodePosition(ROOT_POS, branchIdx, activeRootDept.internalNodes.length, 'flat');
        const actionIdx = branch.children?.findIndex(c => c.id === actionId);
        if (actionIdx !== -1 && actionIdx !== undefined) {
          const ringRadius = 1.8; // ringRadius at depth = 1
          const dir = new THREE.Vector3(0, 0, 1);
          const right = new THREE.Vector3(1, 0, 0);
          const up = new THREE.Vector3(0, 1, 0);
          const depthStep = 0.5;
          const childCenter = branchPos.clone().add(dir.clone().multiplyScalar(depthStep));
          const angle = (actionIdx / (branch.children?.length ?? 1)) * Math.PI * 2;
          targetPos = childCenter.clone()
            .add(right.clone().multiplyScalar(Math.cos(angle) * ringRadius))
            .add(up.clone().multiplyScalar(Math.sin(angle) * ringRadius));
          childrenCount = 0;
          baseZoomDist = 10;
        }
      }
    }

    const dir = new THREE.Vector3(0, 0, 1);
    const { camPos, orbitTarget } = computeCameraFraming(targetPos, dir, childrenCount, baseZoomDist);

    gsap.killTweensOf(camera.position);
    gsap.to(camera.position, {
      x: camPos.x,
      y: camPos.y,
      z: camPos.z,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete: () => {
        setIsZoomingIn(false);
      },
    });

    if (orbitRef.current) {
      gsap.killTweensOf(orbitRef.current.target);
      gsap.to(orbitRef.current.target, {
        x: orbitTarget.x,
        y: orbitTarget.y,
        z: orbitTarget.z,
        duration: 1.2,
        ease: 'power2.inOut',
      });
    }
  }, [insideRootPolytope, activeRootDept?.id, layout, camera, rootPolytopeInternalPath]);

  // Handle zoom-out animation when returning from inner nodes to company overview
  useEffect(() => {
    if (!zoomOutFromRootId) return;
    const targetNode = layout.find(n => n.id === zoomOutFromRootId);
    if (!targetNode) {
      onZoomOutComplete?.();
      return;
    }

    // Small delay to let the component mount and render
    const startTimeout = setTimeout(() => {
      // Animate fade: reveal all nodes
      gsap.to(fadeProgress, {
        current: 0,
        duration: ZOOM_OUT_DURATION * 0.6,
        ease: 'power2.out',
      });

      // Zoom camera back to default position
      if (orbitRef.current) {
        gsap.killTweensOf(orbitRef.current.target);
        gsap.to(orbitRef.current.target, {
          x: 0, y: 0, z: 0,
          duration: ZOOM_OUT_DURATION,
          ease: 'power2.inOut',
        });
      }
      gsap.killTweensOf(camera.position);
      gsap.to(camera.position, {
        x: 0, y: 0, z: 28,
        duration: ZOOM_OUT_DURATION,
        ease: 'power2.inOut',
        onComplete: () => {
          onZoomOutComplete?.();
        },
      });
    }, 50);

    return () => clearTimeout(startTimeout);
  }, [zoomOutFromRootId, layout, camera, onZoomOutComplete]);

  const [isZoomingIn, setIsZoomingIn] = useState(false);

  const handleNodeClick = (nodeId: string, nodePos: THREE.Vector3) => {
    if (insideRootPolytope && activeRootDept && nodeId === activeRootDept.id) {
      if (rootPolytopeInternalPath.length === 0) {
        onBack?.();
        return;
      }
    }

    if (focusRootId) return; // already transitioning

    if (canDrillInto(context, path, nodeId)) {
      setFocusRootId(nodeId);
      setIsZoomingIn(true);
      
      // Animate fade progress to hide other nodes — smooth
      gsap.to(fadeProgress, {
        current: 1,
        duration: 0.6,
        ease: 'power2.out',
      });

      // Grow the circle during the start of the zoom
      gsap.to(scaleProgress, {
        current: 1.05,
        duration: 0.4,
        ease: 'power2.inOut',
      });

      onFocusTransitionComplete(nodeId);
    } else {
      onDrillInto(nodeId);
    }
  };

  const prevBackStepRef = useRef(0);
  useEffect(() => {
    if (!rootPolytopeBackStep || rootPolytopeBackStep === prevBackStepRef.current) return;
    prevBackStepRef.current = rootPolytopeBackStep;

    if (rootPolytopeInternalPath.length > 0) {
      const nextPath = rootPolytopeInternalPath.slice(0, -1);
      onInternalPathChange?.(nextPath);
    }
  }, [rootPolytopeBackStep, onInternalPathChange, rootPolytopeInternalPath]);

  useEffect(() => {
    if (requestFocusRootId && !focusRootId) {
      const targetNode = layout.find(n => n.id === requestFocusRootId);
      if (targetNode) {
        handleNodeClick(requestFocusRootId, targetNode.pos);
      }
    }
  }, [requestFocusRootId, layout, focusRootId]);

  const isTransitioning = focusRootId != null && !insideRootPolytope;
  const isZoomingOut = zoomOutFromRootId != null;
  const isDeepDrillDown = rootPolytopeInternalPath.length > 0;

  // Use useFrame to smoothly apply fadeProgress/scaleProgress each frame
  const groupRefs = useRef<Map<string, THREE.Group>>(new Map());
  const coreRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (orbitRef.current) {
      orbitRef.current.update();
    }

    const fp = fadeProgress.current;
    
    // Fade core orb
    if (coreRef.current) {
      const coreOpacity = 1 - fp;
      coreRef.current.visible = coreOpacity > 0.01;
      coreRef.current.scale.setScalar(1 - fp * 0.3);
    }

    // Fade/scale individual nodes
    layout.forEach(node => {
      const group = groupRefs.current.get(node.id);
      if (!group) return;
      
      const isFocused = node.id === focusRootId || node.id === zoomOutFromRootId;
      
      if (isFocused) {
        // Hide focused department circle when deep drilling down (e.g. at branch/action level)
        const targetScale = isDeepDrillDown ? 0.0 : (focusRootId ? scaleProgress.current : (1 + (1 - fp) * 0));
        group.scale.setScalar(targetScale);
        group.visible = targetScale > 0.01;
      } else {
        // Other nodes scale down smoothly
        const targetScale = 1 - fp;
        group.scale.setScalar(targetScale);
        group.visible = targetScale > 0.01;
      }
    });

    // Animate root edges opacity
    if (rootEdgesMatRef.current) {
      const isDeepDrillDown = rootPolytopeInternalPath.length > 0;
      const targetOpacity = isDeepDrillDown ? 0 : 0.35;
      rootEdgesMatRef.current.opacity = THREE.MathUtils.lerp(
        rootEdgesMatRef.current.opacity,
        targetOpacity * expandProgress.current,
        0.1
      );
    }
  });

  return (
    <>
      <OrbitControls
        ref={orbitRef}
        enablePan={false}
        enableZoom={!isTransitioning && !isZoomingIn && !isZoomingOut && !isDragging}
        enableRotate={!isTransitioning && !isZoomingIn && !isZoomingOut && !isDragging}
        minDistance={3}
        maxDistance={45}
        enabled={!isDragging}
      />
      <Stars radius={80} depth={40} count={3500} factor={3} saturation={0.5} fade speed={0.4} />

      <group>
        {/* Edges Removed */}

        {/* Center Orb */}
        <group ref={coreRef}>
          <PlasmaSphere color={coreColor} radius={CORE_RADIUS} opacity={0.65} glowIntensity={0.7} />
          
          <Html position={[0, -CORE_RADIUS - 0.5, 0]} center zIndexRange={[100, 0]}>
            <div
              className="px-3 py-1 rounded-full text-white font-bold text-sm text-center"
              style={{
                background: 'rgba(4,4,12,0.85)',
                border: `1px solid ${coreColor}80`,
                backdropFilter: 'blur(9px)',
                pointerEvents: 'none',
                minWidth: 'max-content',
                opacity: focusRootId ? 0 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {context.companyName}
            </div>
          </Html>
        </group>

        {/* Orbit Nodes */}
        {layout.map((node) => {
          const isFocus = node.id === focusRootId;
          const isOther = focusRootId != null && !isFocus;
          const isHovered = hoveredId === node.id;
          const baseScale = isHovered && !isTransitioning ? 1.15 : 1;



          return (
            <group
              key={node.id}
              position={node.pos}
              ref={(ref) => {
                if (ref) groupRefs.current.set(node.id, ref);
              }}
            >
              <group scale={baseScale}>
                <mesh
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isZoomingOut) handleNodeClick(node.id, node.pos);
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    if (!isTransitioning && !isZoomingOut) {
                      setHoveredId(node.id);
                      document.body.style.cursor = 'pointer';
                    }
                  }}
                  onPointerOut={() => {
                    setHoveredId(null);
                    document.body.style.cursor = 'auto';
                  }}
                >
                  <sphereGeometry args={[NODE_RADIUS * 1.5, 16, 16]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>

                <PlasmaSphere
                  color={node.color || industryColor}
                  radius={NODE_RADIUS}
                  opacity={0.7}
                  glowIntensity={0.7}
                  halo={true}
                />

                {/* HTML Label */}
                <Html position={[0, -NODE_RADIUS - 0.7, 0]} center zIndexRange={[100, 0]}>
                  <div
                    className="flex flex-col items-center pointer-events-none"
                    style={{
                      opacity: (isOther || (isFocus && isDeepDrillDown)) ? 0 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <div
                      className="px-3 py-1 rounded-full text-white font-bold text-[11px]"
                      style={{
                        background: 'rgba(4,4,12,0.9)',
                        border: `1px solid ${node.color}66`,
                        backdropFilter: 'blur(4px)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {node.label}
                    </div>
                  </div>
                </Html>

              </group>
            </group>
          );
        })}

        {/* Unified BDT internal nodes */}
        {insideRootPolytope && activeRootDept && (() => {
          const deptNode = layout.find(n => n.id === activeRootDept.id);
          if (!deptNode) return null;
          const ROOT_POS = deptNode.pos;
          const color = U_DOMAIN_COLOR[activeRootDept.domain] ?? '#8b5cf6';
          
          // Calculate positions for the active root's internal nodes
          const n = activeRootDept.internalNodes.length;
          const internalPositions = activeRootDept.internalNodes.map((_, i) =>
            computeInternalNodePosition(ROOT_POS, i, n, 'flat')
          );

          const edgesGeo = (() => {
            if (internalPositions.length === 0) return null;
            const pts: THREE.Vector3[] = [];
            for (let i = 0; i < internalPositions.length; i++) {
              pts.push(internalPositions[i].clone());
              pts.push(internalPositions[(i + 1) % internalPositions.length].clone());
              pts.push(internalPositions[i].clone());
              pts.push(ROOT_POS.clone());
            }
            return new THREE.BufferGeometry().setFromPoints(pts);
          })();

          return (
            <group>
              {edgesGeo && (
                <lineSegments geometry={edgesGeo}>
                  <lineBasicMaterial
                    ref={rootEdgesMatRef}
                    color={color}
                    transparent
                    opacity={0.35 * expandProgress.current}
                    depthWrite={false}
                  />
                </lineSegments>
              )}
              {activeRootDept.internalNodes.map((intNode, i) => {
                const isChildVisible =
                  rootPolytopeInternalPath.length === 0 ||
                  rootPolytopeInternalPath[rootPolytopeInternalPath.length - 1] === intNode.id ||
                  rootPolytopeInternalPath.includes(intNode.id);
                return (
                  <InternalNode
                    key={intNode.id}
                    node={intNode}
                    targetPos={internalPositions[i]}
                    startPos={ROOT_POS}
                    color={color}
                    depth={1}
                    selectedPath={rootPolytopeInternalPath}
                    onSelectPath={(path) => {
                      onInternalPathChange?.(path);
                    }}
                    pathContext={[]}
                    parentPos={ROOT_POS}
                    isVisible={isChildVisible}
                    parentLabel={activeRootDept.label}
                    setBackInfo={() => {}}
                    onNodeFocus={() => {}}
                    rootPos={ROOT_POS}
                    revealDelayMs={400}
                  />
                );
              })}
            </group>
          );
        })()}
      </group>
    </>
  );
}

export default function CompanyPlanet3DView(props: CompanyPlanet3DViewProps) {
  const { items } = useSavedWorkflows();
  const savedItem = items.find(
    i => i.level === 'planet' && i.companyId === props.context.companyId && i.role === props.context.role
  );
  const activeTag = savedItem?.planetTag;
  const coreColor = activeTag ? COMPANY_TAG_COLORS[activeTag] : props.industryColor || '#C1AEFF';

  return (
    <div 
      className="absolute inset-0 z-30"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(18,10,36,1) 0%, rgba(2,2,6,1) 65%)' }}
    >
      <Canvas
        camera={{ position: [0, 0, 28], fov: 45, near: 0.1, far: 300 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <SceneContent {...props} coreColor={coreColor} />
      </Canvas>
      {props.depth > 0 && (
        <button
          type="button"
          onClick={() => props.onDrillBack()}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full text-[11px] font-medium text-gray-300 hover:text-white transition-colors"
          style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          ← Back
        </button>
      )}
    </div>
  );
}
