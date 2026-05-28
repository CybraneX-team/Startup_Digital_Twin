import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';
import { U_DOMAIN_COLOR } from '../lib/universalPolytopeData';
import type { UExternalNode, UInternalNode } from '../lib/universalPolytopeData';
import { usePolytopeStore } from '../lib/usePolytopeStore';
import { PolytopeManager } from './PolytopeManager';
import { OrgCore, PlasmaSphere } from './PolytopeShared';
import { gsap } from 'gsap';
import { ConvexGeometry } from 'three-stdlib';



// ── Symmetric Polytope Vertex Directions ────────────────────────────────────
// Icosahedron  (12 vertices) — most uniform packing possible for 12 pts
function icosahedronDirs(): THREE.Vector3[] {
  const t = (1 + Math.sqrt(5)) / 2;
  const v: [number,number,number][] = [
    [-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],
    [0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],
    [t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1],
  ];
  return v.map(([x,y,z]) => new THREE.Vector3(x,y,z).normalize());
}

// Dodecahedron (20 vertices) — dual of icosahedron, perfect 5-fold symmetry
function dodecahedronDirs(): THREE.Vector3[] {
  const p = (1 + Math.sqrt(5)) / 2;
  const q = 1 / p;
  const v: [number,number,number][] = [
    [1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],
    [-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],
    [0,q,p],[0,q,-p],[0,-q,p],[0,-q,-p],
    [q,p,0],[q,-p,0],[-q,p,0],[-q,-p,0],
    [p,0,q],[p,0,-q],[-p,0,q],[-p,0,-q],
  ];
  return v.map(([x,y,z]) => new THREE.Vector3(x,y,z).normalize());
}

// Icosidodecahedron (30 vertices) — edge-midpoints of icosahedron
function icosidodecahedronDirs(): THREE.Vector3[] {
  const p = (1 + Math.sqrt(5)) / 2;
  const v: [number,number,number][] = [
    [0,1,p],[0,-1,p],[0,1,-p],[0,-1,-p],
    [1,p,0],[-1,p,0],[1,-p,0],[-1,-p,0],
    [p,0,1],[p,0,-1],[-p,0,1],[-p,0,-1],
    [1,p,0],[-1,p,0],[1,-p,0],[-1,-p,0],
    [0.5,p/2,p*p/2],[0.5,p/2,-p*p/2],[0.5,-p/2,p*p/2],[0.5,-p/2,-p*p/2],
    [-0.5,p/2,p*p/2],[-0.5,p/2,-p*p/2],[-0.5,-p/2,p*p/2],[-0.5,-p/2,-p*p/2],
    [p/2,p*p/2,0.5],[p/2,-p*p/2,0.5],[-p/2,p*p/2,0.5],[-p/2,-p*p/2,0.5],
    [p*p/2,0.5,p/2],[-p*p/2,0.5,p/2],
  ];
  return v.slice(0,30).map(([x,y,z]) => new THREE.Vector3(x,y,z).normalize());
}

// Geodesic fallback — greedy farthest-point sampling from icosahedron midpoints
function geodesicDirs(n: number): THREE.Vector3[] {
  const base = icosahedronDirs();
  const pool: THREE.Vector3[] = [...base];
  // add all edge midpoints
  for (let a = 0; a < base.length; a++)
    for (let b = a + 1; b < base.length; b++)
      pool.push(base[a].clone().add(base[b]).normalize());
  // greedy farthest-point sampling
  const chosen: THREE.Vector3[] = [pool[0]];
  while (chosen.length < n) {
    let bestIdx = 0, bestDist = -1;
    for (let i = 0; i < pool.length; i++) {
      const d = Math.min(...chosen.map(c => pool[i].distanceTo(c)));
      if (d > bestDist) { bestDist = d; bestIdx = i; }
    }
    chosen.push(pool[bestIdx]);
  }
  return chosen;
}

// Select the most symmetric layout for the exact node count
function symmetricDirs(n: number): THREE.Vector3[] {
  if (n === 12) return icosahedronDirs();
  if (n === 20) return dodecahedronDirs();
  if (n === 30) return icosidodecahedronDirs();
  return geodesicDirs(n);
}

