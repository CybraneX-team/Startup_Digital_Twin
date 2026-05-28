import { useState, useCallback, type MutableRefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import type { UExternalNode, UInternalNode } from '../../lib/universalPolytopeData';
import { usePolytopeStore } from '../../lib/usePolytopeStore';
import { PolytopeManager } from '../PolytopeManager';
import { AnalyticHoverCard } from './AnalyticHoverCard';
import { Scene } from './Scene';
import { BASE_CAMERA_DISTANCE } from './constants';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface UniversalPolytopeProps {
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
  /** Transient draft dept rendered as a pulsing preview node (not persisted) */
  draftDept?: UExternalNode | null;
  /** Ref written by Scene each frame with screen-space position of the draft dept node */
  draftNodeScreenPosRef?: MutableRefObject<{ x: number; y: number } | null>;
  /** Transient draft internal node preview */
  draftInternalNode?: { deptId: string; node: UInternalNode } | null;
  /** Ref written by Scene each frame with screen-space position of the draft internal node */
  draftInternalNodeScreenPosRef?: MutableRefObject<{ x: number; y: number } | null>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UniversalPolytope({
  companyName = 'Universal Polytope',
  onExitIntent,
  transparent = false,
  cameraResetTrigger = 0,
  onDepartmentChange,
  onInternalPathChange,
  requestSelectDeptId,
  requestBackStep,
  draftDept,
  draftNodeScreenPosRef,
  draftInternalNode,
  draftInternalNodeScreenPosRef,
}: UniversalPolytopeProps) {
  const [selectedId, setSelectedIdRaw] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // no-op — back info is used only when rendering an in-canvas back button
  const setBackInfo = useCallback(
    (_info: { label: string; onClick: () => void } | null) => {},
    []
  );

  const setSelectedId = (id: string | null) => {
    setSelectedIdRaw(id);
    onDepartmentChange?.(id);
  };

  const store = usePolytopeStore();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, BASE_CAMERA_DISTANCE], fov: 45, near: 0.1, far: 300 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: transparent }}
      >
        <Scene
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onPathChange={path => { onInternalPathChange?.(path); }}
          setBackInfo={setBackInfo}
          companyName={companyName}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          departments={store.departments}
          onExitIntent={onExitIntent}
          cameraResetTrigger={cameraResetTrigger}
          requestSelectDeptId={requestSelectDeptId}
          requestBackStep={requestBackStep}
          draftDept={draftDept}
          draftNodeScreenPosRef={draftNodeScreenPosRef}
          draftInternalNode={draftInternalNode}
          draftInternalNodeScreenPosRef={draftInternalNodeScreenPosRef}
        />
      </Canvas>

      <AnalyticHoverCard hoveredId={hoveredId} departments={store.departments} />

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
