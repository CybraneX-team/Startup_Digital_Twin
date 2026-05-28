import { useRef, useState, useMemo, useEffect, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ConvexGeometry } from 'three-stdlib';
import { gsap } from 'gsap';
import { U_DOMAIN_COLOR } from '../../lib/universalPolytopeData';
import type { UExternalNode, UInternalNode } from '../../lib/universalPolytopeData';
import { OrgCore, PlasmaSphere } from '../PolytopeShared';
import { symmetricDirs, seededShuffle } from './geometry';
import { vertexShader, fragmentShader } from './shaders';
import { GlowRing } from './GlowRing';
import { ExternalNode } from './ExternalNode';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SceneProps {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  onPathChange: (path: string[]) => void;
  setBackInfo: (info: { label: string; onClick: () => void } | null) => void;
  companyName: string;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  departments: UExternalNode[];
  onExitIntent?: () => void;
  cameraResetTrigger?: number;
  requestSelectDeptId?: string | null;
  requestBackStep?: number;
  /** Draft external node — rendered as a pulsing preview vertex; not in store */
  draftDept?: UExternalNode | null;
  /** Ref that Scene writes the draft dept's screen-space position to each frame */
  draftNodeScreenPosRef?: MutableRefObject<{ x: number; y: number } | null>;
  /** Draft internal node — preview of a new node being added to the selected dept */
  draftInternalNode?: { deptId: string; node: UInternalNode } | null;
  /** Ref that Scene writes the draft internal node's screen-space position to each frame */
  draftInternalNodeScreenPosRef?: MutableRefObject<{ x: number; y: number } | null>;
}

// ── Scene ────────────────────────────────────────────────────────────────────

