import { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';

import UniversalPolytope from '../components/UniversalPolytope';
import { PolytopeSidePanel } from '../components/PolytopeSidePanel';
import { PolytopeManager } from '../components/PolytopeManager';
import CreateDepartmentPanel from '../components/CreateDepartmentPanel';
import { usePolytopeStore } from '../lib/usePolytopeStore';
import type { UExternalNode, UInternalNode } from '../lib/usePolytopeStore';
import { useAuth } from '../lib/auth';
import { useCompany } from '../lib/db/companies';
import type { CoreWorkspacePhase } from '../lib/coreWorkspaceTransition';
import { getAllIndustries } from '../lib/db/industries';
import { getAllSubdomains } from '../lib/db/subdomains';
import { useVoice } from '../context/VoiceContext';
import { BdtActionWorkspace } from '../components/workspace/BdtActionWorkspace';

export default function UniversalPage() {
  const { profile, canWrite } = useAuth();
  const canCreateDepartments = canWrite('twin') && canWrite('team');
  const { company } = useCompany(profile?.company_id);
  const store = usePolytopeStore('bdt');
  const { sendContextUpdate, voiceState, toggle, intensityRef } = useVoice();
  const canWriteDept = (dept?: UExternalNode | null) => Boolean(dept?.access?.write);
  const canDeleteDept = (dept?: UExternalNode | null) => Boolean(dept?.access?.delete);
  const hasWritableDepartment = store.departments.some(d => canWriteDept(d));

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
  /** Bumped on every sidebar dept pick so Scene re-flies even to the same dept. */
  const [selectDeptNonce, setSelectDeptNonce] = useState(0);

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

  useEffect(() => {
    void store.loadDepartments();
  }, [store.loadDepartments]);

  // ── Compute current node for BDT action workspace (leaf drill) ──
  const selectedDept = selectedDeptId ? store.departments.find(d => d.id === selectedDeptId) : null;
  const getSelectedInternalNode = () => {
    if (!selectedDept || internalPath.length === 0) return null;
    let currentNodes = selectedDept.internalNodes;
    let targetNode: UInternalNode | null = null;
    for (const p of internalPath) {
      targetNode = currentNodes?.find(n => n.id === p) || null;
      if (targetNode) currentNodes = targetNode.children || [];
    }
    return targetNode;
  };
  const selectedNode = getSelectedInternalNode();
  const isLeafNode = !!selectedNode && (!selectedNode.children || selectedNode.children.length === 0);

  const handleEditDepartment = (dept: UExternalNode) => {
    if (!canWriteDept(dept)) return;
    setManagerView({ type: 'editDept', dept });
    setManagerOpen(true);
  };

  const handleEditNode = (dept: UExternalNode, node: UInternalNode) => {
    if (!canWriteDept(dept)) return;
    setManagerView({ type: 'editNode', dept, node });
    setManagerOpen(true);
  };

  const handleDeleteDepartmentClick = (dept: UExternalNode) => {
    if (!canDeleteDept(dept)) return;
    setManagerView({ type: 'deleteDept', dept });
    setManagerOpen(true);
  };

  const handleDeleteNodeClick = (dept: UExternalNode, node: UInternalNode) => {
    if (!canDeleteDept(dept)) return;
    setManagerView({ type: 'deleteNode', dept, node });
    setManagerOpen(true);
  };

  const handleEditMember = (dept: UExternalNode, node: UInternalNode, memberIndex: number) => {
    if (!canWriteDept(dept)) return;
    setManagerView({ type: 'editMember', dept, node, memberIndex });
    setManagerOpen(true);
  };

  const handleDeleteMemberClick = (dept: UExternalNode, node: UInternalNode, memberIndex: number) => {
    if (!canWriteDept(dept)) return;
    setManagerView({ type: 'deleteMember', dept, node, memberIndex });
    setManagerOpen(true);
  };

  // Core workspace/Voice AI zoom state
  const [corePhase, setCorePhase] = useState<CoreWorkspacePhase>('idle');
  const isPolytopeInteractive = corePhase === 'idle';

  useEffect(() => {
    if (voiceState === 'idle' && corePhase === 'workspace') {
      setCorePhase('surfacing');
    } else if (voiceState !== 'idle' && corePhase === 'idle') {
      setCorePhase('diving-in');
    }
  }, [voiceState, corePhase]);

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

  const [industryName, setIndustryName] = useState('');
  const [subdomainName, setSubdomainName] = useState('');

  useEffect(() => {
    if (company) {
      getAllIndustries().then(inds => {
        const ind = inds.find(i => i.id === company.industry_id);
        if (ind) setIndustryName(ind.label);
      });
      getAllSubdomains().then(subs => {
        const sub = subs.find(s => s.id === company.subdomain_id);
        if (sub) setSubdomainName(sub.label);
      });
    }
  }, [company]);

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
    if (!canCreateDepartments) return;
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

  const handleDraftDeptCreated = async (data: Omit<UExternalNode, 'id' | 'internalNodes' | 'isDraft'>) => {
    const saved = await store.addDepartment(data);
    setDraftDept(null);
    setPolytopeResetTrigger(c => c + 1);
    // Select the newly created real dept
    setSelectedDeptId(saved.id);
    setRequestSelectDeptId(saved.id);
  };

  // ── Add Node: spawn draft internal node + show panel ─────────────────────
  const handleAddNode = (deptId: string) => {
    const dept = store.departments.find(d => d.id === deptId);
    if (!dept || !canWriteDept(dept)) return;
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

  const handleDraftNodeCreated = async (data: Omit<UInternalNode, 'id' | 'children'>) => {
    if (!draftInternalNode) return;
    const deptId = draftInternalNode.deptId;
    await store.addNode(deptId, data, internalPath);
    setDraftInternalNode(null);
    setSelectedDeptId(deptId);
  };

  // ── Add Member: spawn draft member + show panel ─────────────────────
  const handleAddMember = (deptId: string, nodeId: string) => {
    const dept = store.departments.find(d => d.id === deptId);
    if (!canWriteDept(dept)) return;
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
      void store.updateNode(deptId, nodeId, { members: newMembers, memberCount: newMembers.length });
    }
    setDraftMember(null);
    setSelectedDeptId(deptId);
  };

  // When dept is selected in 3D scene → update sidebar highlight
  const handleDepartmentChange = (id: string | null) => {
    selectionFromScene.current = true;
    if (id !== selectedDeptId) {
      setInternalPath([]);
      setInternalBackStep(0);
    }
    setSelectedDeptId(id);
    if (id === null) {
      setInternalPath([]);
      setInternalBackStep(0);
      setRequestSelectDeptId(null);
    }
    setTimeout(() => { selectionFromScene.current = false; }, 0);
  };

  // When sidebar selects a dept → update selectedDeptId AND trigger camera fly in 3D
  const handleSidebarDeptSelect = (id: string | null, internalPathOverride?: string[]) => {
    if (id !== selectedDeptId) {
      setInternalPath([]);
      setInternalBackStep(0);
    }
    setSelectedDeptId(id);
    if (id === null) {
      setInternalPath([]);
      setRequestSelectDeptId(null);
      setInternalBackStep(0);
    } else {
      if (internalPathOverride) {
        setInternalPath(internalPathOverride);
      } else {
        setInternalPath([]);
      }
      setRequestSelectDeptId(id);
      setSelectDeptNonce(n => n + 1);
    }
  };



  const handleCoreClickIntent = useCallback(() => {
    toggle();
  }, [toggle]);

  const handleCoreDiveComplete = useCallback(() => {
    if (corePhase === 'diving-in') {
      setCorePhase('workspace');
    }
  }, [corePhase]);

  const handleCoreSurfaceComplete = useCallback(() => {
    if (corePhase === 'surfacing') {
      setCorePhase('idle');
    }
  }, [corePhase]);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-40">
      {/* ── 3D Polytope Canvas ── */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 1,
          pointerEvents: (isPolytopeInteractive || corePhase === 'workspace') ? 'auto' : 'none',
        }}
      >
        {showBdtCanvas && (
          <UniversalPolytope
            key={bdtSessionId}
            storeScope="bdt"
            companyName={companyName}
            industryName={industryName}
            subdomainName={subdomainName}
            onDepartmentChange={handleDepartmentChange}
            onInternalPathChange={setInternalPath}
            requestSelectDeptId={requestSelectDeptId}
            selectDeptNonce={selectDeptNonce}
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
            enableCoreWorkspace={hasWritableDepartment}
            readOnly={!hasWritableDepartment}
            coreWorkspacePhase={corePhase}
            onCoreClickIntent={handleCoreClickIntent}
            onCoreDiveComplete={handleCoreDiveComplete}
            onCoreSurfaceComplete={handleCoreSurfaceComplete}
            voiceIntensityRef={intensityRef}
          />
        )}
      </div>




      {/* Back button when Voice AI is active */}
      {voiceState !== 'idle' && (
        <button
          onClick={() => toggle()}
          className="fixed top-20 left-6 z-[60] flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 border backdrop-blur-md transition-all hover:text-white hover:border-purple-500/30"
          style={{ background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(148,163,184,0.1)' }}
        >
          &larr; Back to Polytope
        </button>
      )}

      {/* ── Left sidebar panel — hidden when create panel is shown ── */}
      {isPolytopeInteractive && !isLeafNode && !draftDept && !draftInternalNode && !draftMember && (
        <div className="fixed bottom-6 left-4 z-[60] pointer-events-auto">
          <PolytopeSidePanel
            departments={store.departments}
            selectedDeptId={selectedDeptId}
            onDeptSelect={(id) => handleSidebarDeptSelect(id)}
            selectedInternalPath={internalPath}
            onAddDepartment={handleAddDepartment}
            onAddNode={handleAddNode}
            onAddMember={handleAddMember}
            onInternalBack={() => setInternalBackStep(c => c + 1)}
            onUpdateDepartment={store.updateDepartment}
            onDeleteDepartment={store.deleteDepartment}
            onUpdateNode={store.updateNode}
            onDeleteNode={store.deleteNode}
            onNodeSelect={(path) => {
              setInternalPath(path);
              if (selectedDeptId) setSelectDeptNonce(n => n + 1);
            }}
            onEditDepartment={handleEditDepartment}
            onEditNode={handleEditNode}
            onDeleteDepartmentClick={handleDeleteDepartmentClick}
            onDeleteNodeClick={handleDeleteNodeClick}
            onEditMember={handleEditMember}
            onDeleteMemberClick={handleDeleteMemberClick}
            canEdit={hasWritableDepartment}
            canCreateDepartment={canCreateDepartments}
          />
        </div>
      )}

      {isPolytopeInteractive && store.loaded && !store.loading && store.departments.length === 0 && !draftDept && (
        <div className="fixed left-6 bottom-6 z-[60] max-w-sm rounded-xl border border-slate-800 bg-black/70 p-4 text-sm text-slate-300 backdrop-blur-md">
          No accessible departments are available for your account.
        </div>
      )}

      {/* ── Draft Dept Creation Panel ── */}
      {canCreateDepartments && draftDept && (
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
        if (!dept || !canWriteDept(dept)) return null;
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
      {draftMember && (() => {
        const dept = store.departments.find(d => d.id === draftMember.deptId);
        if (!dept || !canWriteDept(dept)) return null;
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

      {/* ── BDT Action Workspace (Leaf Nodes) ── */}
      {selectedDept && selectedNode && (
        <BdtActionWorkspace
          isOpen={isLeafNode}
          node={selectedNode}
          department={selectedDept}
          allDepartments={store.departments}
          canEdit={canWriteDept(selectedDept)}
          onAddMember={handleAddMember}
          onEditMember={handleEditMember}
          onDeleteMember={handleDeleteMemberClick}
          onClose={() => {
            // go up one level
            setInternalPath(prev => prev.slice(0, -1));
          }}
          onDepartmentClick={(deptId) => {
            // Navigate to the interrelated department
            setInternalPath([]);
            setSelectedDeptId(deptId);
            setRequestSelectDeptId(deptId);
          }}
        />
      )}

      {/* ── CRUD modal — only for edit/delete flows now ── */}
      {hasWritableDepartment && <PolytopeManager
        departments={store.departments}
        onAddDepartment={store.addDepartment}
        onUpdateDepartment={store.updateDepartment}
        onDeleteDepartment={(id) => {
          if (selectedDeptId === id) {
            setSelectedDeptId(null);
            setRequestSelectDeptId(null);
          }
          void store.deleteDepartment(id);
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