// ── Final Positions — symmetric dirs (shuffled) × score-based radii ─────────
// Seeded Fisher-Yates shuffle so departments and inactive nodes are randomly
// intermixed across the symmetric vertex positions deterministically.
function seededShuffle<T>(arr: T[], seed = 42): T[] {
  const a = [...arr];
  let s = seed;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Stable camera distance (no longer module-level since node count can change)
const BASE_CAMERA_DISTANCE = 54;





function InternalNode({ 
  node, 
  targetPos, 
  startPos, 
  color, 
  depth, 
  selectedPath, 
  onSelectPath,
  pathContext,
  parentPos,
  isVisible,
  parentLabel,
  setBackInfo
}: { 
  node: UInternalNode, 
  targetPos: THREE.Vector3, 
  startPos: THREE.Vector3, 
  color: string, 
  depth: number, 
  selectedPath: string[], 
  onSelectPath: (path: string[], pos: THREE.Vector3) => void,
  pathContext: string[],
  parentPos: THREE.Vector3,
  isVisible: boolean,
  parentLabel: string,
  setBackInfo: (info: { label: string, onClick: () => void } | null) => void
}) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef(startPos.clone());
  
  const radii = [0.25, 0.20, 0.15, 0.12, 0.09];
  const radius = radii[depth] || 0.05;

  const isMeActiveCenter = selectedPath.length > 0 && selectedPath[selectedPath.length - 1] === node.id;
  const isMeAncestor = selectedPath.includes(node.id) && !isMeActiveCenter;
  const myPath = [...pathContext, node.id];

  const childPositions = useMemo(() => {
    if (!node.children || node.children.length === 0) return [];
    const pts: THREE.Vector3[] = [];
    const count = node.children.length;
    // Shrinking ring radius per level
    const ringRadius = 1.4 * Math.pow(0.7, depth - 1); 
    
    const dir = targetPos.clone().normalize();
    const localUp = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dir.dot(localUp)) > 0.99) localUp.set(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(dir, localUp).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();

    // Push children further OUTWARD
    const depthStep = 3.0;
    const childCenter = targetPos.clone().add(dir.clone().multiplyScalar(depthStep));

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const pt = childCenter.clone()
        .add(right.clone().multiplyScalar(Math.cos(angle) * ringRadius))
        .add(up.clone().multiplyScalar(Math.sin(angle) * ringRadius));
      pts.push(pt);
    }
    return pts;
  }, [node, targetPos, depth]);

  const visibleChildIndices = useMemo(() => {
    if (!node.children) return [];
    return node.children.map((child, i) => (isMeActiveCenter || selectedPath[selectedPath.length - 1] === child.id) ? i : -1).filter(i => i !== -1);
  }, [node.children, isMeActiveCenter, selectedPath]);

  const childEdges = useMemo(() => {
    if (visibleChildIndices.length === 0 || childPositions.length === 0) return null;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < visibleChildIndices.length; i++) {
       const idx = visibleChildIndices[i];
       // Spoke from center
       pts.push(targetPos.clone());
       pts.push(childPositions[idx].clone());
       
       // Edge to next visible sibling
       if (visibleChildIndices.length > 1) {
           const nextIdx = visibleChildIndices[(i + 1) % visibleChildIndices.length];
           pts.push(childPositions[idx].clone());
           pts.push(childPositions[nextIdx].clone());
       }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [visibleChildIndices, childPositions, targetPos]);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(startPos);
      groupRef.current.scale.setScalar(0);
    }
  }, [startPos]);

  useEffect(() => {
    if (isMeActiveCenter) {
      setBackInfo({
        label: parentLabel,
        onClick: () => onSelectPath(pathContext, parentPos)
      });
      return () => setBackInfo(null);
    }
  }, [isMeActiveCenter, parentLabel, pathContext, parentPos, onSelectPath, setBackInfo]);

  useFrame(() => {
    if (groupRef.current) {
      currentPos.current.lerp(targetPos, 0.06);
      groupRef.current.position.copy(currentPos.current);
      
      const targetScale = isVisible ? (isMeActiveCenter ? 1.5 : 1.0) : 0.0;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (selectedPath[selectedPath.length - 1] === node.id) {
       onSelectPath(pathContext, parentPos); // pop up
    } else {
       onSelectPath(myPath, targetPos); // drill down
    }
  };

  return (
    <group>
      <group ref={groupRef} onClick={handleClick} onPointerOver={() => document.body.style.cursor='pointer'} onPointerOut={() => document.body.style.cursor='auto'}>
        <PlasmaSphere 
          color={color}
          radius={radius}
          opacity={1.0}
          glowIntensity={isMeActiveCenter ? 3.5 : 0.2}
          depthWrite={true}
          speed={isMeActiveCenter ? 1.5 : 0.2}
        />
        {/* Label */}
        {isVisible && (
          <Html position={[0, -radius * 2.5, 0]} center zIndexRange={[100, 0]}>
            <div style={{
              color: 'white', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px',
              fontSize: `${Math.max(8, 12 - depth)}px`, fontWeight: 'bold', backdropFilter: 'blur(4px)',
              border: `1px solid ${color}40`, pointerEvents: 'none', whiteSpace: 'nowrap',
              opacity: isMeActiveCenter || isMeAncestor ? 1 : 0.7, transition: 'opacity 0.2s'
            }}>
              {node.label}
            </div>
          </Html>
        )}
      </group>

      {/* Children */}
      {node.children && node.children.map((child, i) => {
         const isChildVisible = isMeActiveCenter || selectedPath[selectedPath.length - 1] === child.id;
         return (
           <InternalNode 
             key={child.id}
             node={child}
             targetPos={childPositions[i]}
             startPos={targetPos}
             color={color}
             depth={depth + 1}
             selectedPath={selectedPath}
             onSelectPath={onSelectPath}
             pathContext={myPath}
             parentPos={targetPos}
             isVisible={isChildVisible}
             parentLabel={node.label}
             setBackInfo={setBackInfo}
           />
         );
      })}

      {/* Edges to children */}
      {isMeActiveCenter && childEdges && (
        <lineSegments geometry={childEdges}>
           <lineBasicMaterial color={color} transparent opacity={0.4} />
        </lineSegments>
      )}
    </group>
  );
}

function GlowRing({ color, active, isSelected, idx }: { color: string, active: boolean, isSelected: boolean, idx: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    const s = 0.5 + Math.sin(t * 2 + idx) * 0.15;
    meshRef.current.scale.setScalar(s);
  });
  return (
    <mesh ref={meshRef} visible={active}>
      <ringGeometry args={[0.3, 0.35, 32]} />
      <meshBasicMaterial color={color} transparent opacity={isSelected ? 0.8 : 0.4} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ExternalNode({ 
  node, 
  pos, 
  isSelected, 
  isDimmed, 
  onClick, 
  color,
  selectedInternalPath,
  onSelectInternal,
  setBackInfo,
  isDeepDrillDown,
  onHover,
  idx,
  isHovered
}: { 
  node: UExternalNode, 
  pos: THREE.Vector3, 
  isSelected: boolean,
  isDimmed: boolean,
  onClick: () => void,
  color: string,
  selectedInternalPath: string[],
  onSelectInternal: (path: string[], pos: THREE.Vector3) => void,
  setBackInfo: (info: { label: string, onClick: () => void } | null) => void,
  isDeepDrillDown: boolean,
  onHover: (id: string | null) => void,
  idx: number,
  isHovered: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate internal node positions around this external node
  const internalPositions = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = node.internalNodes.length;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 1.8; // Orbit spread radius
      // Create points in a local plane perpendicular to the direction vector
      const localUp = new THREE.Vector3(0, 1, 0);
      const dir = pos.clone().normalize();
      if (Math.abs(dir.dot(localUp)) > 0.99) localUp.set(1, 0, 0);
      
      const right = new THREE.Vector3().crossVectors(dir, localUp).normalize();
      const up = new THREE.Vector3().crossVectors(right, dir).normalize();
      
      // Target position is OUTSIDE the sphere (expanding away from center ball)
      // We push the children further OUTWARD along the direction vector
      const depthStep = 3.0; 
      const childCenter = pos.clone().add(dir.clone().multiplyScalar(depthStep));
      
      const depthOffset = (i % 2 === 0 ? 0.8 : -0.8);
      
      const pt = childCenter.clone()
        .add(dir.clone().multiplyScalar(depthOffset))
        .add(right.clone().multiplyScalar(Math.cos(angle) * radius))
        .add(up.clone().multiplyScalar(Math.sin(angle) * radius));
        
      pts.push(pt);
    }
    return pts;
  }, [node, pos]);

  const internalEdgesGeometry = useMemo(() => {
    if (internalPositions.length === 0) return null;
    const pts: THREE.Vector3[] = [];
    
    for (let i = 0; i < internalPositions.length; i++) {
      // Ring connection
      pts.push(internalPositions[i].clone());
      pts.push(internalPositions[(i + 1) % internalPositions.length].clone());
      
      // Center connection (connects to the external node)
      pts.push(internalPositions[i].clone());
      pts.push(pos.clone());
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [internalPositions, pos]);


  const labelRef = useRef<HTMLDivElement>(null);
  
  const shortLabel = node.id.split('_')[1] || node.label;
  const fullLabel = node.label;

  const linesMaterialRef = useRef<THREE.LineBasicMaterial>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Size interpolation: shrink away if deep drill down
      const targetScale = isSelected ? (isDeepDrillDown ? 0.0 : 1.5) : (isDimmed ? 0.6 : 1.0);
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
    if (labelRef.current) {
      // Hide label if node is on the back half of the sphere relative to the camera
      const isFront = state.camera.position.dot(pos) > 0;
      labelRef.current.style.opacity = isFront ? '1' : '0';
      
      // Update label text based on zoom distance
      const dist = state.camera.position.distanceTo(pos);
      const isClose = dist < 15; // Threshold for showing full name
      const newText = (isSelected || isClose) ? fullLabel : shortLabel;
      
      if (labelRef.current.innerText !== newText) {
        labelRef.current.innerText = newText;
      }
    }
    if (linesMaterialRef.current) {
      const targetOpacity = (isSelected && !isDeepDrillDown) ? 0.3 : 0;
      linesMaterialRef.current.opacity = THREE.MathUtils.lerp(linesMaterialRef.current.opacity, targetOpacity, 0.05);
    }
  });

  if (node.domain === 'inactive') {
    return null;
  }


  return (
    <group>
      <group position={pos}>
        <GlowRing color={color} active={!isDimmed} isSelected={isSelected} idx={idx} />
      </group>
      <group 
        ref={meshRef} 
        position={pos} 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onHover(node.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          onHover(null);
        }}
      >
        <PlasmaSphere 
          color={color} 
          radius={0.22} 
          opacity={isDimmed ? 0.08 : 1.0} 
          glowIntensity={isSelected ? 2.5 : isHovered ? 1.8 : 1.2} 
          depthWrite={!isDimmed} 
          speed={1.5} 
        />
      </group>
      
      {/* Label */}
      {(!isDimmed || isSelected) && !isDeepDrillDown && (
        <Html position={[pos.x, pos.y - 1.2, pos.z]} center zIndexRange={[100, 0]}>
          <div 
            ref={labelRef}
            style={{
            color: 'white',
            background: 'rgba(0,0,0,0.6)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            backdropFilter: 'blur(4px)',
            border: `1px solid ${color}40`,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            transition: 'opacity 0.2s'
          }}>
            {node.label}
          </div>
        </Html>
      )}

      {/* Internal Nodes (Level 1) */}
      {isSelected && node.internalNodes.map((intNode, i) => {
        const isChildVisible = selectedInternalPath.length === 0 || selectedInternalPath[selectedInternalPath.length - 1] === intNode.id;
        return (
          <InternalNode 
            key={intNode.id} 
            node={intNode}
            targetPos={internalPositions[i]} 
            startPos={pos} 
            color={color} 
            depth={1}
            selectedPath={selectedInternalPath}
            onSelectPath={onSelectInternal}
            pathContext={[]}
            parentPos={pos}
            isVisible={isChildVisible}
            parentLabel={node.label}
            setBackInfo={setBackInfo}
          />
        );
      })}

      {/* Polytope Wireframe */}
      {isSelected && internalEdgesGeometry && (
        <lineSegments geometry={internalEdgesGeometry}>
          <lineBasicMaterial ref={linesMaterialRef} color={color} transparent opacity={0} />
        </lineSegments>
      )}
    </group>
  );
}

