import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';


import type { CompanyPlanetContext } from '../data/companyPlanetRoots';
import { getPlanetNodesAtPath, canDrillInto } from '../data/companyPlanetRoots';
import { PlasmaSphere } from './PolytopeShared';


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
}

const RING_RADIUS = 7.5;
const CORE_RADIUS = 1.4;
const NODE_RADIUS = 0.8;

// Phase 1: camera zooms toward the node (0.8s)
const ZOOM_IN_DURATION = 0.8;
// Phase 2: short pause while node is filling view (0.15s)
const HOLD_DURATION = 0.15;
// Total time before we signal transition complete
export const ROOT_FOCUS_TOTAL_MS = (ZOOM_IN_DURATION + HOLD_DURATION) * 1000 + 100;

// Zoom-out timing
const ZOOM_OUT_DURATION = 0.85;

function SceneContent({
  context,
  path,
  requestFocusRootId,
  onFocusTransitionComplete,
  onDrillInto,
  industryColor = '#C1AEFF',
  zoomOutFromRootId,
  onZoomOutComplete,
}: CompanyPlanet3DViewProps) {
  const { camera } = useThree();
  const orbitRef = useRef<any>(null);
  
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusRootId, setFocusRootId] = useState<string | null>(null);
  // Animated values for smooth fade of non-focused nodes
  const fadeProgress = useRef(0); // 0 = all visible, 1 = only focused visible
  const scaleProgress = useRef(1); // scale of the focused node (grows as we zoom in)



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
    // If we are zooming out from a root, start camera at that node
    if (zoomOutFromRootId) {
      const targetNode = layout.find(n => n.id === zoomOutFromRootId);
      if (targetNode) {
        camera.position.set(targetNode.pos.x, targetNode.pos.y, targetNode.pos.z + 1.5);
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

  // Handle zoom-out animation when returning from inner nodes
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
        gsap.to(orbitRef.current.target, {
          x: 0, y: 0, z: 0,
          duration: ZOOM_OUT_DURATION,
          ease: 'power2.inOut',
        });
      }
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

  const handleNodeClick = (nodeId: string, nodePos: THREE.Vector3) => {
    if (focusRootId) return; // already transitioning

    if (canDrillInto(context, path, nodeId)) {
      setFocusRootId(nodeId);
      
      // Animate fade progress to hide other nodes — very fast
      gsap.to(fadeProgress, {
        current: 1,
        duration: 0.15,
        ease: 'power1.out',
      });

      // Animate scale of focused node growing
      gsap.to(scaleProgress, {
        current: 3.5,
        duration: ZOOM_IN_DURATION,
        ease: 'power2.inOut',
      });

      // Zoom camera INTO the node (very close)
      if (orbitRef.current) {
        gsap.to(orbitRef.current.target, {
          x: nodePos.x, y: nodePos.y, z: nodePos.z,
          duration: ZOOM_IN_DURATION,
          ease: 'power2.inOut',
        });
      }
      const camTarget = nodePos.clone().add(new THREE.Vector3(0, 0, 1.5));
      gsap.to(camera.position, {
        x: camTarget.x, y: camTarget.y, z: camTarget.z,
        duration: ZOOM_IN_DURATION,
        ease: 'power2.inOut',
      });
      
      setTimeout(() => {
        onFocusTransitionComplete(nodeId);
      }, (ZOOM_IN_DURATION + HOLD_DURATION) * 1000 + 100);
    } else {
      onDrillInto(nodeId);
    }
  };

  useEffect(() => {
    if (requestFocusRootId && !focusRootId) {
      const targetNode = layout.find(n => n.id === requestFocusRootId);
      if (targetNode) {
        handleNodeClick(requestFocusRootId, targetNode.pos);
      }
    }
  }, [requestFocusRootId, layout, focusRootId]);

  const isTransitioning = focusRootId != null;
  const isZoomingOut = zoomOutFromRootId != null;

  // Use useFrame to smoothly apply fadeProgress/scaleProgress each frame
  const groupRefs = useRef<Map<string, THREE.Group>>(new Map());
  const coreRef = useRef<THREE.Group>(null);

  useFrame(() => {
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
        group.visible = true;
        // Focused node scales up as camera zooms in
        const s = focusRootId ? scaleProgress.current : (1 + (1 - fp) * 0);
        group.scale.setScalar(s);
      } else {
        // Other nodes fade out
        const vis = 1 - fp;
        group.visible = vis > 0.01;
        group.scale.setScalar(1);
      }
    });
  });

  return (
    <>
      <OrbitControls
        ref={orbitRef}
        enablePan={false}
        enableZoom={!isTransitioning && !isZoomingOut}
        enableRotate={!isTransitioning && !isZoomingOut}
        minDistance={3}
        maxDistance={40}
      />
      <Stars radius={80} depth={40} count={3500} factor={3} saturation={0.5} fade speed={0.4} />

      <group>
        {/* Edges Removed */}

        {/* Center Orb */}
        <group ref={coreRef}>
          <PlasmaSphere color={industryColor} radius={CORE_RADIUS} opacity={0.65} glowIntensity={0.7} />
          
          <Html position={[0, -CORE_RADIUS - 0.5, 0]} center zIndexRange={[100, 0]}>
            <div
              className="px-3 py-1 rounded-full text-white font-bold text-sm text-center"
              style={{
                background: 'rgba(4,4,12,0.85)',
                border: `1px solid ${industryColor}80`,
                backdropFilter: 'blur(9px)',
                pointerEvents: 'none',
                minWidth: 'max-content',
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
              <group scale={baseScale} visible={!isOther}>
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
                  visible={false}
                >
                  <sphereGeometry args={[NODE_RADIUS * 1.5, 16, 16]} />
                  <meshBasicMaterial />
                </mesh>

                <PlasmaSphere
                  color={node.color || industryColor}
                  radius={NODE_RADIUS}
                  opacity={isOther ? 0 : 0.7}
                  glowIntensity={isOther ? 0 : 0.7}
                  halo={!isOther}
                />

                {/* HTML Label */}
                <Html position={[0, -NODE_RADIUS - 0.7, 0]} center zIndexRange={[100, 0]}>
                  <div
                    className="flex flex-col items-center pointer-events-none"
                    style={{
                      opacity: isOther ? 0 : 1,
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
      </group>
    </>
  );
}

export default function CompanyPlanet3DView(props: CompanyPlanet3DViewProps) {
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
        <SceneContent {...props} />
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
