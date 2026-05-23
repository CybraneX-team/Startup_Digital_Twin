import { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Stars, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';
import { U_NODES, U_DOMAIN_COLOR } from '../lib/universalPolytopeData';
import type { UExternalNode, UInternalNode } from '../lib/universalPolytopeData';
import { OrgCore, PlasmaSphere, GlowRing } from './PolytopeShared';
import { gsap } from 'gsap';
import { ArrowLeft } from 'lucide-react';
import { ConvexGeometry } from 'three-stdlib';
import { useNavigate } from 'react-router-dom';

// Helper to distribute N points on a sphere (Fibonacci lattice)
function fibSphere(n: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const theta = phi * i;
    pts.push(new THREE.Vector3(Math.cos(theta) * rad * radius, y * radius, Math.sin(theta) * rad * radius));
  }
  return pts;
}

const EXTERNAL_RADIUS = 10;
const EXTERNAL_NODE_POSITIONS = fibSphere(U_NODES.length, EXTERNAL_RADIUS);

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

  useFrame(({ clock }) => {
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
  isDeepDrillDown
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
  isDeepDrillDown: boolean
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
      <group 
        ref={meshRef} 
        position={pos} 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        <PlasmaSphere 
          color={color} 
          radius={0.25} 
          opacity={isDimmed ? 0.08 : 1.0} 
          glowIntensity={isSelected ? 2.5 : (1.2 + Math.exp(-pos.length() * 0.35) * 3.0)} 
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
            {isSelected ? node.label : (node.id.split('_')[1] || node.label)}
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
attribute float vertexIndex;
varying vec3 vColor;
varying float vRadialGlow;

vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb = clamp(
        abs(mod(hsl.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0,
        0.0,
        1.0
    );

    rgb = rgb * rgb * (3.0 - 2.0 * rgb);

    float c = (1.0 - abs(2.0 * hsl.z - 1.0)) * hsl.y;

    return (rgb - 0.5) * c + hsl.z;
}

void main() {
    float N = ${U_NODES.length}.0;
    float h = vertexIndex / N;
    
    vec3 baseColor = hsl2rgb(vec3(h, 0.85, 0.65));
    
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec3 corePosition = vec3(0.0);
    float dist = length(worldPos.xyz - corePosition);
    vRadialGlow = exp(-dist * 0.35);
    
    vColor = baseColor;
    
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const fragmentShader = `
uniform float uOpacity;
uniform bool uIsShell;
varying vec3 vColor;
varying float vRadialGlow;

void main() {
    vec3 finalColor = vColor;
    float alpha = uOpacity;

    if (uIsShell) {
        // secondary translucent spectral shell layer
        // Force 100% pure saturated color to eliminate any whiteness/grayness
        float minC = min(min(vColor.r, vColor.g), vColor.b);
        float maxC = max(max(vColor.r, vColor.g), vColor.b);
        vec3 pureColor = (vColor - minC) / (maxC - minC + 0.0001);
        
        // 10x brighter and stronger color, purely saturated!
        finalColor = pureColor * 10.0;
        
        // Retain depth via opacity, but do not wash out the color
        alpha *= (1.0 + vRadialGlow * 1.5);
    } else {
        // primary sharp geometry (edges)
        finalColor = vec3(1.0) + vec3(1.0) * vRadialGlow * 0.8; // crisp white lines
    }

    gl_FragColor = vec4(finalColor, alpha);
}
`;

function Scene({ 
  selectedId, 
  setSelectedId,
  onPathChange,
  setBackInfo,
  companyName
}: { 
  selectedId: string | null, 
  setSelectedId: (id: string | null) => void,
  onPathChange: (path: string[]) => void,
  setBackInfo: (info: { label: string, onClick: () => void } | null) => void,
  companyName: string
}) {
  const orbitRef = useRef<any>(null);
  const { camera } = useThree();
  const edgesMatRef = useRef<THREE.ShaderMaterial>(null);
  const facesMatRef = useRef<THREE.ShaderMaterial>(null);
  const coreGroupRef = useRef<THREE.Group>(null);

  const [selectedInternalPath, setSelectedInternalPath] = useState<string[]>([]);
  const isDeepDrillDown = selectedInternalPath.length > 0;

  useEffect(() => {
    // Clear deep drill down when switching departments
    setSelectedInternalPath([]);
    setBackInfo(null);
  }, [selectedId, setBackInfo]);

  useEffect(() => {
    if (selectedId === null && orbitRef.current) {
      setSelectedInternalPath([]); // Reset internal path
      gsap.to(orbitRef.current.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: 'power3.inOut' });
      
      const currentDir = camera.position.clone().normalize();
      const targetCamPos = currentDir.multiplyScalar(35);
      
      gsap.to(camera.position, { x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z, duration: 1.5, ease: 'power3.inOut' });
    }
  }, [selectedId, camera]);

  const handleInternalClick = (path: string[], pos: THREE.Vector3, parentId: string) => {
     setSelectedInternalPath(path);
     onPathChange(path);
     if (path.length === 0) {
        const extNodeIdx = U_NODES.findIndex(n => n.id === parentId);
        const extPos = EXTERNAL_NODE_POSITIONS[extNodeIdx];
        if (orbitRef.current && extPos) {
          gsap.to(orbitRef.current.target, { x: extPos.x, y: extPos.y, z: extPos.z, duration: 1.2, ease: 'power2.inOut' });
          const dir = extPos.clone().normalize();
          const targetCamPos = dir.multiplyScalar(24);
          gsap.to(camera.position, { x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z, duration: 1.2, ease: 'power2.inOut' });
        }
     } else {
        if (orbitRef.current) {
          gsap.to(orbitRef.current.target, { x: pos.x, y: pos.y, z: pos.z, duration: 1.0, ease: 'power2.inOut' });
          const dir = pos.clone().normalize();
          const zoomDist = 10;
          const targetCamPos = pos.clone().add(dir.multiplyScalar(zoomDist)); 
          gsap.to(camera.position, { x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z, duration: 1.0, ease: 'power2.inOut' });
        }
     }
  };

  useFrame(() => {
    if (edgesMatRef.current) {
      edgesMatRef.current.uniforms.uOpacity.value = selectedId !== null ? 0.05 : 0.8;
    }
    if (facesMatRef.current) {
      facesMatRef.current.uniforms.uOpacity.value = selectedId !== null ? 0.03 : 0.08;
    }
    if (coreGroupRef.current) {
      const targetScale = isDeepDrillDown ? 0.0 : 1.0;
      coreGroupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  // Optimize Edges and generate faces
  const { edgesGeometry, facesGeometry } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const edgeIndices: number[] = [];

    for (let i = 0; i < U_NODES.length; i++) {
      for (let j = i + 1; j < U_NODES.length; j++) {
        const pA = EXTERNAL_NODE_POSITIONS[i];
        const pB = EXTERNAL_NODE_POSITIONS[j];
        if (pA.distanceTo(pB) < 8.5) {
          pts.push(pA.clone(), pB.clone());
          edgeIndices.push(i, j);
        }
      }
    }
    const eGeo = new THREE.BufferGeometry().setFromPoints(pts);
    eGeo.setAttribute('vertexIndex', new THREE.Float32BufferAttribute(edgeIndices, 1));

    const fGeo = new ConvexGeometry(EXTERNAL_NODE_POSITIONS);
    const posAttr = fGeo.getAttribute('position');
    const faceIndices: number[] = [];
    
    for (let i = 0; i < posAttr.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
        let closestIdx = 0;
        let minD = Infinity;
        for (let j = 0; j < EXTERNAL_NODE_POSITIONS.length; j++) {
            const d = v.distanceTo(EXTERNAL_NODE_POSITIONS[j]);
            if (d < minD) {
                minD = d;
                closestIdx = j;
            }
        }
        faceIndices.push(closestIdx);
    }
    fGeo.setAttribute('vertexIndex', new THREE.Float32BufferAttribute(faceIndices, 1));

    return { edgesGeometry: eGeo, facesGeometry: fGeo };
  }, []);

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

  const handlePointerMissed = () => {
    if (selectedId) {
      setSelectedId(null);
      onPathChange([]);
    }
  };

  return (
    <>
      <color attach="background" args={['#05040f']} />
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
        {U_NODES.map((node, i) => {
          const pos = EXTERNAL_NODE_POSITIONS[i];
          const isSelected = selectedId === node.id;
          const isDimmed = selectedId !== null && selectedId !== node.id;
          
          const dist = pos.length();
          const radialGlow = Math.exp(-dist * 0.35);
          const l = 0.65 + (radialGlow * 0.2); // Nodes closer to center get brighter/more luminous
          const color = new THREE.Color().setHSL(i / U_NODES.length, 0.85, l).getStyle();

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
            />
          );
        })}
        
        {/* Optimized Edges: single line segment object for all edges */}
        <lineSegments geometry={edgesGeometry}>
          <shaderMaterial
            ref={edgesMatRef}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={{
              uOpacity: { value: selectedId !== null ? 0.05 : 0.8 },
              uIsShell: { value: false }
            }}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </lineSegments>

        {/* Translucent Faces - Spectral Shell */}
        <mesh geometry={facesGeometry}>
          <shaderMaterial
            ref={facesMatRef}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={{
              uOpacity: { value: selectedId !== null ? 0.03 : 0.08 },
              uIsShell: { value: true }
            }}
            transparent
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
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

export default function UniversalPolytope({ companyName = "Universal Polytope" }: { companyName?: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [backInfo, setBackInfo] = useState<{ label: string, onClick: () => void } | null>(null);
  const navigate = useNavigate();

  const handlePathChange = (path: string[]) => {
    setSelectedPath(path);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, 35], fov: 45, near: 0.1, far: 300 }}
        dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}
      >
        <Scene selectedId={selectedId} setSelectedId={setSelectedId} onPathChange={handlePathChange} setBackInfo={setBackInfo} companyName={companyName} />
      </Canvas>

      {/* Back Button */}
      <button
        onClick={() => {
          if (backInfo) {
            backInfo.onClick();
          } else if (selectedId) {
            setSelectedId(null);
          } else {
            navigate('/');
          }
        }}
        style={{
          position: 'absolute', top: 100, left: 24,
          background: 'linear-gradient(135deg, rgba(20,10,40,0.8) 0%, rgba(5,4,15,0.9) 100%)',
          border: '1px solid rgba(136, 170, 255, 0.4)',
          boxShadow: '0 0 15px rgba(136, 170, 255, 0.3), inset 0 0 10px rgba(255, 170, 255, 0.1)',
          borderRadius: '12px', padding: '10px 20px', color: '#e0eaff',
          display: 'flex', alignItems: 'center', gap: '10px',
          cursor: 'pointer', backdropFilter: 'blur(12px)',
          pointerEvents: 'auto', zIndex: 99999,
          transition: 'all 0.3s ease',
          fontWeight: 'bold', letterSpacing: '0.5px',
          textTransform: 'uppercase', fontSize: '13px'
        }}
        onPointerOver={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(40,20,80,0.9) 0%, rgba(15,10,30,0.95) 100%)';
          e.currentTarget.style.boxShadow = '0 0 25px rgba(136, 170, 255, 0.6), inset 0 0 15px rgba(255, 170, 255, 0.3)';
          e.currentTarget.style.borderColor = 'rgba(255, 170, 255, 0.6)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onPointerOut={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(20,10,40,0.8) 0%, rgba(5,4,15,0.9) 100%)';
          e.currentTarget.style.boxShadow = '0 0 15px rgba(136, 170, 255, 0.3), inset 0 0 10px rgba(255, 170, 255, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(136, 170, 255, 0.4)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <ArrowLeft size={18} />
        {backInfo ? `Back to ${backInfo.label}` : (selectedId ? 'Back to Polytope' : 'Back to Home')}
      </button>
    </div>
  );
}
