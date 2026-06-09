import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { UInternalNode } from '../../lib/universalPolytopeData';
import { PlasmaSphere } from '../PolytopeShared';
import { useDragWorkspaceStore } from '../../lib/useDragWorkspaceStore';

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
  isDraft?: boolean;
  draftChildNode?: UInternalNode | null;
  onNodeFocus?: (pos: THREE.Vector3) => void;
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
  isDraft = false,
  draftChildNode = null,
  onNodeFocus,
}: InternalNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef(startPos.clone());

  const radii = [0.25, 0.20, 0.15, 0.12, 0.09];
  const radius = radii[depth] || 0.05;

  const isMeActiveCenter = selectedPath.length > 0 && selectedPath[selectedPath.length - 1] === node.id;
  const isMeAncestor = selectedPath.includes(node.id) && !isMeActiveCenter;
  const myPath = [...pathContext, node.id];
  /** Parent orb hides when user drills into a child (branch → action, etc.) */
  const hasActiveChild = selectedPath.length > myPath.length;
  const isHiddenParent = hasActiveChild && !isDraft;

  const childPositions = useMemo(() => {
    const hasDraft = isMeActiveCenter && draftChildNode;
    const existingCount = node.children?.length ?? 0;
    const totalCount = existingCount + (hasDraft ? 1 : 0);
    if (totalCount === 0) return [];
    
    const pts: THREE.Vector3[] = [];
    const ringRadius = 1.4 * Math.pow(0.7, depth - 1);

    const dir = targetPos.clone().normalize();
    const localUp = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dir.dot(localUp)) > 0.99) localUp.set(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(dir, localUp).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();

    const depthStep = 3.0;
    const childCenter = targetPos.clone().add(dir.clone().multiplyScalar(depthStep));

    for (let i = 0; i < totalCount; i++) {
      const angle = (i / totalCount) * Math.PI * 2;
      const pt = childCenter.clone()
        .add(right.clone().multiplyScalar(Math.cos(angle) * ringRadius))
        .add(up.clone().multiplyScalar(Math.sin(angle) * ringRadius));
      pts.push(pt);
    }
    return pts;
  }, [node.children, targetPos, depth, isMeActiveCenter, draftChildNode]);

  const visibleChildIndices = useMemo(() => {
    if (!node.children) return [];
    return node.children
      .map((child, i) =>
        isMeActiveCenter || selectedPath[selectedPath.length - 1] === child.id ? i : -1
      )
      .filter(i => i !== -1);
  }, [node.children, isMeActiveCenter, selectedPath]);

  const childEdges = useMemo(() => {
    const hasDraft = isMeActiveCenter && draftChildNode;
    const totalVisibleCount = visibleChildIndices.length + (hasDraft ? 1 : 0);
    if (totalVisibleCount === 0 || childPositions.length === 0) return null;
    
    const pts: THREE.Vector3[] = [];
    const indicesToDraw = [...visibleChildIndices];
    if (hasDraft) {
      indicesToDraw.push(childPositions.length - 1);
    }
    
    for (let i = 0; i < indicesToDraw.length; i++) {
      const idx = indicesToDraw[i];
      pts.push(targetPos.clone());
      pts.push(childPositions[idx].clone());
      if (indicesToDraw.length > 1) {
        const nextIdx = indicesToDraw[(i + 1) % indicesToDraw.length];
        pts.push(childPositions[idx].clone());
        pts.push(childPositions[nextIdx].clone());
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [visibleChildIndices, childPositions, targetPos, isMeActiveCenter, draftChildNode]);

  useEffect(() => {
    if (groupRef.current) {
      if (isDraft) {
        currentPos.current.copy(targetPos);
        groupRef.current.position.copy(targetPos);
        groupRef.current.scale.setScalar(1);
      } else {
        groupRef.current.position.copy(startPos);
        groupRef.current.scale.setScalar(0);
      }
    }
  }, [startPos, targetPos, isDraft]);

  useEffect(() => {
    if (isMeActiveCenter) {
      setBackInfo({
        label: parentLabel,
        onClick: () => onSelectPath(pathContext, parentPos),
      });
      if (onNodeFocus) onNodeFocus(targetPos);
      return () => {
        setBackInfo(null);
      };
    }
  }, [isMeActiveCenter, parentLabel, pathContext, parentPos, onSelectPath, setBackInfo, onNodeFocus, targetPos]);

  useFrame(() => {
    if (groupRef.current) {
      if (!isDraft) {
        currentPos.current.lerp(targetPos, 0.06);
        groupRef.current.position.copy(currentPos.current);
      }

      let targetScale = 0.0;
      if (isHiddenParent) {
        targetScale = 0.0;
      } else if (isVisible) {
        targetScale = isMeActiveCenter ? 1.5 : 1.0;
      }
      const lerpSpeed = isHiddenParent || isMeActiveCenter ? 0.14 : 0.08;
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        lerpSpeed,
      );
    }
  });

  const startDrag = useDragWorkspaceStore(s => s.startDrag);
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosClient = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (isDraft) return;
    startPosClient.current = { x: e.clientX, y: e.clientY };
    dragTimer.current = setTimeout(() => {
      startDrag(node, color, e.clientX, e.clientY);
      dragTimer.current = null;
    }, 800);
  };

  const handlePointerMove = (e: any) => {
    if (dragTimer.current && startPosClient.current) {
      const dx = e.clientX - startPosClient.current.x;
      const dy = e.clientY - startPosClient.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clearTimeout(dragTimer.current);
        dragTimer.current = null;
      }
    }
  };

  const cancelDrag = () => {
    if (dragTimer.current) {
      clearTimeout(dragTimer.current);
      dragTimer.current = null;
    }
  };

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    cancelDrag();
    if (isDraft) return;
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={cancelDrag}
        onPointerOut={() => {
          cancelDrag();
          if (!isDraft) document.body.style.cursor = 'auto';
        }}
        onPointerOver={() => { if (!isDraft) document.body.style.cursor = 'pointer'; }}
      >
        <PlasmaSphere
          color={color}
          radius={radius}
          opacity={isDraft ? 0.85 : isHiddenParent ? 0.0 : 1.0}
          glowIntensity={
            isDraft ? 2.8
            : isHiddenParent ? 0
            : isMeActiveCenter ? 3.5
            : 0.2
          }
          halo={false}
          depthWrite={!isHiddenParent}
          speed={isMeActiveCenter ? 1.5 : 0.2}
        />
        {isVisible && !isHiddenParent && (
          <Billboard follow={true} lockX={false} lockY={false} lockZ={false} position={[0, -radius * 2.8, 0]}>
            <Text
              color={isDraft ? color : "#ffffff"}
              fontSize={Math.max(0.12, 0.22 - depth * 0.025)}
              maxWidth={3.0}
              lineHeight={1.1}
              letterSpacing={0.06}
              textAlign="center"
              anchorX="center"
              anchorY="middle"
              fillOpacity={isDraft ? 1 : isMeActiveCenter || isMeAncestor ? 0.95 : 0.65}
              outlineWidth={0.006}
              outlineColor="#000000"
              outlineOpacity={0.8}
            >
              {isDraft ? `✦ ${node.label}` : node.label}
            </Text>
          </Billboard>
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
            draftChildNode={draftChildNode}
            onNodeFocus={onNodeFocus}
          />
        );
      })}

      {isMeActiveCenter && draftChildNode && (
        <InternalNode
          key={draftChildNode.id}
          node={draftChildNode}
          targetPos={childPositions[childPositions.length - 1]}
          startPos={targetPos}
          color={color}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
          pathContext={myPath}
          parentPos={targetPos}
          isVisible={true}
          parentLabel={node.label}
          setBackInfo={setBackInfo}
          isDraft
          onNodeFocus={onNodeFocus}
        />
      )}

      {isMeActiveCenter && childEdges && (
        <lineSegments geometry={childEdges}>
          <lineBasicMaterial color={color} transparent opacity={0.4} />
        </lineSegments>
      )}
    </group>
  );
}
