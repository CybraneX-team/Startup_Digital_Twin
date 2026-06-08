import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import type { UExternalNode } from '../../lib/universalPolytopeData';
import { U_DOMAIN_COLOR } from '../../lib/universalPolytopeData';
import { PlasmaSphere, GlowRing } from '../PolytopeShared';
import { InternalNode } from '../polytope/InternalNode';
import { computeInternalNodePosition } from '../polytope/internalNodeLayout';

export interface RootInternalNodeSceneProps {
  root: UExternalNode;
  selectedInternalPath: string[];
  onPathChange: (path: string[]) => void;
  requestBackStep?: number;
  /** Increment when switching roots — resets camera */
  rootSwitchKey?: number;
}

const ROOT_POS = new THREE.Vector3(0, 0, 8);
const CAMERA_DIST = 26;
const CAMERA_ZOOM_IN = 14;
const NODES_REVEAL_DELAY_MS = 320;

export function RootInternalNodeScene({
  root,
  selectedInternalPath,
  onPathChange,
  requestBackStep = 0,
  rootSwitchKey = 0,
}: RootInternalNodeSceneProps) {
  const color = U_DOMAIN_COLOR[root.domain] ?? '#8b5cf6';
  const { camera } = useThree();
  const orbitRef = useRef<any>(null);
  const rootVisualRef = useRef<THREE.Group>(null);
  const rootEdgesMatRef = useRef<THREE.LineBasicMaterial>(null);
  const isDeepDrillDown = selectedInternalPath.length > 0;
  const prevBackStepRef = useRef(0);
  const setBackInfo = useCallback((_info: { label: string; onClick: () => void } | null) => {}, []);

  const internalPositions = useMemo(() => {
    const n = root.internalNodes.length;
    return root.internalNodes.map((_, i) => computeInternalNodePosition(ROOT_POS, i, n));
  }, [root.internalNodes]);

  const internalEdgesGeometry = useMemo(() => {
    if (internalPositions.length === 0) return null;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < internalPositions.length; i++) {
      pts.push(internalPositions[i].clone());
      pts.push(internalPositions[(i + 1) % internalPositions.length].clone());
      pts.push(internalPositions[i].clone());
      pts.push(ROOT_POS.clone());
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [internalPositions]);

  useEffect(() => {
    if (selectedInternalPath.length > 0) {
      // If we mount directly into a deep path, don't play the root zoom-out animation
      // The InternalNode will trigger onNodeFocus
      return;
    }
    
    camera.position.set(0, 0, CAMERA_ZOOM_IN);
    if (orbitRef.current) {
      orbitRef.current.target.set(ROOT_POS.x, ROOT_POS.y, ROOT_POS.z);
      orbitRef.current.update();
    }

    const revealDelay = NODES_REVEAL_DELAY_MS / 1000;
    const camTween = gsap.to(camera.position, {
      x: 0, y: 0, z: CAMERA_DIST,
      duration: 1.05,
      delay: revealDelay,
      ease: 'power2.out',
      onUpdate: () => orbitRef.current?.update(),
    });

    let targetTween: gsap.core.Tween | undefined;
    if (orbitRef.current) {
      targetTween = gsap.to(orbitRef.current.target, {
        x: ROOT_POS.x, y: ROOT_POS.y, z: ROOT_POS.z,
        duration: 0.8,
        delay: revealDelay,
        ease: 'power2.out',
        onUpdate: () => orbitRef.current?.update(),
      });
    }

    return () => {
      camTween.kill();
      targetTween?.kill();
    };
  }, [root.id, rootSwitchKey, camera]);

  const flyToRootOverview = useCallback(() => {
    if (orbitRef.current) {
      gsap.to(orbitRef.current.target, { x: ROOT_POS.x, y: ROOT_POS.y, z: ROOT_POS.z, duration: 1.0, ease: 'power2.inOut' });
    }
    gsap.to(camera.position, { x: 0, y: 0, z: CAMERA_DIST, duration: 1.0, ease: 'power2.inOut' });
  }, [camera]);

  const handleNodeFocus = useCallback((targetPos: THREE.Vector3) => {
    if (orbitRef.current) {
      gsap.to(orbitRef.current.target, { x: targetPos.x, y: targetPos.y, z: targetPos.z, duration: 1.0, ease: 'power2.inOut' });
      const dir = targetPos.clone().sub(ROOT_POS).normalize();
      const targetCamPos = targetPos.clone().add(dir.multiplyScalar(10));
      gsap.to(camera.position, { x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z, duration: 1.0, ease: 'power2.inOut' });
    }
  }, [camera]);

  const handleInternalClick = (path: string[], _targetPos: THREE.Vector3) => {
    if (path.length === 0) {
      onPathChange([]);
      flyToRootOverview();
      return;
    }
    onPathChange(path);
    // targetPos camera animation will be handled by handleNodeFocus triggered by InternalNode
  };

  useEffect(() => {
    if (!requestBackStep || requestBackStep === prevBackStepRef.current) return;
    prevBackStepRef.current = requestBackStep;

    if (selectedInternalPath.length > 0) {
      onPathChange(selectedInternalPath.slice(0, -1));
    } else {
      onPathChange([]);
      flyToRootOverview();
    }
  }, [requestBackStep, onPathChange, selectedInternalPath, flyToRootOverview]);

  useFrame(() => {
    if (rootVisualRef.current) {
      const target = isDeepDrillDown ? 0 : 1;
      rootVisualRef.current.scale.lerp(
        new THREE.Vector3(target, target, target),
        0.12,
      );
    }
    if (rootEdgesMatRef.current) {
      const targetOpacity = isDeepDrillDown ? 0 : 0.35;
      rootEdgesMatRef.current.opacity = THREE.MathUtils.lerp(
        rootEdgesMatRef.current.opacity,
        targetOpacity,
        0.1,
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 0, 12]} intensity={1.8} color="#ffffff" distance={40} />
      <directionalLight position={[8, 12, 10]} intensity={0.9} />
      <Stars radius={80} depth={40} count={2500} factor={3} saturation={0.4} fade speed={0.3} />

      <group>
        <group ref={rootVisualRef} position={ROOT_POS}>
          <GlowRing color={color} active={!isDeepDrillDown} isSelected={true} idx={0} />
          <PlasmaSphere
            color={color}
            radius={0.42}
            opacity={1}
            glowIntensity={2.8}
            depthWrite={true}
            speed={1.2}
          />
          {!isDeepDrillDown && (
            <Html position={[0, -1.4, 0]} center zIndexRange={[100, 0]}>
              <div style={{
                color: 'white',
                background: 'rgba(0,0,0,0.65)',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                backdropFilter: 'blur(6px)',
                border: `1px solid ${color}55`,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                boxShadow: `0 0 20px ${color}40`,
              }}>
                {root.label}
              </div>
            </Html>
          )}
        </group>

        {internalEdgesGeometry && (
          <lineSegments geometry={internalEdgesGeometry}>
            <lineBasicMaterial
              ref={rootEdgesMatRef}
              color={color}
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </lineSegments>
        )}

        {root.internalNodes.map((intNode, i) => {
          const isChildVisible =
            selectedInternalPath.length === 0 ||
            selectedInternalPath[selectedInternalPath.length - 1] === intNode.id ||
            selectedInternalPath.includes(intNode.id);
          return (
            <InternalNode
              key={intNode.id}
              node={intNode}
              targetPos={internalPositions[i]}
              startPos={ROOT_POS}
              color={color}
              depth={1}
              selectedPath={selectedInternalPath}
              onSelectPath={handleInternalClick}
              pathContext={[]}
              parentPos={ROOT_POS}
              isVisible={isChildVisible}
              parentLabel={root.label}
              setBackInfo={setBackInfo}
              onNodeFocus={handleNodeFocus}
            />
          );
        })}
      </group>

      <OrbitControls
        ref={orbitRef}
        enablePan={false}
        minDistance={8}
        maxDistance={55}
        target={ROOT_POS}
      />
    </>
  );
}
