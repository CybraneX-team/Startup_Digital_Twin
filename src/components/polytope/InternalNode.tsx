import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { UInternalNode } from '../../lib/universalPolytopeData';
import { PlasmaSphere } from '../PolytopeShared';
import { useDragWorkspaceStore } from '../../lib/useDragWorkspaceStore';

function DraggableHtmlCard({ children, delay = 0, style }: { children: React.ReactNode, delay?: number, style?: React.CSSProperties }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div style={{
      animation: `popIn 0.5s ${delay}s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
      opacity: 0,
      transform: 'scale(0)',
      pointerEvents: 'none'
    }}>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          ...style,
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          pointerEvents: 'auto',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PosTracker({ posRef }: { posRef: React.MutableRefObject<any> }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera, gl }) => {
    if (ref.current && posRef) {
      const wp = new THREE.Vector3();
      ref.current.getWorldPosition(wp);
      wp.project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      posRef.current = {
        x: ((wp.x + 1) / 2) * rect.width,
        y: (-(wp.y - 1) / 2) * rect.height,
      };
    }
  });
  return <group ref={ref} />;
}

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
  draftMember?: { deptId: string; nodeId: string; member: any } | null;
  draftMemberScreenPosRef?: React.MutableRefObject<{ x: number; y: number } | null>;
  onNodeFocus?: (pos: THREE.Vector3, node: UInternalNode) => void;
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
  draftMember = null,
  draftMemberScreenPosRef,
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
      if (onNodeFocus) onNodeFocus(targetPos, node);
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
      return; // Do nothing when clicking an already active node
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
              fontSize={Math.max(0.08, 0.15 - depth * 0.02)}
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

        {isMeActiveCenter && node.type === 'team' && (node.members?.length || draftMember) && (
          <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
            {[...(node.members || []), ...(draftMember && draftMember.nodeId === node.id ? [draftMember.member] : [])].map((member, i, arr) => {
              const angle = (i / arr.length) * Math.PI * 2;
              // Precisely scale the radius based on member count to perfectly balance spacing
              const r = radius * (5.5 + arr.length * 0.5);
              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;
              const isDraft = draftMember && draftMember.nodeId === node.id && i === arr.length - 1;

              return (
                <group key={i} position={[x, y, 0]}>
                  {isDraft && draftMemberScreenPosRef && (
                    <PosTracker posRef={draftMemberScreenPosRef} />
                  )}
                  <Html center zIndexRange={[100, 0]}>
                    <DraggableHtmlCard delay={i * 0.05} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      width: 'max-content',
                      color: '#ffffff',
                      textAlign: 'center'
                    }}>
                      {member.avatarUrl && (
                        <div style={{
                          width: 72,
                          height: 72,
                          borderRadius: '50%',
                          border: `2px solid ${color}`,
                          overflow: 'hidden',
                          boxShadow: `0 0 15px ${color}66`
                        }}>
                          <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>{member.name}</span>
                        <span style={{ fontSize: '11px', color: '#cbd5e1', textShadow: '0 1px 3px rgba(0,0,0,0.9)', marginTop: '2px' }}>{member.role}</span>
                      </div>
                    </DraggableHtmlCard>
                  </Html>
                </group>
              );
            })}
            <Html>
              <style>{`
                @keyframes popIn {
                  0% { transform: scale(0); opacity: 0; }
                  100% { transform: scale(1); opacity: 1; }
                }
              `}</style>
            </Html>
          </Billboard>
        )}

        {isMeActiveCenter && node.type === 'project' && node.projectDetails && (
          <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
            <Html position={[radius * 7.5, 0, 0]} center zIndexRange={[100, 0]}>
            <DraggableHtmlCard style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${color}88`,
              borderRadius: '12px',
              padding: '16px',
              width: '240px',
              color: '#e2e8f0',
              boxShadow: `0 8px 32px ${color}33`,
            }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: `1px solid ${color}66`, paddingBottom: '8px', marginBottom: '8px', color: '#fff' }}>Project Summary</div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Status:</span> <span style={{ fontWeight: 600 }}>{node.projectDetails.status || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Deadline:</span> <span style={{ fontWeight: 600 }}>{node.projectDetails.deadline || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Budget:</span> <span style={{ fontWeight: 600 }}>{node.projectDetails.budget || 'N/A'}</span>
                </div>
                {node.projectDetails.description && (
                  <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#cbd5e1', lineHeight: 1.4 }}>
                    "{node.projectDetails.description}"
                  </div>
                )}
              </div>
            </DraggableHtmlCard>
              <style>{`
                @keyframes popIn {
                  0% { transform: scale(0); opacity: 0; }
                  100% { transform: scale(1); opacity: 1; }
                }
              `}</style>
            </Html>
          </Billboard>
        )}
      </group>

      {node.children && !(isMeActiveCenter && node.type === 'team' && (node.members?.length || draftMember)) && node.children.map((child, i) => {
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
            draftMember={draftMember}
            draftMemberScreenPosRef={draftMemberScreenPosRef}
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

      {isMeActiveCenter && childEdges && !(isMeActiveCenter && node.type === 'team' && (node.members?.length || draftMember)) && (
        <lineSegments geometry={childEdges}>
          <lineBasicMaterial color={color} transparent opacity={0.4} />
        </lineSegments>
      )}
    </group>
  );
}
