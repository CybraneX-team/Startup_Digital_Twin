import { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Stars } from '@react-three/drei';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { U_NODES, U_DOMAIN_COLOR } from '../lib/universalPolytopeData';
import type { UExternalNode } from '../lib/universalPolytopeData';
import { OrgCore, PlasmaSphere, GlowRing } from './PolytopeShared';
import { gsap } from 'gsap';
import { ArrowLeft } from 'lucide-react';

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

function InternalNode({ targetPos, startPos, label, color }: { targetPos: THREE.Vector3, startPos: THREE.Vector3, label: string, color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef(startPos.clone());
  
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(startPos);
      groupRef.current.scale.setScalar(0);
    }
  }, [startPos]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Smoothly interpolate position from start to target
      currentPos.current.lerp(targetPos, 0.06);
      
      // Apply position and add a gentle hovering float
      groupRef.current.position.copy(currentPos.current);
      groupRef.current.position.y += Math.sin(clock.elapsedTime * 2 + targetPos.x) * 0.15;
      
      // Smoothly scale up on entrance
      groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0.02, -0.6, 0]} fontSize={0.3} color="white" anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}

function ExternalNode({ node, pos, isSelected, isDimmed, onClick }: { 
  node: UExternalNode, 
  pos: THREE.Vector3, 
  isSelected: boolean,
  isDimmed: boolean,
  onClick: () => void 
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = U_DOMAIN_COLOR[node.domain];
  
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
      
      // Target position is INSIDE the sphere (closer to center ball)
      // External radius is 10, center ball is 2. We place them at depth ~6.
      const depthCenter = dir.clone().multiplyScalar(6.0);
      
      const depthOffset = (i % 2 === 0 ? 0.8 : -0.8);
      
      const pt = depthCenter.clone()
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

  const targetScale = isSelected ? 1.5 : (isDimmed ? 0.6 : 1.0);
  
  const labelRef = useRef<HTMLDivElement>(null);
  
  const shortLabel = node.id.split('_')[1] || node.label;
  const fullLabel = node.label;

  const linesMaterialRef = useRef<THREE.LineBasicMaterial>(null);

  useFrame((state) => {
    if (meshRef.current) {
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
      linesMaterialRef.current.opacity = THREE.MathUtils.lerp(linesMaterialRef.current.opacity, isSelected ? 0.3 : 0, 0.05);
    }
  });

  return (
    <group>
      <group 
        ref={meshRef} 
        position={pos} 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        <GlowRing 
          color={color} 
          active={!isDimmed && node.domain !== 'inactive'} 
          isSelected={isSelected} 
          idx={parseInt(node.id.split('_')[1] || '0')} 
        />
        <PlasmaSphere 
          color={color} 
          radius={0.25} 
          opacity={isDimmed ? 0.08 : 1.0} 
          glowIntensity={isSelected ? 2.5 : 1.2} 
          depthWrite={!isDimmed} 
          speed={1.5} 
        />
      </group>
      
      {/* Label */}
      {(!isDimmed || isSelected) && (
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

      {/* Internal Nodes */}
      {isSelected && node.internalNodes.map((intNode, i) => (
        <InternalNode key={intNode.id} targetPos={internalPositions[i]} startPos={pos} label={intNode.label} color={color} />
      ))}

      {/* Polytope Wireframe */}
      {isSelected && internalEdgesGeometry && (
        <lineSegments geometry={internalEdgesGeometry}>
          <lineBasicMaterial ref={linesMaterialRef} color={color} transparent opacity={0} />
        </lineSegments>
      )}
    </group>
  );
}

function Scene({ selectedId, setSelectedId }: { selectedId: string | null, setSelectedId: (id: string | null) => void }) {
  const orbitRef = useRef<any>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (selectedId === null && orbitRef.current) {
      gsap.to(orbitRef.current.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: 'power3.inOut' });
      
      // Pull camera back to radius 35 along its current direction to prevent sweeping through the sphere
      const currentDir = camera.position.clone().normalize();
      const targetCamPos = currentDir.multiplyScalar(35);
      
      gsap.to(camera.position, { x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z, duration: 1.5, ease: 'power3.inOut' });
    }
  }, [selectedId, camera]);

  // Optimize Edges into a single geometry buffer to save 300+ draw calls
  const edgesGeometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < U_NODES.length; i++) {
      for (let j = i + 1; j < U_NODES.length; j++) {
        const pA = EXTERNAL_NODE_POSITIONS[i];
        const pB = EXTERNAL_NODE_POSITIONS[j];
        // Distance threshold for 100 points on radius 10 sphere is ~3.5
        if (pA.distanceTo(pB) < 4.2) {
          pts.push(pA.clone(), pB.clone());
        }
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  const handleNodeClick = (id: string, pos: THREE.Vector3) => {
    if (selectedId === id) {
      setSelectedId(null); // Deselect
    } else {
      setSelectedId(id);
      // Move camera to look at the node, and get closer
      if (orbitRef.current) {
        gsap.to(orbitRef.current.target, { x: pos.x, y: pos.y, z: pos.z, duration: 1.5, ease: 'power3.inOut' });
        
        // Calculate a position slightly in front of the node
        const dir = pos.clone().normalize();
        const targetCamPos = dir.multiplyScalar(16); // Node is at radius 10, camera goes to 16
        gsap.to(camera.position, { x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z, duration: 1.5, ease: 'power3.inOut' });
      }
    }
  };

  const handlePointerMissed = () => {
    if (selectedId) {
      setSelectedId(null);
    }
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <Stars radius={90} depth={70} count={3000} factor={3} saturation={0} fade speed={0.4} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#ffffff" distance={20} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      
      <group onPointerMissed={handlePointerMissed}>
        {/* Core Nucleus */}
        <OrgCore dimmed={selectedId !== null} companyName="Universal Polytope" />

        {/* Outer Surface Mesh removed as requested */}

        {/* Render External Nodes */}
        {U_NODES.map((node, i) => {
          const pos = EXTERNAL_NODE_POSITIONS[i];
          const isSelected = selectedId === node.id;
          const isDimmed = selectedId !== null && selectedId !== node.id;

          return (
            <ExternalNode 
              key={node.id} 
              node={node} 
              pos={pos} 
              isSelected={isSelected}
              isDimmed={isDimmed}
              onClick={() => handleNodeClick(node.id, pos)} 
            />
          );
        })}
        
        {/* Optimized Edges: single line segment object for all edges */}
        <lineSegments geometry={edgesGeometry}>
          <lineBasicMaterial color="#ffffff" transparent opacity={selectedId !== null ? 0.05 : 0.25} />
        </lineSegments>
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

export default function UniversalPolytope() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, 35], fov: 45, near: 0.1, far: 300 }}
        dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}
        style={{ background: '#05040f' }}
      >
        <Scene selectedId={selectedId} setSelectedId={setSelectedId} />
      </Canvas>

      {/* Back Button */}
      {selectedId && (
        <button
          onClick={() => setSelectedId(null)}
          style={{
            position: 'absolute', top: 24, right: 24,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px', padding: '8px 16px', color: 'white',
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', backdropFilter: 'blur(8px)',
            pointerEvents: 'auto', zIndex: 10,
            transition: 'background 0.2s'
          }}
          onPointerOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onPointerOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          <ArrowLeft size={18} />
          Back to Polytope
        </button>
      )}
    </div>
  );
}