export function Scene({
  selectedId,
  setSelectedId,
  onPathChange,
  setBackInfo,
  companyName,
  hoveredId,
  setHoveredId,
  departments,
  onExitIntent,
  cameraResetTrigger,
  requestSelectDeptId,
  requestBackStep,
  draftDept,
  draftNodeScreenPosRef,
  draftInternalNode,
  draftInternalNodeScreenPosRef,
}: SceneProps) {
  // ── Derive geometry ───────────────────────────────────────────────────────
  // Draft dept is included so the convex hull + shader preview the exact final state.
  const {
    ACTIVE_NODES,
    ACTIVE_NODE_POSITIONS,
    SHUFFLED_ACTIVE_DIRS,
    NODE_COLORS,
    INITIAL_CAMERA_DISTANCE,
  } = useMemo(() => {
    const base = departments.filter(n => n.domain !== 'inactive');
    const nodes = draftDept ? [...base, draftDept] : base;
    const dirs = symmetricDirs(nodes.length);
    const shuffledDirs = seededShuffle(dirs, 137);
    const positions = nodes.map((_, i) => shuffledDirs[i].clone().multiplyScalar(12));
    const maxR = positions.length > 0 ? Math.max(...positions.map(p => p.length())) : 12;
    const colors = nodes.map(node => new THREE.Color(U_DOMAIN_COLOR[node.domain] ?? '#8b5cf6'));
    return {
      ACTIVE_NODES: nodes,
      ACTIVE_NODE_POSITIONS: positions,
      SHUFFLED_ACTIVE_DIRS: shuffledDirs,
      NODE_COLORS: colors,
      INITIAL_CAMERA_DISTANCE: Math.max(45, maxR * 4.5),
    };
  }, [departments, draftDept]); // eslint-disable-line react-hooks/exhaustive-deps

  const EXTERNAL_NODE_POSITIONS = ACTIVE_NODE_POSITIONS;
  const orbitRef = useRef<any>(null);
  const { camera, gl } = useThree();

  // ── Exit intent (scroll out while inside BH) ──────────────────────────────
  const onExitIntentRef = useRef(onExitIntent);
  onExitIntentRef.current = onExitIntent;
  useEffect(() => {
    if (!onExitIntentRef.current) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) onExitIntentRef.current?.();
    };
    gl.domElement.addEventListener('wheel', handleWheel, { passive: true });
    return () => gl.domElement.removeEventListener('wheel', handleWheel);
  }, [gl.domElement]);

  // ── Camera fly to draft dept node when a new draft is spawned ─────────────
  const prevDraftIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!draftDept) { prevDraftIdRef.current = null; return; }
    if (draftDept.id === prevDraftIdRef.current) return;
    prevDraftIdRef.current = draftDept.id;

    const draftIdx = ACTIVE_NODES.findIndex(n => n.id === draftDept.id);
    if (draftIdx === -1) return;
    const pos = ACTIVE_NODE_POSITIONS[draftIdx];

    if (orbitRef.current) {
      gsap.to(orbitRef.current.target, { x: pos.x, y: pos.y, z: pos.z, duration: 1.5, ease: 'power3.inOut' });
      const dir = pos.clone().normalize();
      const camTarget = pos.clone().add(dir.multiplyScalar(22));
      gsap.to(camera.position, { x: camTarget.x, y: camTarget.y, z: camTarget.z, duration: 1.5, ease: 'power3.inOut' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftDept?.id]);

  // ── Camera reset to overview (entry, create confirm, draft cancel) ─────────
  useEffect(() => {
    if (!cameraResetTrigger) return;
    setSelectedId(null);
    setSelectedInternalPath([]);
    onPathChange([]);
    cameraHistoryRef.current = [];
    if (orbitRef.current) {
      gsap.to(orbitRef.current.target, { x: 0, y: 0, z: 0, duration: 1.4, ease: 'power3.inOut' });
    }
    gsap.to(camera.position, { x: 0, y: 0, z: INITIAL_CAMERA_DISTANCE, duration: 1.4, ease: 'power3.inOut' });
  }, [cameraResetTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const facesMatRef = useRef<THREE.ShaderMaterial>(null);
  const coreGroupRef = useRef<THREE.Group>(null);
  const cameraPosRef = useRef(new THREE.Vector3());

  // ── Camera history for sidebar back-step navigation ───────────────────────
  const cameraHistoryRef = useRef<Array<{
    path: string[];
    orbitTarget: THREE.Vector3;
    camPos: THREE.Vector3;
  }>>([]);
  const prevBackStepRef = useRef(0);

  const [selectedInternalPath, setSelectedInternalPath] = useState<string[]>([]);
  const isDeepDrillDown = selectedInternalPath.length > 0;

  useEffect(() => {
    setSelectedInternalPath([]);
    setBackInfo(null);
    cameraHistoryRef.current = [];
  }, [selectedId, setBackInfo]);

  useEffect(() => {
    if (selectedId === null && orbitRef.current) {
      setSelectedInternalPath([]);
      gsap.to(orbitRef.current.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: 'power3.inOut' });
      const currentDir = camera.position.clone().normalize();
      const targetCamPos = currentDir.multiplyScalar(INITIAL_CAMERA_DISTANCE);
      gsap.to(camera.position, {
        x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z,
        duration: 1.5, ease: 'power3.inOut',
      });
    }
  }, [selectedId, camera]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInternalClick = (path: string[], pos: THREE.Vector3, parentId: string) => {
    if (path.length === 0) {
      cameraHistoryRef.current = [];
      setSelectedInternalPath([]);
      onPathChange([]);
      const extNodeIdx = ACTIVE_NODES.findIndex(n => n.id === parentId);
      const extPos = EXTERNAL_NODE_POSITIONS[extNodeIdx];
      if (orbitRef.current && extPos) {
        gsap.to(orbitRef.current.target, { x: extPos.x, y: extPos.y, z: extPos.z, duration: 1.2, ease: 'power2.inOut' });
        const dir = extPos.clone().normalize();
        const targetCamPos = dir.multiplyScalar(24);
        gsap.to(camera.position, { x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z, duration: 1.2, ease: 'power2.inOut' });
      }
    } else {
      if (orbitRef.current) {
        cameraHistoryRef.current.push({
          path: selectedInternalPath,
          orbitTarget: orbitRef.current.target.clone(),
          camPos: camera.position.clone(),
        });
      }
      setSelectedInternalPath(path);
      onPathChange(path);
      if (orbitRef.current) {
        gsap.to(orbitRef.current.target, { x: pos.x, y: pos.y, z: pos.z, duration: 1.0, ease: 'power2.inOut' });
        const dir = pos.clone().normalize();
        const zoomDist = 10;
        const targetCamPos = pos.clone().add(dir.multiplyScalar(zoomDist));
        gsap.to(camera.position, { x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z, duration: 1.0, ease: 'power2.inOut' });
      }
    }
  };

  // ── Sidebar back-step request ─────────────────────────────────────────────
  useEffect(() => {
    if (!requestBackStep || requestBackStep === prevBackStepRef.current) return;
    prevBackStepRef.current = requestBackStep;

    const history = cameraHistoryRef.current;
    if (history.length > 0) {
      const prev = history[history.length - 1];
      cameraHistoryRef.current = history.slice(0, -1);
      setSelectedInternalPath(prev.path);
      onPathChange(prev.path);
      if (orbitRef.current) {
        gsap.to(orbitRef.current.target, {
          x: prev.orbitTarget.x, y: prev.orbitTarget.y, z: prev.orbitTarget.z,
          duration: 1.0, ease: 'power2.inOut',
        });
        gsap.to(camera.position, {
          x: prev.camPos.x, y: prev.camPos.y, z: prev.camPos.z,
          duration: 1.0, ease: 'power2.inOut',
        });
      }
    } else {
      setSelectedInternalPath([]);
      onPathChange([]);
      if (selectedId && orbitRef.current) {
        const extIdx = ACTIVE_NODES.findIndex(n => n.id === selectedId);
        const extPos = ACTIVE_NODE_POSITIONS[extIdx];
        if (extPos) {
          gsap.to(orbitRef.current.target, { x: extPos.x, y: extPos.y, z: extPos.z, duration: 1.2, ease: 'power2.inOut' });
          const dir = extPos.clone().normalize();
          gsap.to(camera.position, {
            x: dir.multiplyScalar(24).x, y: dir.multiplyScalar(24).y, z: dir.multiplyScalar(24).z,
            duration: 1.2, ease: 'power2.inOut',
          });
        }
      }
    }
  }, [requestBackStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Neighbor highlight for hovered node ──────────────────────────────────
  const neighborIds = useMemo(() => {
    if (!hoveredId) return [];
    const hoveredIdx = ACTIVE_NODES.findIndex(n => n.id === hoveredId);
    if (hoveredIdx === -1) return [];

    const neighbors: string[] = [];
    let minDist = Infinity;
    const allPairs: { i: number; j: number; dist: number }[] = [];

    for (let i = 0; i < ACTIVE_NODES.length; i++) {
      for (let j = i + 1; j < ACTIVE_NODES.length; j++) {
        const d = SHUFFLED_ACTIVE_DIRS[i].distanceTo(SHUFFLED_ACTIVE_DIRS[j]);
        allPairs.push({ i, j, dist: d });
        if (d < minDist) minDist = d;
      }
    }
    const threshold = minDist * 1.05;
    allPairs.forEach(p => {
      if (p.dist <= threshold) {
        if (p.i === hoveredIdx) neighbors.push(ACTIVE_NODES[p.j].id);
        if (p.j === hoveredIdx) neighbors.push(ACTIVE_NODES[p.i].id);
      }
    });
    return neighbors;
  }, [hoveredId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Per-frame updates ─────────────────────────────────────────────────────
  useFrame(() => {
    camera.getWorldPosition(cameraPosRef.current);
    if (facesMatRef.current) {
      facesMatRef.current.uniforms.uCameraPos.value.copy(cameraPosRef.current);
      let targetOpacity = selectedId !== null ? 0.03 : 0.22;
      if (hoveredId !== null) targetOpacity = 0.04;
      facesMatRef.current.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        facesMatRef.current.uniforms.uOpacity.value,
        targetOpacity,
        0.08
      );
    }
    if (coreGroupRef.current) {
      const targetScale = isDeepDrillDown ? 0.0 : 1.0;
      coreGroupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1
      );
    }
  });

  // ── Screen-space position tracking for draft nodes ────────────────────────
  useFrame(({ camera: cam, gl: renderer }) => {
    if (draftNodeScreenPosRef) {
      const draftIdx = draftDept ? ACTIVE_NODES.findIndex(n => n.id === draftDept.id) : -1;
      if (draftIdx !== -1) {
        const wp = ACTIVE_NODE_POSITIONS[draftIdx].clone().project(cam);
        const rect = renderer.domElement.getBoundingClientRect();
        draftNodeScreenPosRef.current = {
          x: rect.left + (wp.x * 0.5 + 0.5) * rect.width,
          y: rect.top + (-wp.y * 0.5 + 0.5) * rect.height,
        };
      } else {
        draftNodeScreenPosRef.current = null;
      }
    }

    if (draftInternalNodeScreenPosRef && draftInternalNode && selectedId === draftInternalNode.deptId) {
      const deptIdx = ACTIVE_NODES.findIndex(n => n.id === draftInternalNode.deptId);
      if (deptIdx !== -1) {
        const deptPos = ACTIVE_NODE_POSITIONS[deptIdx];
        const draftNodeCount = ACTIVE_NODES[deptIdx].internalNodes.length;
        const angle = (draftNodeCount / Math.max(draftNodeCount + 1, 1)) * Math.PI * 2;
        const dir = deptPos.clone().normalize();
        const localUp = new THREE.Vector3(0, 1, 0);
        if (Math.abs(dir.dot(localUp)) > 0.99) localUp.set(1, 0, 0);
        const right = new THREE.Vector3().crossVectors(dir, localUp).normalize();
        const up = new THREE.Vector3().crossVectors(right, dir).normalize();
        const childCenter = deptPos.clone().add(dir.clone().multiplyScalar(3.0));
        const wp3 = childCenter.clone()
          .add(right.clone().multiplyScalar(Math.cos(angle) * 1.8))
          .add(up.clone().multiplyScalar(Math.sin(angle) * 1.8))
          .project(cam);
        const rect = renderer.domElement.getBoundingClientRect();
        draftInternalNodeScreenPosRef.current = {
          x: rect.left + (wp3.x * 0.5 + 0.5) * rect.width,
          y: rect.top + (-wp3.y * 0.5 + 0.5) * rect.height,
        };
      }
    }
  });

  // ── Convex hull face geometry ─────────────────────────────────────────────
  const { facesGeometry } = useMemo(() => {
    const baseGeo = new ConvexGeometry(ACTIVE_NODE_POSITIONS);
    const fGeo = baseGeo.toNonIndexed();
    fGeo.computeVertexNormals();

    const posAttr = fGeo.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);
    const alphas = new Float32Array(posAttr.count);
    for (let i = 0; i < posAttr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      const idx = ACTIVE_NODE_POSITIONS.findIndex(p => p.distanceToSquared(v) < 0.01);
      const col = idx >= 0 ? NODE_COLORS[idx] : new THREE.Color(0, 0, 0);
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
      alphas[i] = idx >= 0 ? 1.0 : 0.0;
    }
    fGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    fGeo.setAttribute('vertexAlpha', new THREE.BufferAttribute(alphas, 1));
    return { facesGeometry: fGeo };
  }, [ACTIVE_NODE_POSITIONS, NODE_COLORS]);

  // ── Interaction handlers ──────────────────────────────────────────────────
  const handleNodeClick = (id: string, pos: THREE.Vector3) => {
    if (selectedId === id) {
      setSelectedId(null);
    } else {
      setSelectedId(id);
      setSelectedInternalPath([]);
      onPathChange([]);
      if (orbitRef.current) {
        gsap.to(orbitRef.current.target, { x: pos.x, y: pos.y, z: pos.z, duration: 1.5, ease: 'power3.inOut' });
        const dir = pos.clone().normalize();
        const targetCamPos = dir.multiplyScalar(24);
        gsap.to(camera.position, { x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z, duration: 1.5, ease: 'power3.inOut' });
      }
    }
  };

  const prevRequestRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (requestSelectDeptId === prevRequestRef.current) return;
    prevRequestRef.current = requestSelectDeptId;
    if (requestSelectDeptId === null) { setSelectedId(null); return; }
    if (requestSelectDeptId === undefined) return;
    const idx = ACTIVE_NODES.findIndex(n => n.id === requestSelectDeptId);
    if (idx === -1) return;
    const pos = ACTIVE_NODE_POSITIONS[idx];
    setSelectedId(requestSelectDeptId);
    setSelectedInternalPath([]);
    onPathChange([]);
    if (orbitRef.current) {
      gsap.to(orbitRef.current.target, { x: pos.x, y: pos.y, z: pos.z, duration: 1.5, ease: 'power3.inOut' });
      const dir = pos.clone().normalize();
      const targetCamPos = dir.multiplyScalar(24);
      gsap.to(camera.position, { x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z, duration: 1.5, ease: 'power3.inOut' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestSelectDeptId]);

  const handlePointerMissed = () => {
    if (selectedId) { setSelectedId(null); onPathChange([]); }
  };

  // ── Draft internal node preview ───────────────────────────────────────────
  const draftInternalNodePreview = (() => {
    if (!draftInternalNode || selectedId !== draftInternalNode.deptId) return null;
    const deptIdx = ACTIVE_NODES.findIndex(n => n.id === draftInternalNode.deptId);
    if (deptIdx === -1) return null;
    const deptPos = ACTIVE_NODE_POSITIONS[deptIdx];
    const draftNodeCount = ACTIVE_NODES[deptIdx].internalNodes.length;
    const angle = (draftNodeCount / Math.max(draftNodeCount + 1, 1)) * Math.PI * 2;
    const dir = deptPos.clone().normalize();
    const localUp = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dir.dot(localUp)) > 0.99) localUp.set(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(dir, localUp).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    const childCenter = deptPos.clone().add(dir.clone().multiplyScalar(3.0));
    const draftPos = childCenter.clone()
      .add(right.clone().multiplyScalar(Math.cos(angle) * 1.8))
      .add(up.clone().multiplyScalar(Math.sin(angle) * 1.8));
    const deptColor = U_DOMAIN_COLOR[ACTIVE_NODES[deptIdx].domain] ?? '#6366f1';
    return (
      <group key="draft-internal-node" position={draftPos}>
        <PlasmaSphere color={deptColor} radius={0.14} opacity={0.7} glowIntensity={2.5} depthWrite={false} speed={3} />
        <GlowRing color={deptColor} active={true} isSelected={false} idx={999} />
        <Html position={[0, -0.9, 0]} center zIndexRange={[100, 0]}>
          <div style={{
            color: deptColor,
            background: 'rgba(0,0,0,0.7)',
            padding: '3px 7px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            border: `1px solid ${deptColor}60`,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            {draftInternalNode.node.label || '+ New Node'}
          </div>
        </Html>
      </group>
    );
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.5} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0.5} fade speed={0.4} />
      <Sparkles count={600} scale={45} size={2} speed={0.2} opacity={0.2} color="#88aaff" />
      <Sparkles count={300} scale={30} size={3} speed={0.5} opacity={0.3} color="#ffaaff" />
      <pointLight position={[0, 0, 0]} intensity={2} color="#ffffff" distance={20} />
      <directionalLight position={[10, 10, 10]} intensity={1} />

      <group onPointerMissed={handlePointerMissed}>
        <group ref={coreGroupRef}>
          <OrgCore dimmed={selectedId !== null} companyName={companyName} isDeepDrillDown={isDeepDrillDown} />
        </group>

        {ACTIVE_NODES.map((node, i) => {
          const pos = ACTIVE_NODE_POSITIONS[i];

          if (node.isDraft) {
            const color = '#' + NODE_COLORS[i].getHexString();
            return (
              <group key={node.id}>
                <group position={pos}>
                  <GlowRing color={color} active={true} isSelected={false} idx={i + 500} />
                </group>
                <group position={pos}>
                  <PlasmaSphere color={color} radius={0.3} opacity={1.0} glowIntensity={4.0} depthWrite={false} speed={4} />
                </group>
                <Html position={[pos.x, pos.y - 1.5, pos.z]} center zIndexRange={[100, 0]}>
                  <div style={{
                    color,
                    background: 'rgba(0,0,0,0.88)',
                    padding: '5px 12px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: `1.5px dashed ${color}`,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    boxShadow: `0 0 16px ${color}60`,
                    letterSpacing: '0.02em',
                  }}>
                    ✦ {node.label}
                  </div>
                </Html>
              </group>
            );
          }

          const isSelected = selectedId === node.id;
          const isHighlighted = hoveredId === null || node.id === hoveredId || neighborIds.includes(node.id);
          const isDimmed = (selectedId !== null && selectedId !== node.id) || (hoveredId !== null && !isHighlighted);
          const color = '#' + NODE_COLORS[i].getHexString();

          return (
            <ExternalNode
              key={node.id}
              node={node}
              pos={pos}
              isSelected={isSelected}
              isDimmed={isDimmed}
              onClick={() => handleNodeClick(node.id, pos)}
              color={color}
              selectedInternalPath={selectedInternalPath}
              onSelectInternal={(path, targetPos) => handleInternalClick(path, targetPos, node.id)}
              setBackInfo={setBackInfo}
              isDeepDrillDown={isDeepDrillDown}
              onHover={setHoveredId}
              idx={i}
              isHovered={hoveredId === node.id}
            />
          );
        })}

        {draftInternalNodePreview}

        {/* Translucent spectral shell */}
        <mesh geometry={facesGeometry}>
          <shaderMaterial
            ref={facesMatRef}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={{
              uOpacity: { value: selectedId !== null ? 0.05 : 0.22 },
              uCameraPos: { value: new THREE.Vector3() },
            }}
            transparent
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            vertexColors
            depthWrite={false}
          />
        </mesh>
      </group>

      <OrbitControls
        ref={orbitRef}
        makeDefault
        minDistance={5}
        maxDistance={40}
        enablePan={false}
      />
    </>
  );
}
