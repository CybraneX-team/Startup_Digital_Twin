import { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';

import UniversalPolytope from '../components/UniversalPolytope';
import { PolytopeSidePanel } from '../components/PolytopeSidePanel';
import { PolytopeManager } from '../components/PolytopeManager';
import CreateDepartmentPanel from '../components/CreateDepartmentPanel';
import { ProductWorkspace } from '../components/workspace/ProductWorkspace';
import { usePolytopeStore } from '../lib/usePolytopeStore';
import type { UExternalNode, UInternalNode } from '../lib/usePolytopeStore';
import { useAuth } from '../lib/auth';
import { useCompany } from '../lib/db/companies';
import type { CoreWorkspacePhase } from '../lib/coreWorkspaceTransition';
import { useVoice } from '../context/VoiceContext';

export default function UniversalPage() {
  const { profile, canWrite } = useAuth();
  const { company } = useCompany(profile?.company_id);
  const store = usePolytopeStore('bdt');
  const { sendContextUpdate } = useVoice();
  const canEditTwin = canWrite('twin');

  /** New session id */
  const [bdtSessionId] = useState(() => Date.now());
  const [showBdtCanvas, setShowBdtCanvas] = useState(false);

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

  // ── Draft member state (for "Add Member" inline flow) ───────────────
  const [draftMember, setDraftMember] = useState<{ deptId: string; nodeId: string; member: any } | null>(null);
  const draftMemberScreenPosRef = useRef<{ x: number; y: number } | null>(null);

  // Camera reset trigger — increment to fly back to overview
  const [polytopeResetTrigger, setPolytopeResetTrigger] = useState(0);

  // PolytopeManager (CRUD modal) — only used for edit/delete flows now
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerView, setManagerView] = useState<any>({ type: 'home' });

  const handleEditDepartment = (dept: UExternalNode) => {
    if (!canEditTwin) return;
    setManagerView({ type: 'editDept', dept });
    setManagerOpen(true);
  };

  const handleEditNode = (dept: UExternalNode, node: UInternalNode) => {
    if (!canEditTwin) return;
    setManagerView({ type: 'editNode', dept, node });
    setManagerOpen(true);
  };

  const handleDeleteDepartmentClick = (dept: UExternalNode) => {
    if (!canEditTwin) return;
    setManagerView({ type: 'deleteDept', dept });
    setManagerOpen(true);
  };

  const handleDeleteNodeClick = (dept: UExternalNode, node: UInternalNode) => {
    if (!canEditTwin) return;
    setManagerView({ type: 'deleteNode', dept, node });
    setManagerOpen(true);
  };

  const handleEditMember = (dept: UExternalNode, node: UInternalNode, memberIndex: number) => {
    if (!canEditTwin) return;
    setManagerView({ type: 'editMember', dept, node, memberIndex });
    setManagerOpen(true);
  };

  const handleDeleteMemberClick = (dept: UExternalNode, node: UInternalNode, memberIndex: number) => {
    if (!canEditTwin) return;
    setManagerView({ type: 'deleteMember', dept, node, memberIndex });
    setManagerOpen(true);
  };

  // Product workspace — click core → dive in → workspace; back → surface out
  const [corePhase, setCorePhase] = useState<CoreWorkspacePhase>('idle');
  const [workspaceMounted, setWorkspaceMounted] = useState(false);
  const [workspaceAnim, setWorkspaceAnim] = useState<'enter' | 'exit' | null>(null);
  const isPolytopeInteractive = corePhase === 'idle';

  useLayoutEffect(() => {
    // We no longer unmount/remount the canvas or reset state on path change.
    // The component stays persistently mounted to preserve its state.
    if (!showBdtCanvas) {
      const rafId = requestAnimationFrame(() => setShowBdtCanvas(true));
      return () => cancelAnimationFrame(rafId);
    }
  }, [showBdtCanvas]);

  // Use the actual company name from the database, fallback to heuristic if loading
  const companyName = company?.name || (profile?.company_id
    ? profile?.first_name ? `${profile.first_name}'s workspace` : 'My workspace'
    : 'Universal Polytope');

  useEffect(() => {
    const deptSummary = store.departments.length
      ? store.departments.map(d => `${d.label} (score: ${d.score})`).join(', ')
      : 'No departments yet';
    sendContextUpdate(
      `[Navigation] User is on the Business Digital Twin page. Company: ${companyName}. Departments: ${deptSummary}.`
    );
  }, [store.departments, companyName]);

  // ── Add Department: spawn draft node + show panel ─────────────────────────
  // Camera fly is handled internally by Scene via useEffect on draftNodePos.
  const handleAddDepartment = () => {
    if (!canEditTwin) return;
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
    if (!canEditTwin) return;
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
    store.addNode(deptId, data, internalPath);
    setDraftInternalNode(null);
    setSelectedDeptId(deptId);
  };

  // ── Add Member: spawn draft member + show panel ─────────────────────
  const handleAddMember = (deptId: string, nodeId: string) => {
    if (!canEditTwin) return;
    const draftMemberData = {
      name: 'New Member',
      role: 'Member',
      avatarUrl: '',
      isDraft: true,
    };
    setDraftMember({ deptId, nodeId, member: draftMemberData });
    if (selectedDeptId !== deptId) {
      setSelectedDeptId(deptId);
      setRequestSelectDeptId(deptId);
    }
  };

  const handleDraftMemberUpdate = (patch: any) => {
    setDraftMember(prev => prev ? { ...prev, member: { ...prev.member, ...patch } } : prev);
  };

  const handleDraftMemberClose = (isCancel?: boolean) => {
    if (isCancel) {
      setDraftMember(null);
    }
  };

  const handleDraftMemberCreated = (data: any) => {
    if (!draftMember) return;
    const { deptId, nodeId } = draftMember;
    const dept = store.departments.find(d => d.id === deptId);
    if (!dept) return;
    const findNode = (nodes: UInternalNode[], id: string): UInternalNode | undefined => {
      for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children) {
          const found = findNode(n.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };
    const targetNode = findNode(dept.internalNodes, nodeId);
    if (targetNode && targetNode.type === 'team') {
      const newMembers = [...(targetNode.members || []), data];
      store.updateNode(deptId, nodeId, { members: newMembers, memberCount: newMembers.length });
    }
    setDraftMember(null);
    setSelectedDeptId(deptId);
  };

  // When dept is selected in 3D scene → update sidebar highlight
  const handleDepartmentChange = (id: string | null) => {
    selectionFromScene.current = true;
    setSelectedDeptId(id);
    setRequestSelectDeptId(id);
    if (id === null) {
      setInternalPath([]);
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

  const clearPolytopeSelection = useCallback(() => {
    setSelectedDeptId(null);
    setInternalPath([]);
    setRequestSelectDeptId(null);
    setInternalBackStep(0);
    setDraftDept(null);
    setDraftInternalNode(null);
    setDraftMember(null);
  }, []);

  const handleCoreClickIntent = useCallback(() => {
    if (corePhase !== 'idle') return;
    clearPolytopeSelection();
    setCorePhase('diving-in');
  }, [corePhase, clearPolytopeSelection]);

  const handleCoreDiveComplete = useCallback(() => {
    setWorkspaceAnim('enter');
    setWorkspaceMounted(true);
    setCorePhase('workspace');
  }, []);

  const handleBackToCompany = useCallback(() => {
    if (corePhase !== 'workspace') return;
    setWorkspaceAnim('exit');
  }, [corePhase]);

  const handleWorkspaceExitAnimationEnd = useCallback(() => {
    setWorkspaceMounted(false);
    setWorkspaceAnim(null);
    setCorePhase('surfacing');
  }, []);

  const handleCoreSurfaceComplete = useCallback(() => {
    setCorePhase('idle');
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-40">
      {/* ── 3D Polytope Canvas ── */}
      <div
        className="absolute inset-0"
        style={{
          opacity: corePhase === 'workspace' ? 0 : 1,
          pointerEvents: isPolytopeInteractive ? 'auto' : 'none',
          transition: corePhase === 'workspace' ? 'opacity 0.35s ease-out' : 'opacity 0.5s ease-in',
        }}
      >
        {showBdtCanvas && (
        <UniversalPolytope
          key={bdtSessionId}
          storeScope="bdt"
          companyName={companyName}
          onDepartmentChange={handleDepartmentChange}
          onInternalPathChange={setInternalPath}
          requestSelectDeptId={requestSelectDeptId}
          requestBackStep={internalBackStep}
          draftDept={draftDept}
          draftNodeScreenPosRef={draftDeptScreenPosRef}
          draftInternalNode={draftInternalNode}
          draftInternalNodeScreenPosRef={draftInternalNodeScreenPosRef}
          draftMember={draftMember}
          draftMemberScreenPosRef={draftMemberScreenPosRef}
          cameraResetTrigger={polytopeResetTrigger}
          departments={store.departments}
          selectedInternalPath={internalPath}
          enableCoreWorkspace={canEditTwin}
          readOnly={!canEditTwin}
          coreWorkspacePhase={corePhase}
          onCoreClickIntent={handleCoreClickIntent}
          onCoreDiveComplete={handleCoreDiveComplete}
          onCoreSurfaceComplete={handleCoreSurfaceComplete}
        />
        )}
      </div>

      {/* Core dive light burst (during camera fly-in) */}
      {corePhase === 'diving-in' && (
        <div
          className="absolute inset-0 z-[65] flex items-center justify-center core-dive-flash"
          aria-hidden
        >
          <div
            className="w-[min(90vw,520px)] aspect-square rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(193,174,255,0.5) 0%, rgba(30,58,138,0.35) 40%, transparent 70%)',
            }}
          />
        </div>
      )}

      {/* ── Product workspace (after core dive completes) ── */}
      {workspaceMounted && (
        <div
          className={`absolute inset-0 z-[70] ${
            workspaceAnim === 'enter' ? 'workspace-panel-enter' : ''
          } ${workspaceAnim === 'exit' ? 'workspace-panel-exit' : ''}`}
          onAnimationEnd={e => {
            if (e.animationName === 'workspace-exit') handleWorkspaceExitAnimationEnd();
          }}
        >
          <ProductWorkspace
            company={company}
            companyName={companyName}
            departments={store.departments.filter(
              d => d.domain !== 'inactive' && !d.isDraft,
            )}
            onBackToCompany={handleBackToCompany}
            exiting={workspaceAnim === 'exit'}
          />
        </div>
      )}

      {/* ── Left sidebar panel — hidden when create panel is shown ── */}
      {isPolytopeInteractive && !draftDept && !draftInternalNode && !draftMember && (
        <div className="fixed bottom-6 left-4 z-[60] pointer-events-auto">
          <PolytopeSidePanel
            departments={store.departments}
            selectedDeptId={selectedDeptId}
            onDeptSelect={handleSidebarDeptSelect}
            selectedInternalPath={internalPath}
            onAddDepartment={handleAddDepartment}
            onAddNode={handleAddNode}
            onAddMember={handleAddMember}
            onInternalBack={() => setInternalBackStep(c => c + 1)}
            onUpdateDepartment={store.updateDepartment}
            onDeleteDepartment={store.deleteDepartment}
            onUpdateNode={store.updateNode}
            onDeleteNode={store.deleteNode}
            onNodeSelect={setInternalPath}
            onEditDepartment={handleEditDepartment}
            onEditNode={handleEditNode}
            onDeleteDepartmentClick={handleDeleteDepartmentClick}
            onDeleteNodeClick={handleDeleteNodeClick}
            onEditMember={handleEditMember}
            onDeleteMemberClick={handleDeleteMemberClick}
            canEdit={canEditTwin}
          />
        </div>
      )}

      {/* ── Draft Dept Creation Panel ── */}
      {canEditTwin && draftDept && (
        <CreateDepartmentPanel
          mode="department"
          draftNodeScreenPosRef={draftDeptScreenPosRef}
          onDraftUpdate={handleDraftDeptUpdate}
          onClose={handleDraftDeptClose}
          onCreated={handleDraftDeptCreated}
        />
      )}

      {/* ── Draft Internal Node Creation Panel ── */}
      {canEditTwin && draftInternalNode && (() => {
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

      {/* ── Draft Member Creation Panel ── */}
      {canEditTwin && draftMember && (() => {
        const dept = store.departments.find(d => d.id === draftMember.deptId);
        if (!dept) return null;
        return (
          <CreateDepartmentPanel
            mode="member"
            dept={dept}
            draftNodeScreenPosRef={draftMemberScreenPosRef}
            onDraftUpdate={handleDraftMemberUpdate}
            onClose={handleDraftMemberClose}
            onCreated={handleDraftMemberCreated}
          />
        );
      })()}

      {/* ── CRUD modal — only for edit/delete flows now ── */}
      {canEditTwin && <PolytopeManager
        departments={store.departments}
        onAddDepartment={store.addDepartment}
        onUpdateDepartment={store.updateDepartment}
        onDeleteDepartment={(id) => {
          if (selectedDeptId === id) {
            setSelectedDeptId(null);
            setRequestSelectDeptId(null);
          }
          store.deleteDepartment(id);
        }}
        onAddNode={store.addNode}
        onUpdateNode={store.updateNode}
        onDeleteNode={store.deleteNode}
        onReset={store.resetToDefaults}
        forceOpen={managerOpen}
        forcedView={managerView}
        onForcedClose={() => setManagerOpen(false)}
      />}
    </div>
  );
}
