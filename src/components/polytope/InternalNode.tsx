import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { UInternalNode } from '../../lib/universalPolytopeData';
import { PlasmaSphere } from '../PolytopeShared';

interface InternalNodeProps {
  node: UInternalNode;
  targetPos: THREE.Vector3;
  startPos: THREE.Vector3;
  color: string;
  depth: number;
  selectedPath: string[];
  onSelectPath: (path: string[], pos: THREE.Vector3) => void;
  pathContext: string[];
  parentPos: THREE.Vector3;
  isVisible: boolean;
  parentLabel: string;
  setBackInfo: (info: { label: string; onClick: () => void } | null) => void;
}

export function InternalNode({
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
  setBackInfo,
}: InternalNodeProps) {
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
    const ringRadius = 1.4 * Math.pow(0.7, depth - 1);

    const dir = targetPos.clone().normalize();
    const localUp = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dir.dot(localUp)) > 0.99) localUp.set(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(dir, localUp).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();

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
    return node.children
      .map((child, i) =>
        isMeActiveCenter || selectedPath[selectedPath.length - 1] === child.id ? i : -1
      )
      .filter(i => i !== -1);
  }, [node.children, isMeActiveCenter, selectedPath]);

  const childEdges = useMemo(() => {
    if (visibleChildIndices.length === 0 || childPositions.length === 0) return null;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < visibleChildIndices.length; i++) {
      const idx = visibleChildIndices[i];
      pts.push(targetPos.clone());
      pts.push(childPositions[idx].clone());
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
        onClick: () => onSelectPath(pathContext, parentPos),
      });
      return () => setBackInfo(null);
    }
  }, [isMeActiveCenter, parentLabel, pathContext, parentPos, onSelectPath, setBackInfo]);

  useFrame(() => {
    if (groupRef.current) {
      currentPos.current.lerp(targetPos, 0.06);
      groupRef.current.position.copy(currentPos.current);

      const targetScale = isVisible ? (isMeActiveCenter ? 1.5 : 1.0) : 0.0;
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.08
      );
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (selectedPath[selectedPath.length - 1] === node.id) {
      onSelectPath(pathContext, parentPos);
    } else {
      onSelectPath(myPath, targetPos);
    }
  };

  return (
    <group>
      <group
        ref={groupRef}
        onClick={handleClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <PlasmaSphere
          color={color}
          radius={radius}
          opacity={1.0}
          glowIntensity={isMeActiveCenter ? 3.5 : 0.2}
          depthWrite={true}
          speed={isMeActiveCenter ? 1.5 : 0.2}
        />
        {isVisible && (
          <Html position={[0, -radius * 2.5, 0]} center zIndexRange={[100, 0]}>
            <div style={{
              color: 'white',
              background: 'rgba(0,0,0,0.6)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: `${Math.max(8, 12 - depth)}px`,
              fontWeight: 'bold',
              backdropFilter: 'blur(4px)',
              border: `1px solid ${color}40`,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              opacity: isMeActiveCenter || isMeAncestor ? 1 : 0.7,
              transition: 'opacity 0.2s',
            }}>
              {node.label}
            </div>
          </Html>
        )}
      </group>

      {node.children && node.children.map((child, i) => {
        const isChildVisible =
          isMeActiveCenter || selectedPath[selectedPath.length - 1] === child.id;
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

      {isMeActiveCenter && childEdges && (
        <lineSegments geometry={childEdges}>
          <lineBasicMaterial color={color} transparent opacity={0.4} />
        </lineSegments>
      )}
    </group>
  );
}