const vertexShader = `
attribute float vertexAlpha;
varying float vAlpha;
varying vec3 vColor;
varying float vDist;
varying vec3 vNormalW;
varying vec3 vWorldPos;

void main() {
    vAlpha = vertexAlpha;
    vColor = color;
    vDist = length(position);
    vNormalW = normalize(mat3(modelMatrix) * normal);

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const fragmentShader = `
uniform float uOpacity;
uniform vec3 uCameraPos;

varying float vAlpha;
varying vec3 vColor;
varying float vDist;
varying vec3 vNormalW;
varying vec3 vWorldPos;

void main() {
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    float fresnel = pow(1.0 - max(dot(normalize(vNormalW), viewDir), 0.0), 2.2);

    float frontBoost = max(dot(normalize(vNormalW), viewDir), 0.0); // 1.0 when facing the camera

    float radial = smoothstep(1.5, 14.0, vDist);
    
    // pow(0.3) stretches the opacity so the glow range is long
    float stretchedAlpha = pow(vAlpha, 0.3);
    
    // Square the color to deepen saturation — prevents light colors (yellow/cyan) from washing out to white
    vec3 deepColor = vColor * vColor;
    
    // Color brightness: vivid near the node, deep/saturated hue preserved
    vec3 finalColor = deepColor * (3.5 + frontBoost * 2.0) * vAlpha;
    finalColor += deepColor * fresnel * 0.4 * vAlpha;

    // Opacity: strong near nodes, wide range from stretchedAlpha
    float alpha = uOpacity * (0.6 + frontBoost * 1.2) * stretchedAlpha;
    gl_FragColor = vec4(finalColor, alpha);
}
`;

function Scene({
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
}: {
  selectedId: string | null,
  setSelectedId: (id: string | null) => void,
  onPathChange: (path: string[]) => void,
  setBackInfo: (info: { label: string, onClick: () => void } | null) => void,
  companyName: string,
  hoveredId: string | null,
  setHoveredId: (id: string | null) => void,
  departments: UExternalNode[],
  onExitIntent?: () => void,
  cameraResetTrigger?: number,
  requestSelectDeptId?: string | null,
  requestBackStep?: number,
}) {
  // ── Derive geometry data from live departments prop ──────────────────────
  const { ACTIVE_NODES, ACTIVE_NODE_POSITIONS, SHUFFLED_ACTIVE_DIRS, NODE_COLORS, INITIAL_CAMERA_DISTANCE } = useMemo(() => {
    const nodes = departments.filter(n => n.domain !== 'inactive');
    const dirs = symmetricDirs(nodes.length);
    const shuffledDirs = seededShuffle(dirs, 137);
    const positions = nodes.map((_, i) => shuffledDirs[i].clone().multiplyScalar(12));
    const maxR = positions.length > 0 ? Math.max(...positions.map(p => p.length())) : 12;
    const colors = nodes.map(node => new THREE.Color(U_DOMAIN_COLOR[node.domain]));
    return {
      ACTIVE_NODES: nodes,
      ACTIVE_NODE_POSITIONS: positions,
      SHUFFLED_ACTIVE_DIRS: shuffledDirs,
      NODE_COLORS: colors,
      INITIAL_CAMERA_DISTANCE: Math.max(45, maxR * 4.5),
    };
  }, [departments]);

  // Alias for refs used deep in the component
  const EXTERNAL_NODE_POSITIONS = ACTIVE_NODE_POSITIONS;
  const orbitRef = useRef<any>(null);
  const { camera, gl } = useThree();

  // When embedded inside BH overlay — scroll-out at maxDistance triggers exit
  const onExitIntentRef = useRef(onExitIntent);
  onExitIntentRef.current = onExitIntent;
  useEffect(() => {
    if (!onExitIntentRef.current) return;
    // Fire on ANY scroll-out — no distance check.
    // OrbitControls damping means camera reaches maxDistance only AFTER user
    // stops; checking position would delay exit until scrolling stops.
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) onExitIntentRef.current?.();
    };
    gl.domElement.addEventListener('wheel', handleWheel, { passive: true });
    return () => gl.domElement.removeEventListener('wheel', handleWheel);
  }, [gl.domElement]);

  // Reset R3F camera to initial view each time user enters BH (cameraResetTrigger increments)
  useEffect(() => {
    if (!cameraResetTrigger) return; // skip value=0 (first mount)
    camera.position.set(0, 0, BASE_CAMERA_DISTANCE);
    if (orbitRef.current) {
      orbitRef.current.target.set(0, 0, 0);
      orbitRef.current.update();
    }
  }, [cameraResetTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const facesMatRef = useRef<THREE.ShaderMaterial>(null);
  const coreGroupRef = useRef<THREE.Group>(null);
  const cameraPosRef = useRef(new THREE.Vector3());

  // ── Camera history for sidebar back navigation ───────────────────────────
  // Each entry records where the camera was BEFORE drilling into a sub-node,
  // so we can animate back precisely when the sidebar back button is pressed.
  const cameraHistoryRef = useRef<Array<{
    path: string[];
    orbitTarget: THREE.Vector3;
    camPos: THREE.Vector3;
  }>>([]);
  const prevBackStepRef = useRef(0);

  const [selectedInternalPath, setSelectedInternalPath] = useState<string[]>([]);
  const isDeepDrillDown = selectedInternalPath.length > 0;

  useEffect(() => {
    // Clear deep drill down when switching departments
    setSelectedInternalPath([]);
    setBackInfo(null);
    cameraHistoryRef.current = []; // also clear camera history
  }, [selectedId, setBackInfo]);

  useEffect(() => {
    if (selectedId === null && orbitRef.current) {
      setSelectedInternalPath([]); // Reset internal path
      gsap.to(orbitRef.current.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: 'power3.inOut' });
      
      const currentDir = camera.position.clone().normalize();
      const targetCamPos = currentDir.multiplyScalar(INITIAL_CAMERA_DISTANCE);
      
      gsap.to(camera.position, { x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z, duration: 1.5, ease: 'power3.inOut' });
    }
  }, [selectedId, camera]);

  const handleInternalClick = (path: string[], pos: THREE.Vector3, parentId: string) => {
     if (path.length === 0) {
        // Going back to dept root from 3D click — clear history
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
        // Drilling into a sub-node — push current camera state so we can go back
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

  // ── Sidebar back-one-step request ────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!requestBackStep || requestBackStep === prevBackStepRef.current) return;
    prevBackStepRef.current = requestBackStep;

    const history = cameraHistoryRef.current;
    if (history.length > 0) {
      // Pop the last recorded camera state and animate back
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
      // History empty — snap back to dept root
      setSelectedInternalPath([]);
      onPathChange([]);
      if (selectedId && orbitRef.current) {
        const extIdx = ACTIVE_NODES.findIndex(n => n.id === selectedId);
        const extPos = ACTIVE_NODE_POSITIONS[extIdx];
        if (extPos) {
          gsap.to(orbitRef.current.target, { x: extPos.x, y: extPos.y, z: extPos.z, duration: 1.2, ease: 'power2.inOut' });
          const dir = extPos.clone().normalize();
          gsap.to(camera.position, { x: dir.multiplyScalar(24).x, y: dir.multiplyScalar(24).y, z: dir.multiplyScalar(24).z, duration: 1.2, ease: 'power2.inOut' });
        }
      }
    }
  }, [requestBackStep]);

  // Find neighbor IDs for the hovered node
  const neighborIds = useMemo(() => {
    if (!hoveredId) return [];
    const hoveredIdx = ACTIVE_NODES.findIndex(n => n.id === hoveredId);
    if (hoveredIdx === -1) return [];

    const neighbors: string[] = [];
    let minDist = Infinity;
    const allPairs: { i: number, j: number, dist: number }[] = [];
    
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
  }, [hoveredId]);

  useFrame(() => {
    camera.getWorldPosition(cameraPosRef.current);
    if (facesMatRef.current) {
      facesMatRef.current.uniforms.uCameraPos.value.copy(cameraPosRef.current);
      let targetOpacity = selectedId !== null ? 0.03 : 0.22;
      if (hoveredId !== null) {
        targetOpacity = 0.04;
      }
      facesMatRef.current.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        facesMatRef.current.uniforms.uOpacity.value,
        targetOpacity,
        0.08
      );
    }
    if (coreGroupRef.current) {
      const targetScale = isDeepDrillDown ? 0.0 : 1.0;
      coreGroupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  const { facesGeometry } = useMemo(() => {
    // Build convex hull first — extract edges directly from its faces
    const baseGeo = new ConvexGeometry(ACTIVE_NODE_POSITIONS);
    const indexedPosAttr = baseGeo.getAttribute('position') as THREE.BufferAttribute;
    const index = baseGeo.getIndex();

    // Map every position in the geometry back to its ACTIVE_NODE_POSITIONS index
    const posToNodeIdx = (v: THREE.Vector3) =>
      ACTIVE_NODE_POSITIONS.findIndex(p => p.distanceToSquared(v) < 0.01);

    // Extract unique edges from faces
    const edgeSet = new Set<string>();
    const pairs: { i: number; j: number; pA: THREE.Vector3; pB: THREE.Vector3; colorA: THREE.Color; colorB: THREE.Color; }[] = [];

    const addEdge = (ia: number, ib: number) => {
      const va = new THREE.Vector3().fromBufferAttribute(indexedPosAttr, ia);
      const vb = new THREE.Vector3().fromBufferAttribute(indexedPosAttr, ib);
      const ni = posToNodeIdx(va);
      const nj = posToNodeIdx(vb);
      if (ni === -1 || nj === -1 || ni === nj) return;
      const key = `${Math.min(ni, nj)}_${Math.max(ni, nj)}`;
      if (edgeSet.has(key)) return;
      edgeSet.add(key);
      pairs.push({
        i: ni, j: nj,
        pA: ACTIVE_NODE_POSITIONS[ni],
        pB: ACTIVE_NODE_POSITIONS[nj],
        colorA: new THREE.Color(1, 1, 1),
        colorB: new THREE.Color(1, 1, 1),
      });
    };

    if (index) {
      for (let f = 0; f < index.count; f += 3) {
        addEdge(index.getX(f), index.getX(f + 1));
        addEdge(index.getX(f + 1), index.getX(f + 2));
        addEdge(index.getX(f + 2), index.getX(f));
      }
    } else {
      // Non-indexed fallback
      const count = indexedPosAttr.count;
      for (let f = 0; f < count; f += 3) {
        addEdge(f, f + 1); addEdge(f + 1, f + 2); addEdge(f + 2, f);
      }
    }

    // Build the non-indexed face geometry for the translucent shell
    const fGeo = baseGeo.toNonIndexed();
    fGeo.computeVertexNormals();

    const posAttr = fGeo.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);
    const alphas = new Float32Array(posAttr.count);
    for (let i = 0; i < posAttr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      const idx = ACTIVE_NODE_POSITIONS.findIndex(p => p.distanceToSquared(v) < 0.01);
      const col = idx >= 0 ? NODE_COLORS[idx] : new THREE.Color(0, 0, 0);
      colors[i*3] = col.r; colors[i*3+1] = col.g; colors[i*3+2] = col.b;
      alphas[i] = idx >= 0 ? 1.0 : 0.0;
    }
    fGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    fGeo.setAttribute('vertexAlpha', new THREE.BufferAttribute(alphas, 1));

    return { facesGeometry: fGeo, edgePairs: pairs };
  }, [ACTIVE_NODE_POSITIONS, NODE_COLORS]);

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

  // ── External selection request (from sidebar clicks) ─────────────────────
  const prevRequestRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (requestSelectDeptId === prevRequestRef.current) return;
    prevRequestRef.current = requestSelectDeptId;
    if (requestSelectDeptId === null) {
      setSelectedId(null);
      return;
    }
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
    if (selectedId) {
      setSelectedId(null);
      onPathChange([]);
    }
  };

  return (
    <>
      <color attach="background" args={['#050b1a']} />
      <ambientLight intensity={0.5} />
      {/* Galaxy theme elements */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0.5} fade speed={0.4} />
      <Sparkles count={600} scale={45} size={2} speed={0.2} opacity={0.2} color="#88aaff" />
      <Sparkles count={300} scale={30} size={3} speed={0.5} opacity={0.3} color="#ffaaff" />
      
      <pointLight position={[0, 0, 0]} intensity={2} color="#ffffff" distance={20} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      
      <group onPointerMissed={handlePointerMissed}>
        {/* Universal Polytope Core */}
        <group ref={coreGroupRef}>
          <OrgCore dimmed={selectedId !== null} companyName={companyName} isDeepDrillDown={isDeepDrillDown} />
        </group>

        {/* Outer Surface Mesh removed as requested */}

        {/* Render External Nodes */}
        {ACTIVE_NODES.map((node, i) => {
          const pos = ACTIVE_NODE_POSITIONS[i];
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
        


        {/* Translucent Faces - Spectral Shell */}
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

function AnalyticHoverCard({ hoveredId, departments }: { hoveredId: string | null; departments: UExternalNode[] }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hoveredId) return;
    
    const handlePointerMove = (e: PointerEvent) => {
      if (cardRef.current) {
        const x = e.clientX + 15;
        const y = e.clientY + 15;
        const maxX = window.innerWidth - 260;
        const maxY = window.innerHeight - 200;
        const finalX = Math.min(x, maxX);
        const finalY = Math.min(y, maxY);
        cardRef.current.style.transform = `translate(${finalX}px, ${finalY}px)`;
      }
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [hoveredId]);

  if (!hoveredId) return null;

  const node = departments.find(n => n.id === hoveredId);
  if (!node) return null;

  const color = U_DOMAIN_COLOR[node.domain] ?? '#6366f1';

  return (
    <div 
      ref={cardRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '240px',
        background: 'linear-gradient(135deg, rgba(20, 10, 40, 0.75) 0%, rgba(5, 4, 15, 0.9) 100%)',
        border: `1px solid ${color}`,
        boxShadow: `0 0 20px ${color}33, inset 0 0 15px rgba(255, 255, 255, 0.05)`,
        borderRadius: '12px',
        padding: '16px',
        color: '#e2e8f0',
        backdropFilter: 'blur(16px)',
        zIndex: 99999,
        pointerEvents: 'none',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#f8fafc' }}>{node.label}</h3>
        <span style={{ 
          fontSize: '12px', fontWeight: '800', 
          background: `${color}22`, color: color,
          padding: '2px 8px', borderRadius: '12px',
          border: `1px solid ${color}40`
        }}>
          {node.score} PTS
        </span>
      </div>
      
      <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Cluster: {node.cluster}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Object.entries(node.metrics).map(([key, val]) => {
          return (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ textTransform: 'capitalize', color: '#cbd5e1' }}>{key}</span>
                <span style={{ fontWeight: '600', color: key === 'risk' ? '#ef4444' : '#10b981' }}>{val}%</span>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${val}%`, height: '100%', 
                  backgroundColor: key === 'risk' ? '#ef4444' : color,
                  borderRadius: '2px'
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function UniversalPolytope({
  companyName = "Universal Polytope",
  onExitIntent,
  transparent = false,
  cameraResetTrigger = 0,
  onDepartmentChange,
  onInternalPathChange,
  requestSelectDeptId,
  requestBackStep,
}: {
  companyName?: string;
  onExitIntent?: () => void;
  transparent?: boolean;
  cameraResetTrigger?: number;
  /** Called whenever a department is selected (id) or deselected (null) in the 3D scene */
  onDepartmentChange?: (id: string | null) => void;
  /** Called whenever the internal drill-down path changes */
  onInternalPathChange?: (path: string[]) => void;
  /** When set, auto-flies camera to this department and selects it */
  requestSelectDeptId?: string | null;
  /** Increment to trigger going back exactly one internal node level with camera animation */
  requestBackStep?: number;
}) {
  const [selectedId, setSelectedIdRaw] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // backInfo would normally drive an in-canvas back button, but in overlay/transparent
  // mode that UI isn't rendered — use a no-op so sub-components still work.
  const setBackInfo = useCallback((_info: { label: string; onClick: () => void } | null) => {}, []);

  // Wrap setter to fire callback
  const setSelectedId = (id: string | null) => {
    setSelectedIdRaw(id);
    onDepartmentChange?.(id);
  };

  const store = usePolytopeStore();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, BASE_CAMERA_DISTANCE], fov: 45, near: 0.1, far: 300 }}
        dpr={[1, 1.5]} gl={{ antialias: true, alpha: transparent }}
      >
        <Scene
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onPathChange={(path) => { onInternalPathChange?.(path); }}
          setBackInfo={setBackInfo}
          companyName={companyName}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          departments={store.departments}
          onExitIntent={onExitIntent}
          cameraResetTrigger={cameraResetTrigger}
          requestSelectDeptId={requestSelectDeptId}
          requestBackStep={requestBackStep}
        />
      </Canvas>

      {/* Floating Analytic Info Card */}
      <AnalyticHoverCard hoveredId={hoveredId} departments={store.departments} />

      

      {/* Department CRUD Manager — hidden when embedded in BH overlay */}
      {!transparent && (
        <PolytopeManager
          departments={store.departments}
          onAddDepartment={store.addDepartment}
          onUpdateDepartment={store.updateDepartment}
          onDeleteDepartment={store.deleteDepartment}
          onAddNode={store.addNode}
          onUpdateNode={store.updateNode}
          onDeleteNode={store.deleteNode}
          onReset={store.resetToDefaults}
        />
      )}
    </div>
  );
}
