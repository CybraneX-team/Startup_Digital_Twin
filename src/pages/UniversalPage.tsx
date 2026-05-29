import { useState, useRef } from 'react';
import UniversalPolytope from '../components/UniversalPolytope';
import { PolytopeSidePanel } from '../components/PolytopeSidePanel';
import { PolytopeManager } from '../components/PolytopeManager';
import CreateDepartmentPanel from '../components/CreateDepartmentPanel';
import { usePolytopeStore } from '../lib/usePolytopeStore';
import type { UExternalNode, UInternalNode } from '../lib/usePolytopeStore';
import { useAuth } from '../lib/auth';
import { useCompany } from '../lib/db/companies';

export default function UniversalPage() {
  const { profile } = useAuth();
  const { company } = useCompany(profile?.company_id);
  const store = usePolytopeStore();

  // Sidebar state — which dept is selected in sidebar, and internal drill-down path
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [internalPath, setInternalPath] = useState<string[]>([]);
  // Counter incremented each time the sidebar's back button is pressed
  const [internalBackStep, setInternalBackStep] = useState(0);

  // requestSelectDeptId is only set when the SIDEBAR triggers a selection,
  // so the 3D scene camera flies in. When the 3D scene selects a dept itself
  // (user clicks a node), we just update selectedDeptId directly without
  // re-triggering the camera fly (the 3D scene already handles it).
  const [requestSelectDeptId, setRequestSelectDeptId] = useState<string | null | undefined>(undefined);

  // Track whether the last selection came from the 3D scene (to avoid loop)
  const selectionFromScene = useRef(false);

  // ── Draft dept state (for "Add Department" inline flow) ───────────────────
  const [draftDept, setDraftDept] = useState<UExternalNode | null>(null);
  const draftDeptScreenPosRef = useRef<{ x: number; y: number } | null>(null);

  // ── Draft internal node state (for "Add Node" inline flow) ───────────────
  const [draftInternalNode, setDraftInternalNode] = useState<{ deptId: string; node: UInternalNode } | null>(null);
  const draftInternalNodeScreenPosRef = useRef<{ x: number; y: number } | null>(null);

  // Camera reset trigger — increment to fly back to overview
  const [polytopeResetTrigger, setPolytopeResetTrigger] = useState(0);

  // PolytopeManager (CRUD modal) — only used for edit/delete flows now
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerView, setManagerView] = useState<any>({ type: 'home' });

  const handleEditDepartment = (dept: UExternalNode) => {
    setManagerView({ type: 'editDept', dept });
    setManagerOpen(true);
  };

  const handleEditNode = (dept: UExternalNode, node: UInternalNode) => {
    setManagerView({ type: 'editNode', dept, node });
    setManagerOpen(true);
  };

  // Use the actual company name from the database, fallback to heuristic if loading
  const companyName = company?.name || (profile?.company_id
    ? profile?.first_name ? `${profile.first_name}'s workspace` : 'My workspace'
    : 'Universal Polytope');

  // ── Add Department: spawn draft node + show panel ─────────────────────────
  // Camera fly is handled internally by Scene via useEffect on draftNodePos.
  const handleAddDepartment = () => {
    const draftId = `draft_dept_${Date.now()}`;
    const draft: UExternalNode = {
      id: draftId,
      label: 'New Department',
      domain: 'build',
      cluster: '',
      score: 75,
      metrics: { performance: 75, efficiency: 75, capacity: 75, alignment: 75, risk: 25 },
      internalNodes: [],
      isDraft: true,
    };
    setDraftDept(draft);
    // Deselect any current dept so the polytope returns to overview
    setRequestSelectDeptId(null);
  };

  const handleDraftDeptUpdate = (patch: Partial<Pick<UExternalNode, 'label' | 'domain'>>) => {
    setDraftDept(prev => prev ? { ...prev, ...patch } : prev);
  };

  const handleDraftDeptClose = (isCancel?: boolean) => {
    if (isCancel) {
      setDraftDept(null);
      setRequestSelectDeptId(null);
      setPolytopeResetTrigger(c => c + 1);
    }
  };

  const handleDraftDeptCreated = (data: Omit<UExternalNode, 'id' | 'internalNodes' | 'isDraft'>) => {
    const saved = store.addDepartment(data);
    setDraftDept(null);
    setPolytopeResetTrigger(c => c + 1);
    // Select the newly created real dept
    setSelectedDeptId(saved.id);
    setRequestSelectDeptId(saved.id);
  };

  // ── Add Node: spawn draft internal node + show panel ─────────────────────
  const handleAddNode = (deptId: string) => {
    const dept = store.departments.find(d => d.id === deptId);
    if (!dept) return;
    const draftNode: UInternalNode = {
      id: `draft_node_${Date.now()}`,
      label: 'New Node',
      type: 'team',
      score: 75,
      children: [],
    };
    setDraftInternalNode({ deptId, node: draftNode });
    if (selectedDeptId !== deptId) {
      setSelectedDeptId(deptId);
      setRequestSelectDeptId(deptId);
    }
  };

  const handleDraftNodeUpdate = (patch: Partial<Pick<UInternalNode, 'label' | 'type'>>) => {
    setDraftInternalNode(prev => prev ? { ...prev, node: { ...prev.node, ...patch } } : prev);
  };

  const handleDraftNodeClose = (isCancel?: boolean) => {
    if (isCancel) {
      setDraftInternalNode(null);
    }
  };

  const handleDraftNodeCreated = (data: Omit<UInternalNode, 'id' | 'children'>) => {
    if (!draftInternalNode) return;
    const deptId = draftInternalNode.deptId;
    store.addNode(deptId, data);
    setDraftInternalNode(null);
    setSelectedDeptId(deptId);
  };

  // When dept is selected in 3D scene → update sidebar highlight only (no camera retrigger)
  const handleDepartmentChange = (id: string | null) => {
    selectionFromScene.current = true;
    setSelectedDeptId(id);
    if (id === null) {
      setInternalPath([]);
      setRequestSelectDeptId(null);
      setInternalBackStep(0);
    }
    setTimeout(() => { selectionFromScene.current = false; }, 0);
  };

  // When sidebar selects a dept → update selectedDeptId AND trigger camera fly in 3D
  const handleSidebarDeptSelect = (id: string | null) => {
    setSelectedDeptId(id);
    if (id === null) {
      setInternalPath([]);
      setRequestSelectDeptId(null);
      setInternalBackStep(0);
    } else {
      setRequestSelectDeptId(id);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-56px)] -mb-8 bg-black overflow-hidden relative">
      {/* ── 3D Polytope Canvas ── */}
      <UniversalPolytope
        companyName={companyName}
        onDepartmentChange={handleDepartmentChange}
        onInternalPathChange={setInternalPath}
        requestSelectDeptId={requestSelectDeptId}
        requestBackStep={internalBackStep}
        draftDept={draftDept}
        draftNodeScreenPosRef={draftDeptScreenPosRef}
        draftInternalNode={draftInternalNode}
        draftInternalNodeScreenPosRef={draftInternalNodeScreenPosRef}
        cameraResetTrigger={polytopeResetTrigger}
        departments={store.departments}
        selectedInternalPath={internalPath}
      />

      {/* ── Left sidebar panel — hidden when create panel is shown ── */}
      {!draftDept && !draftInternalNode && (
        <div className="fixed bottom-6 left-4 z-[60] pointer-events-auto">
          <PolytopeSidePanel
            departments={store.departments}
            selectedDeptId={selectedDeptId}
            onDeptSelect={handleSidebarDeptSelect}
            selectedInternalPath={internalPath}
            onAddDepartment={handleAddDepartment}
            onAddNode={handleAddNode}
            onInternalBack={() => setInternalBackStep(c => c + 1)}
            onUpdateDepartment={store.updateDepartment}
            onDeleteDepartment={store.deleteDepartment}
            onUpdateNode={store.updateNode}
            onDeleteNode={store.deleteNode}
            onNodeSelect={setInternalPath}
            onEditDepartment={handleEditDepartment}
            onEditNode={handleEditNode}
          />
        </div>
      )}

      {/* ── Draft Dept Creation Panel ── */}
      {draftDept && (
        <CreateDepartmentPanel
          mode="department"
          draftNodeScreenPosRef={draftDeptScreenPosRef}
          onDraftUpdate={handleDraftDeptUpdate}
          onClose={handleDraftDeptClose}
          onCreated={handleDraftDeptCreated}
        />
      )}

      {/* ── Draft Internal Node Creation Panel ── */}
      {draftInternalNode && (() => {
        const dept = store.departments.find(d => d.id === draftInternalNode.deptId);
        if (!dept) return null;
        return (
          <CreateDepartmentPanel
            mode="node"
            dept={dept}
            draftNodeScreenPosRef={draftInternalNodeScreenPosRef}
            onDraftUpdate={handleDraftNodeUpdate}
            onClose={handleDraftNodeClose}
            onCreated={handleDraftNodeCreated}
          />
        );
      })()}

      {/* ── CRUD modal — only for edit/delete flows now ── */}
      <PolytopeManager
        departments={store.departments}
        onAddDepartment={store.addDepartment}
        onUpdateDepartment={store.updateDepartment}
        onDeleteDepartment={store.deleteDepartment}
        onAddNode={store.addNode}
        onUpdateNode={store.updateNode}
        onDeleteNode={store.deleteNode}
        onReset={store.resetToDefaults}
        forceOpen={managerOpen}
        forcedView={managerView}
        onForcedClose={() => setManagerOpen(false)}
      />
    </div>
  );
}
