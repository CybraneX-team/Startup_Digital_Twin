import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import UniverseCanvas from '../three-universe/UniverseCanvas';
import { useUniverseGraph } from '../data/universeGraph';
import { useAuth } from '../lib/auth';
import { useCompany } from '../lib/db/companies';
import { UniverseController, type NavPathEntry, type ZoomLevel, type HoverTarget, ZOOM_LEVELS } from '../three-universe/UniverseController';
import type { UniverseIndustry, UniverseSubdomain } from '../data/universeGraph';
import CreateCompanyModal from '../components/CreateCompanyModal';
import type { LocalCompany } from '../lib/localCompanies';
import UniversalPolytope from '../components/UniversalPolytope';
import PlanetRootNodeView from '../components/planet/PlanetRootNodeView';
import { PolytopeSidePanel } from '../components/PolytopeSidePanel';
import { PolytopeManager } from '../components/PolytopeManager';
import CreateDepartmentPanel from '../components/CreateDepartmentPanel';
import CompanyPlanet3DView, { ROOT_FOCUS_TOTAL_MS } from '../components/CompanyPlanet3DView';
import { CompanyPlanetSidePanel } from '../components/CompanyPlanetSidePanel';
import {
  getPlanetRootsForCompany,
  rootsToPolytopeDepartments,
  type UserPlanetRole,
  type CompanyPlanetContext,
} from '../data/companyPlanetRoots';
import { OpenWorkspaceCue } from '../components/OpenWorkspaceCue';
import { UniverseGalaxySidebar } from '../components/universe/UniverseGalaxySidebar';
import { TwinWorkspaceLayout } from '../components/twin/TwinWorkspaceLayout';
import {
  type TwinWorkspacePhase,
  TWIN_WORKSPACE_CAMERA_MS,
  TWIN_WORKSPACE_PANEL_MS,
  TWIN_WORKSPACE_CLOSE_MS,
  isTwinWorkspaceActive,
} from '../lib/twinWorkspaceTransition';
import {
  savePlanetState,
  loadPlanetState,
  clearPlanetState,
} from '../lib/universeNavPersistence';
import { usePolytopeStore } from '../lib/usePolytopeStore';
import type { UExternalNode, UInternalNode } from '../lib/usePolytopeStore';
import { ActionNodeWorkspace } from '../components/workspace/ActionNodeWorkspace';
import { DragWorkspaceOverlay } from '../components/workspace/DragWorkspaceOverlay';
import { CompanyTagDropdown } from '../components/planet/CompanyTagDropdown';
import { useVoice } from '../context/VoiceContext';

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Universe3DPage() {
  const navigate = useNavigate();
  const { pathname, state } = useLocation();
  const { user, profile, canRead, canWrite, role: authRole } = useAuth();
  const { company } = useCompany(profile?.company_id);
  // Bypass users (VC/Incubator) have no company — pass null so the universe loads without waiting
  const isBypassUser = !!user && localStorage.getItem('active_role') === 'vc';
  const companyId = isBypassUser ? null : (user ? (profile?.company_id ?? null) : undefined);
  const { data, loading, error, appendLocalCompany } = useUniverseGraph(companyId);
  const canEditTwin = canWrite('twin');

  // Company name for the polytope core sphere — same fallback chain as UniversalPage
  const bhCompanyName = company?.name || (profile?.company_id
    ? profile?.first_name ? `${profile.first_name}'s workspace` : 'My workspace'
    : 'My Organisation');

  const { sendContextUpdate } = useVoice();

  const controllerRef = useRef<UniverseController | null>(null);
  const [navPath, setNavPath] = useState<NavPathEntry[]>([]);
  const [currentLevel, setCurrentLevel] = useState<ZoomLevel>(ZOOM_LEVELS.GALAXY);
  const [hoverTarget, setHoverTarget] = useState<HoverTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [insideBH, setInsideBH] = useState(false);
  const [bhTransitioning, setBhTransitioning] = useState(false);
  // Mount once on first BH entry — never unmount (avoids R3F OrbitControls null-connect error)
  const [bhMounted, setBhMounted] = useState(false);
  // Increments each entry so UniversalPolytope resets camera to initial view
  const [bhEntryCount, setBhEntryCount] = useState(0);

  const [twinWorkspacePhase, setTwinWorkspacePhase] = useState<TwinWorkspacePhase>('closed');
  const openWorkspacePendingRef = useRef(false);
  const twinWorkspaceTimerRef = useRef<number | null>(null);

  const clearTwinWorkspaceTimers = useCallback(() => {
    if (twinWorkspaceTimerRef.current != null) {
      window.clearTimeout(twinWorkspaceTimerRef.current);
      twinWorkspaceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const path = navPath.map(e => e.name).join(' → ') || 'Galaxy overview';
    sendContextUpdate(
      `[Navigation] User is on the 3D Startup Universe. Viewing: ${path}. Company: ${bhCompanyName}.`
    );
  }, [navPath, currentLevel, bhCompanyName]);

  const beginTwinWorkspacePanels = useCallback(() => {
    clearTwinWorkspaceTimers();
    setTwinWorkspacePhase('entering');
    twinWorkspaceTimerRef.current = window.setTimeout(() => {
      setTwinWorkspacePhase('open');
      twinWorkspaceTimerRef.current = null;
    }, TWIN_WORKSPACE_PANEL_MS);
  }, [clearTwinWorkspaceTimers]);

  const scheduleTwinWorkspacePanels = useCallback(
    (delayMs: number) => {
      clearTwinWorkspaceTimers();
      twinWorkspaceTimerRef.current = window.setTimeout(() => {
        beginTwinWorkspacePanels();
      }, delayMs);
    },
    [beginTwinWorkspacePanels, clearTwinWorkspaceTimers],
  );

  useEffect(() => () => clearTwinWorkspaceTimers(), [clearTwinWorkspaceTimers]);

  useEffect(() => {
    controllerRef.current?.setWorkspaceCompose(isTwinWorkspaceActive(twinWorkspacePhase));
  }, [twinWorkspacePhase]);

  useEffect(() => {
    if (!isTwinWorkspaceActive(twinWorkspacePhase)) return;
    if (twinWorkspacePhase === 'closing') return;
    controllerRef.current?.applyTwinWorkspaceFocus();
  }, [twinWorkspacePhase]);

  useEffect(() => {
    if (twinWorkspacePhase === 'closed') {
      controllerRef.current?.exitTwinWorkspaceFocus();
      controllerRef.current?.restoreUniverseInteraction();
    }
  }, [twinWorkspacePhase]);

  // ── Polytope sidebar state (shown when insideBH) ──────────────────────────
  const polytopeStore = usePolytopeStore('twin');
  const [polytopeDeptId, setPolytopeDeptId] = useState<string | null>(null);
  const [polytopeInternalPath, setPolytopeInternalPath] = useState<string[]>([]);
  const [polytopeManagerOpen, setPolytopeManagerOpen] = useState(false);
  const [polytopeManagerView, setPolytopeManagerView] = useState<any>({ type: 'home' });

  const handleEditDepartment = useCallback((dept: UExternalNode) => {
    if (!canEditTwin) return;
    setPolytopeManagerView({ type: 'editDept', dept });
    setPolytopeManagerOpen(true);
  }, [canEditTwin]);

  const handleEditNode = useCallback((dept: UExternalNode, node: UInternalNode) => {
    if (!canEditTwin) return;
    setPolytopeManagerView({ type: 'editNode', dept, node });
    setPolytopeManagerOpen(true);
  }, [canEditTwin]);

  const handleDeleteDepartmentClick = useCallback((dept: UExternalNode) => {
    if (!canEditTwin) return;
    setPolytopeManagerView({ type: 'deleteDept', dept });
    setPolytopeManagerOpen(true);
  }, [canEditTwin]);

  const handleDeleteNodeClick = useCallback((dept: UExternalNode, node: UInternalNode) => {
    if (!canEditTwin) return;
    setPolytopeManagerView({ type: 'deleteNode', dept, node });
    setPolytopeManagerOpen(true);
  }, [canEditTwin]);

  const handleEditMember = useCallback((dept: UExternalNode, node: UInternalNode, memberIndex: number) => {
    if (!canEditTwin) return;
    setPolytopeManagerView({ type: 'editMember', dept, node, memberIndex });
    setPolytopeManagerOpen(true);
  }, [canEditTwin]);

  const handleDeleteMemberClick = useCallback((dept: UExternalNode, node: UInternalNode, memberIndex: number) => {
    if (!canEditTwin) return;
    setPolytopeManagerView({ type: 'deleteMember', dept, node, memberIndex });
    setPolytopeManagerOpen(true);
  }, [canEditTwin]);

  // Separate state so clicking sidebar triggers camera fly-in without looping
  const [polytopeRequestSelectDeptId, setPolytopeRequestSelectDeptId] = useState<string | null | undefined>(undefined);
  // Counter incremented by sidebar back button to go back one internal level
  const [polytopeInternalBackStep, setPolytopeInternalBackStep] = useState(0);

  // ── Draft dept/node state for inline creation panels ─────────────────────
  const [polytopeDraftDept, setPolytopeDraftDept] = useState<UExternalNode | null>(null);
  const polytopeDraftDeptScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  const [polytopeDraftInternalNode, setPolytopeDraftInternalNode] = useState<{ deptId: string; node: UInternalNode } | null>(null);
  const polytopeDraftInternalNodeScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  const [polytopeDraftMember, setPolytopeDraftMember] = useState<{ deptId: string; nodeId: string; member: any } | null>(null);
  const polytopeDraftMemberScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  // Incremented on draft create/cancel to fly camera back to overview
  const [polytopeDraftResetTrigger, setPolytopeDraftResetTrigger] = useState(0);

  const handlePolytopeAddDepartment = useCallback(() => {
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
    setPolytopeDraftDept(draft);
    // Deselect current dept so camera returns to overview before flying to draft
    setPolytopeRequestSelectDeptId(null);
  }, [canEditTwin]);

  const handlePolytopeAddNode = useCallback((deptId: string) => {
    if (!canEditTwin) return;
    const dept = polytopeStore.departments.find(d => d.id === deptId);
    if (!dept) return;
    const draftNode: UInternalNode = {
      id: `draft_node_${Date.now()}`,
      label: 'New Node',
      type: 'team',
      score: 75,
      children: [],
    };
    setPolytopeDraftInternalNode({ deptId, node: draftNode });
    setPolytopeDeptId(deptId);
    if (polytopeDeptId !== deptId) {
      setPolytopeRequestSelectDeptId(deptId);
    }
  }, [canEditTwin, polytopeStore.departments, polytopeDeptId]);

  const handlePolytopeAddMember = useCallback((deptId: string, nodeId: string) => {
    if (!canEditTwin) return;
    const draftMemberData = {
      name: 'New Member',
      role: 'Member',
      avatarUrl: '',
      isDraft: true,
    };
    setPolytopeDraftMember({ deptId, nodeId, member: draftMemberData });
    setPolytopeDeptId(deptId);
    if (polytopeDeptId !== deptId) {
      setPolytopeRequestSelectDeptId(deptId);
    }
  }, [canEditTwin, polytopeDeptId]);

  // Called when the 3D scene selects a dept
  const handlePolytopeDeptChange = useCallback((id: string | null) => {
    setPolytopeDeptId(id);
    setPolytopeRequestSelectDeptId(id);
    if (id === null) {
      setPolytopeInternalPath([]);
      setPolytopeInternalBackStep(0);
    }
  }, []);

  // Called when sidebar selects a dept — update dept AND trigger camera fly-in
  const handlePolytopeSidebarDeptSelect = useCallback((id: string | null) => {
    setPolytopeDeptId(id);
    if (id === null) {
      setPolytopeInternalPath([]);
      setPolytopeRequestSelectDeptId(null);
      setPolytopeInternalBackStep(0);
    } else {
      setPolytopeRequestSelectDeptId(id);
    }
  }, []);

  // Reset sidebar when exiting BH
  const handleExitBH = useCallback(() => {
    setInsideBH(false);
    setPolytopeDeptId(null);
    setPolytopeInternalPath([]);
    setPolytopeRequestSelectDeptId(null);
    setPolytopeInternalBackStep(0);
  }, []);

  const handleEnterBH = useCallback(() => {
    setBhMounted(true);
    setInsideBH(true);
    setBhTransitioning(true);
    setBhEntryCount(c => c + 1);
    
    // Disable pointer events during the 1.4s fade-in transition
    // to prevent scroll momentum from zooming inside the polytope camera
    setTimeout(() => {
      setBhTransitioning(false);
    }, 1400);
  }, []);

  // Called from within R3F overlay when user scrolls out past OrbitControls maxDistance
  const handleBHExitIntent = useCallback(() => {
    setInsideBH(false);
    setPolytopeDeptId(null);
    setPolytopeInternalPath([]);
    setPolytopeRequestSelectDeptId(null);
    setPolytopeInternalBackStep(0);
    controllerRef.current?.exitBlackHole();
  }, []);

  // ── Company in-scene interior (logged-in company — no Universal Polytope overlay) ──
  const [insideCompanyInterior, setInsideCompanyInterior] = useState(false);

  const [companyInteriorPath, setCompanyInteriorPath] = useState<string[]>([]);

  const handleEnterCompanyInterior = useCallback((_company: any) => {
    controllerRef.current?.syncCompanyDepartments(polytopeStore.departments);
    setInsideCompanyInterior(true);
    setCompanyInteriorPath([]);
  }, [polytopeStore.departments]);

  const handleInteriorLevelChange = useCallback((_depth: number, path: string[]) => {
    setCompanyInteriorPath(path);
  }, []);

  useEffect(() => {
    controllerRef.current?.syncCompanyDepartments(polytopeStore.departments);
  }, [polytopeStore.departments]);

  // Called by NavigationManager whenever leaving COMPANY level (back button, ESC, or scroll-out)
  const handleExitCompanyPolytope = useCallback(() => {
    setInsideCompanyInterior(false);
    setCompanyInteriorPath([]);
    setInsidePlanetRoots(false);
    setInsideRootPolytope(false);
    setPlanetContext(null);
    setPlanetSearchQuery('');
    setRootPolytopeDeptId(null);
    setRootPolytopeInternalPath([]);
    setRootPolytopeBackStep(0);
    setActionWorkspace(null);
  }, []);

  // ── Company planet root systems (Industry OS) ──

  const [insidePlanetRoots, setInsidePlanetRoots] = useState(false);
  const [planetContext, setPlanetContext] = useState<CompanyPlanetContext | null>(null);
  const [planetSearchQuery, setPlanetSearchQuery] = useState('');
  const [planetIndustryColor, setPlanetIndustryColor] = useState('#C1AEFF');

  // ── Root → BDT internal node layout (no convex polytope hull) ──
  const [insideRootPolytope, setInsideRootPolytope] = useState(false);
  const [rootPolytopeMounted, setRootPolytopeMounted] = useState(false);
  const [rootPolytopeDepts, setRootPolytopeDepts] = useState<UExternalNode[]>([]);
  const [rootPolytopeDeptId, setRootPolytopeDeptId] = useState<string | null>(null);
  const [rootPolytopeInternalPath, setRootPolytopeInternalPath] = useState<string[]>([]);
  const [rootPolytopeBackStep, setRootPolytopeBackStep] = useState(0);
  const [rootPolytopeSwitchKey, setRootPolytopeSwitchKey] = useState(0);
  const [requestFocusRootId, setRequestFocusRootId] = useState<string | null>(null);
  const [zoomOutFromRootId, setZoomOutFromRootId] = useState<string | null>(null);
  const [isZoomingOut, setIsZoomingOut] = useState(false);

  const activeRootDept = useMemo(
    () => rootPolytopeDepts.find(d => d.id === rootPolytopeDeptId && d.domain !== 'inactive') ?? null,
    [rootPolytopeDepts, rootPolytopeDeptId],
  );

  const handleCompanyAwaitingRole = useCallback((ctx: {
    company: { id: string; name: string };
    industry: UniverseIndustry;
    subdomain: UniverseSubdomain;
  }) => {
    const planetRole: UserPlanetRole = 
      (authRole === 'vc' || localStorage.getItem('active_role') === 'vc') ? 'vc' : 
      (authRole === 'founder' || authRole === 'co_founder' || authRole === 'admin') ? 'founder' : 
      'career';
      
    const pCtx = getPlanetRootsForCompany(ctx.company.id, ctx.company.name, planetRole);
    setPlanetContext(pCtx);
    setPlanetIndustryColor(ctx.industry.color);
    setInsidePlanetRoots(true);
    // Signal to TopBar that a company planet has been entered this session
    sessionStorage.setItem('company_entered_in_3d', '1');
    window.dispatchEvent(new Event('company_entered_in_3d'));
  }, [authRole]);

  const handleExitRootPolytope = useCallback(() => {
    // Start zoom-out animation: hide inner view, show outer view zoomed in, then animate out
    const exitingRootId = rootPolytopeDeptId;
    setInsideRootPolytope(false);
    setRootPolytopeInternalPath([]);
    setRootPolytopeBackStep(0);
    if (exitingRootId) {
      setZoomOutFromRootId(exitingRootId);
      setIsZoomingOut(true);
    }
    setRootPolytopeDeptId(null);
  }, [rootPolytopeDeptId]);

  const handleZoomOutComplete = useCallback(() => {
    setZoomOutFromRootId(null);
    setIsZoomingOut(false);
  }, []);

  const handleRoleChange = useCallback((role: UserPlanetRole) => {
    if (!planetContext) return;
    const pCtx = getPlanetRootsForCompany(planetContext.companyId, planetContext.companyName, role);
    setPlanetContext(pCtx);
    handleExitRootPolytope();
  }, [planetContext, handleExitRootPolytope]);

  const beginRootFocus = useCallback((rootId: string) => {
    if (!planetContext) return;
    setRequestFocusRootId(rootId);
  }, [planetContext]);

  const handleOpenRootPolytope = useCallback((rootId: string) => {
    if (!planetContext) return;
    setRootPolytopeMounted(true);
    setRootPolytopeDepts(rootsToPolytopeDepartments(planetContext.roots));
    setRootPolytopeDeptId(rootId);
    setRootPolytopeInternalPath([]);
    setRootPolytopeSwitchKey(k => k + 1);
    setInsideRootPolytope(true);
    setRequestFocusRootId(null);
  }, [planetContext]);

  const handleRootFocusTransitionComplete = useCallback((rootId: string) => {
    setRequestFocusRootId(null);
    handleOpenRootPolytope(rootId);
  }, [handleOpenRootPolytope]);



  const handleExitPlanetRoots = useCallback(() => {
    handleExitRootPolytope();
    setInsidePlanetRoots(false);
    setPlanetContext(null);
    setPlanetSearchQuery('');
    controllerRef.current?.goBack();
  }, [handleExitRootPolytope]);

  const handlePlanetRootSelect = useCallback((rootId: string) => {
    beginRootFocus(rootId);
  }, [beginRootFocus]);

  const handlePlanetBranchSelect = useCallback((rootId: string, branchId: string) => {
    beginRootFocus(rootId);
    window.setTimeout(() => setRootPolytopeInternalPath([branchId]), ROOT_FOCUS_TOTAL_MS + 450);
  }, [beginRootFocus]);

  // ── Action Node Workspace ──────────────────────────────────────────────────
  const [actionWorkspace, setActionWorkspace] = useState<{
      rootId: string;
    branchId: string;
    actionId: string;
  } | null>(null);

  const [delayedActionWorkspace, setDelayedActionWorkspace] = useState(actionWorkspace);

  useEffect(() => {
    if (actionWorkspace) {
      setDelayedActionWorkspace(actionWorkspace);
    } else {
      const t = setTimeout(() => setDelayedActionWorkspace(null), 500);
      return () => clearTimeout(t);
    }
  }, [actionWorkspace]);

  useEffect(() => {
    if (pathname === '/3d' && state?.actionWorkspaceContext) {
      const item = state.actionWorkspaceContext;
      const ctx = getPlanetRootsForCompany(item.companyId, item.companyName, item.role);
      
      setPlanetContext(ctx);
      setInsidePlanetRoots(true);
      
      setRootPolytopeMounted(true);
      setRootPolytopeDepts(rootsToPolytopeDepartments(ctx.roots));
      setRootPolytopeDeptId(item.rootId);
      setRootPolytopeInternalPath([item.branchId, item.actionId]);
      setInsideRootPolytope(true);
      
      setActionWorkspace({
        rootId: item.rootId,
        branchId: item.branchId,
        actionId: item.actionId,
      });

      // Clear state so it doesn't reopen if navigating back
      navigate('/3d', { replace: true, state: {} });
    } else if (pathname === '/3d') {
      const pState = loadPlanetState();
      if (pState) {
        const ctx = getPlanetRootsForCompany(pState.companyId, pState.companyName, pState.role as UserPlanetRole);
        setPlanetContext(ctx);
        setInsidePlanetRoots(true);
        if (pState.insideRootPolytope && pState.rootPolytopeDeptId) {
          setRootPolytopeMounted(true);
          setRootPolytopeDepts(rootsToPolytopeDepartments(ctx.roots));
          setRootPolytopeDeptId(pState.rootPolytopeDeptId);
          setRootPolytopeInternalPath(pState.rootPolytopeInternalPath || []);
          setInsideRootPolytope(true);
        }
      }
    }
  }, [pathname, state, navigate]);

  // Persist planet state on change
  useEffect(() => {
    if (insidePlanetRoots && planetContext) {
      savePlanetState({
        companyId: planetContext.companyId,
        companyName: planetContext.companyName,
        role: planetContext.role,
        insideRootPolytope,
        rootPolytopeDeptId,
        rootPolytopeInternalPath,
      });
    } else if (!insidePlanetRoots) {
      clearPlanetState();
    }
  }, [
    insidePlanetRoots,
    planetContext,
    insideRootPolytope,
    rootPolytopeDeptId,
    rootPolytopeInternalPath,
  ]);

  // Listen for workflows_updated to refresh planet roots if tag changes
  useEffect(() => {
    const handleWorkflowsUpdated = () => {
      if (insidePlanetRoots && planetContext) {
        const freshCtx = getPlanetRootsForCompany(
          planetContext.companyId,
          planetContext.companyName,
          planetContext.role,
        );
        setPlanetContext(freshCtx);
      }
    };
    window.addEventListener('workflows_updated', handleWorkflowsUpdated);
    return () => window.removeEventListener('workflows_updated', handleWorkflowsUpdated);
  }, [insidePlanetRoots, planetContext]);

  const handleActionNodeClick = useCallback((rootId: string, branchId: string, actionId: string) => {
    if (!planetContext) return;
    setActionWorkspace({ rootId, branchId, actionId });
  }, [planetContext]);

  const handleCloseActionWorkspace = useCallback(() => {
    setActionWorkspace(null);
    setRootPolytopeBackStep(c => c + 1);
  }, []);

  // Resolve nodes from context for the workspace using delayed state for exit animation
  const resolvedWorkspaceNodes = useMemo(() => {
    if (!delayedActionWorkspace || !planetContext) return null;
    const root = planetContext.roots.find(r => r.id === delayedActionWorkspace.rootId);
    if (!root) return null;
    const branch = root.branches.find(b => b.id === delayedActionWorkspace.branchId);
    if (!branch) return null;
    const action = branch.actions.find(a => a.id === delayedActionWorkspace.actionId);
    if (!action) return null;
    return { root, branch, action };
  }, [delayedActionWorkspace, planetContext]);

  // Hide TopBar when workspace opens
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('workspace_toggled', { detail: !!actionWorkspace }));
    return () => {
      window.dispatchEvent(new CustomEvent('workspace_toggled', { detail: false }));
    };
  }, [actionWorkspace]);

  const handleExitCompanyInterior = useCallback(() => {
    controllerRef.current?.exitCompanyPolytope();
  }, []);

  // ── Create Company modal state ──
  const [createModal, setCreateModal] = useState<{
    industry: UniverseIndustry;
    subdomain: UniverseSubdomain;
    draftPlanetId: string | null;
  } | null>(null);

  /** Triggered from either the side panel "Add Company" button or the 3D sun "Create Company" button */
  const handleAddCompany = useCallback((industry: UniverseIndustry | any, subdomain: UniverseSubdomain | any) => {
    // Spawn a draft planet immediately
    const draftId = controllerRef.current?.spawnDraftCompany(industry.id, subdomain.id) ?? null;
    setCreateModal({ industry, subdomain, draftPlanetId: draftId });

    // After a short delay (planet spawn animation), fly to it and freeze orbits
    if (draftId) {
      setTimeout(() => {
        controllerRef.current?.focusDraftPlanet(draftId);
      }, 600);
    }
  }, []);

  // Called by the modal after a successful save.
  const handleCompanyCreated = useCallback((company: LocalCompany) => {
    appendLocalCompany(company as any);
    setCreateModal(null);
  }, [appendLocalCompany]);

  const handleCloseCreate = useCallback((isCancel: boolean = true) => {
    // If the user cancelled, we must cleanly remove the placeholder planet
    if (isCancel && createModal?.draftPlanetId) {
      controllerRef.current?.removeDraftCompany(createModal.draftPlanetId);
    }
    // Unfreeze orbits and fly camera back to subdomain overview
    controllerRef.current?.unfocusDraftPlanet();
    setCreateModal(null);
  }, [createModal]);

  const handleOpenWorkspace = useCallback(() => {
    if (twinWorkspacePhase !== 'closed' || insideBH || insideCompanyInterior) return;

    if (currentLevel === ZOOM_LEVELS.GALAXY) {
      openWorkspacePendingRef.current = true;
      controllerRef.current?.openTwinWorkspaceFromGalaxy();
      setTwinWorkspacePhase('zooming');
      scheduleTwinWorkspacePanels(TWIN_WORKSPACE_CAMERA_MS);
    } else if (currentLevel === ZOOM_LEVELS.INDUSTRY) {
      openWorkspacePendingRef.current = false;
      controllerRef.current?.openTwinWorkspaceFromIndustry();
      setTwinWorkspacePhase('zooming');
      scheduleTwinWorkspacePanels(TWIN_WORKSPACE_CAMERA_MS);
    } else if (
      currentLevel === ZOOM_LEVELS.SUBDOMAIN ||
      currentLevel === ZOOM_LEVELS.COMPANY
    ) {
      openWorkspacePendingRef.current = false;
      controllerRef.current?.openTwinWorkspaceFromSubdomain();
      setTwinWorkspacePhase('zooming');
      scheduleTwinWorkspacePanels(TWIN_WORKSPACE_CAMERA_MS);
    }
  }, [
    twinWorkspacePhase,
    insideBH,
    insideCompanyInterior,
    currentLevel,
    scheduleTwinWorkspacePanels,
  ]);

  const handleCloseWorkspace = useCallback(() => {
    if (!isTwinWorkspaceActive(twinWorkspacePhase) || twinWorkspacePhase === 'closing') return;

    clearTwinWorkspaceTimers();
    openWorkspacePendingRef.current = false;

    if (twinWorkspacePhase === 'zooming') {
      setTwinWorkspacePhase('closed');
      return;
    }

    setTwinWorkspacePhase('closing');
    twinWorkspaceTimerRef.current = window.setTimeout(() => {
      setTwinWorkspacePhase('closed');
      twinWorkspaceTimerRef.current = null;
    }, TWIN_WORKSPACE_CLOSE_MS);
  }, [twinWorkspacePhase, clearTwinWorkspaceTimers]);

  useEffect(() => {
    if (pathname === '/3d') {
      const rafId = requestAnimationFrame(() => controllerRef.current?.resize());
      return () => cancelAnimationFrame(rafId);
    }
    // We no longer clear state when leaving /3d, so that the 3D Twin state persists
    // when the user navigates away and comes back.
  }, [pathname]);

  // Listen for 'Close Workspace' signal from the new tab to zoom back out
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'ACTION_WORKSPACE_CLOSED') {
        setRootPolytopeBackStep(c => c + 1);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleNavigate = useCallback((path: NavPathEntry[], level: ZoomLevel) => {
    setNavPath([...path]);
    setCurrentLevel(level);
    setCreateModal(null);

    if (openWorkspacePendingRef.current && level === ZOOM_LEVELS.GALAXY) {
      openWorkspacePendingRef.current = false;
      controllerRef.current?.applyTwinWorkspaceFocus();
      scheduleTwinWorkspacePanels(TWIN_WORKSPACE_CAMERA_MS);
    }
  }, [scheduleTwinWorkspacePanels]);

  useEffect(() => {
    if (twinWorkspacePhase === 'open') {
      const rafId = requestAnimationFrame(() => controllerRef.current?.resize());
      return () => cancelAnimationFrame(rafId);
    }
  }, [twinWorkspacePhase]);

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagDropdownHoveredRef = useRef(false);

  const handleHover = useCallback((target: HoverTarget | null) => {
    if (target) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setHoverTarget(target);
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        if (!tagDropdownHoveredRef.current) {
          setHoverTarget(null);
        }
        hoverTimeoutRef.current = null;
      }, 400);
    }
  }, []);

  const handleDropdownMouseEnter = useCallback(() => {
    tagDropdownHoveredRef.current = true;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handleDropdownMouseLeave = useCallback(() => {
    tagDropdownHoveredRef.current = false;
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverTarget(null);
      hoverTimeoutRef.current = null;
    }, 400);
  }, []);

  useEffect(() => {
    if (hoverTarget?.type === 'company') {
      controllerRef.current?.freezeSolarSystem();
    } else {
      controllerRef.current?.unfreezeSolarSystem();
    }
  }, [hoverTarget]);

  /** The 3D sun button fires this callback via UniverseController */
  const handleCreateFromSun = useCallback((industry: any, subdomain: any) => {
    handleAddCompany(industry, subdomain);
  }, [handleAddCompany]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pathname !== '/3d') return;
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === ' ')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (actionWorkspace) {
          setActionWorkspace(null);
          return;
        }
        if (isTwinWorkspaceActive(twinWorkspacePhase)) {
          e.preventDefault();
          handleCloseWorkspace();
          return;
        }
        if (insideRootPolytope) {
          if (rootPolytopeInternalPath.length > 0) {
            setRootPolytopeBackStep(c => c + 1);
          } else if (rootPolytopeDeptId) {
            handleExitRootPolytope();
          } else {
            handleExitRootPolytope();
          }
          return;
        }
        if (insidePlanetRoots && planetContext) {
          handleExitPlanetRoots();
          return;
        }
        if (createModal) {
          setCreateModal(null);
          return;
        }
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    createModal,
    insideRootPolytope,
    insidePlanetRoots,
    planetContext,
    rootPolytopeInternalPath,
    rootPolytopeDeptId,
    handleExitRootPolytope,
    handleExitPlanetRoots,
    actionWorkspace,
    twinWorkspacePhase,
    handleCloseWorkspace,
  ]);

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">Failed to load universe data</p>
          <p className="text-gray-500 text-xs">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)', color: '#161618' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Canvas */}
      {loading || !data ? (
        <div className="absolute inset-0 pt-14 flex flex-col items-center justify-center z-50">
          <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: '#C1AEFF' }} />
          <p className="text-sm font-medium" style={{ color: '#C1AEFF' }}>Loading Universe...</p>
          <p className="text-xs text-gray-500 mt-1">
            Assembling {data?.industries?.length ?? '...'} industry galaxies
          </p>
        </div>
      ) : (
        <div className="twin-universe-viewport">
          <UniverseCanvas
            data={data}
            onNavigate={handleNavigate}
            onHover={handleHover}
            onCreateCompany={handleCreateFromSun}
            onEnterBH={handleEnterBH}
            onExitBH={handleExitBH}
            onEnterCompanyInterior={handleEnterCompanyInterior}
            onInteriorLevelChange={handleInteriorLevelChange}
            onExitCompanyPolytope={handleExitCompanyPolytope}
            onCompanyAwaitingRole={handleCompanyAwaitingRole}
            controllerRef={controllerRef}
          />
        </div>
      )}

      {isTwinWorkspaceActive(twinWorkspacePhase) && (
        <div className="twin-universe-interaction-blocker" aria-hidden />
      )}

      <TwinWorkspaceLayout phase={twinWorkspacePhase} onClose={handleCloseWorkspace} />

      {/* ── Black Hole Interior: UniversalPolytope overlay ──
           visibility:hidden cascades to ALL children (including R3F canvas) so
           THREE.js canvas underneath receives events when overlay is not active.
           pointer-events:none alone does NOT cascade — children keep auto.
           Pattern: fade opacity first (1.4s), THEN flip visibility to hidden
           so the canvas is event-dead only after the visual fade completes. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          opacity: insideBH ? 1 : 0,
          visibility: insideBH ? 'visible' : 'hidden',
          pointerEvents: insideBH && !bhTransitioning ? 'auto' : 'none',
          transition: insideBH
            ? 'opacity 1.4s ease-in-out'                          // entering: fade in, visible immediately
            : 'opacity 1.4s ease-in-out, visibility 0s 1.4s',    // exiting: fade then hide
        }}
      >
        {bhMounted && (
          <UniversalPolytope
            companyName={bhCompanyName}
            storeScope="twin"
            onExitIntent={handleBHExitIntent}
            transparent={true}
            cameraResetTrigger={bhEntryCount + polytopeDraftResetTrigger}
            requestSelectDeptId={polytopeRequestSelectDeptId}
            onDepartmentChange={handlePolytopeDeptChange}
            onInternalPathChange={setPolytopeInternalPath}
            requestBackStep={polytopeInternalBackStep}
            draftDept={polytopeDraftDept}
            draftNodeScreenPosRef={polytopeDraftDeptScreenPosRef}
            draftInternalNode={polytopeDraftInternalNode}
            draftInternalNodeScreenPosRef={polytopeDraftInternalNodeScreenPosRef}
            draftMember={polytopeDraftMember}
            draftMemberScreenPosRef={polytopeDraftMemberScreenPosRef}
            departments={polytopeStore.departments}
            selectedInternalPath={polytopeInternalPath}
          />
        )}
      </div>



      {/* ── Company Planet 3D root map (after role pick) ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 6,
          // Solid galaxy background on this container so it persists even when
          // CompanyPlanet3DView unmounts, preventing universe planets from bleeding through.
          background: 'radial-gradient(ellipse at 50% 40%, rgba(18,10,36,1) 0%, rgba(2,2,6,1) 65%)',
          opacity: (insidePlanetRoots && planetContext) || isZoomingOut ? 1 : 0,
          visibility: (insidePlanetRoots && planetContext) || isZoomingOut ? 'visible' : 'hidden',
          pointerEvents: (insidePlanetRoots && planetContext && !insideRootPolytope && !isZoomingOut) ? 'auto' : 'none',
          transition: (insidePlanetRoots && planetContext) || isZoomingOut
            ? 'opacity 0.4s ease-in-out'
            : 'opacity 0.4s ease-in-out, visibility 0s 0.4s',
        }}
      >
        {planetContext && (!insideRootPolytope || isZoomingOut) && (
          <CompanyPlanet3DView
            context={planetContext}
            depth={0}
            path={[]}
            requestFocusRootId={requestFocusRootId}
            onFocusTransitionComplete={handleRootFocusTransitionComplete}
            onDrillInto={() => {}}
            onDrillBack={() => {}}
            onActionNodeClick={handleActionNodeClick}
            industryColor={planetIndustryColor}
            zoomOutFromRootId={zoomOutFromRootId}
            onZoomOutComplete={handleZoomOutComplete}
          />
        )}
      </div>

      {/* ── Root drill-in: BDT internal node layout only (no polytope hull) ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 7,
          opacity: insideRootPolytope ? 1 : 0,
          visibility: insideRootPolytope ? 'visible' : 'hidden',
          pointerEvents: insideRootPolytope ? 'auto' : 'none',
          transition: insideRootPolytope
            ? 'opacity 0.6s 0.2s ease-out, right 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            : 'opacity 0.3s ease-in, visibility 0s 0.3s, right 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          right: actionWorkspace ? '75vw' : '0',
          background: 'radial-gradient(ellipse at 50% 40%, rgba(18,10,36,1) 0%, rgba(2,2,6,1) 65%)',
        }}
      >
        {insideRootPolytope && rootPolytopeMounted && activeRootDept && (
          <PlanetRootNodeView
            key={`${activeRootDept.id}-${rootPolytopeSwitchKey}`}
            root={activeRootDept}
            selectedInternalPath={rootPolytopeInternalPath}
            onInternalPathChange={(path) => {
              setRootPolytopeInternalPath(path);
              if (path.length === 2) {
                handleActionNodeClick(activeRootDept.id, path[0], path[1]);
              } else {
                setActionWorkspace(null);
              }
            }}
            requestBackStep={rootPolytopeBackStep}
            rootSwitchKey={rootPolytopeSwitchKey}
            onBack={handleExitRootPolytope}
          />
        )}
      </div>

      {/* ── Create Company Floating Panel ── */}
      {createModal && (
        <CreateCompanyModal
          industryId={createModal.industry.id}
          subdomainId={createModal.subdomain.id}
          subdomainName={createModal.subdomain.name}
          industryName={createModal.industry.name}
          industryColor={createModal.industry.color}
          draftPlanetId={createModal.draftPlanetId}
          controllerRef={controllerRef}
          onClose={handleCloseCreate}
          onCreated={handleCompanyCreated}
        />
      )}

      {/* Bottom-left column: hidden when create modal is active OR drafting dept/node OR action workspace open */}
      {!createModal && !polytopeDraftDept && !polytopeDraftInternalNode && !actionWorkspace && (
        <>
          {insideRootPolytope && activeRootDept ? (
            <div className="absolute bottom-6 left-4 z-20 flex flex-col items-start gap-3">
              <PolytopeSidePanel
                departments={[activeRootDept]}
                selectedDeptId={activeRootDept.id}
                onDeptSelect={() => handleExitRootPolytope()}
                selectedInternalPath={rootPolytopeInternalPath}
                onInternalBack={() => setRootPolytopeBackStep(c => c + 1)}
                onExitToSubdomain={handleExitRootPolytope}
                exitToSubdomainLabel="2D root map"
                onNodeSelect={(path) => {
                  setRootPolytopeInternalPath(path);
                  if (path.length === 2) {
                    handleActionNodeClick(activeRootDept.id, path[0], path[1]);
                  }
                }}
              />
            </div>
          ) : insidePlanetRoots && planetContext ? (
            <div className="absolute bottom-6 left-4 z-20 flex flex-col items-start gap-3">
              <CompanyPlanetSidePanel
                context={planetContext}
                depth={0}
                path={[]}
                onRootSelect={handlePlanetRootSelect}
                onBranchSelect={handlePlanetBranchSelect}
                onActionSelect={handleActionNodeClick}
                onDrillBack={() => {}}
                onExitToSubdomain={handleExitPlanetRoots}
                exitToSubdomainLabel={navPath.find(p => p.level === 'subdomain')?.name ?? 'Subdomain'}
                searchQuery={planetSearchQuery}
                setSearchQuery={setPlanetSearchQuery}
                industryColor={planetIndustryColor}
                onRoleChange={handleRoleChange}
              />
            </div>
          ) : (insideBH || insideCompanyInterior) ? (
            <div className="absolute bottom-6 left-4 z-20 flex flex-col items-start gap-3">
              <PolytopeSidePanel
              departments={polytopeStore.departments}
              selectedDeptId={insideBH ? polytopeDeptId : (companyInteriorPath[0] ?? null)}
              onDeptSelect={insideBH ? handlePolytopeSidebarDeptSelect : (id) => {
                if (id === null) {
                  controllerRef.current?.drillInteriorBack?.();
                }
              }}
              selectedInternalPath={insideBH ? polytopeInternalPath : companyInteriorPath.slice(1)}
              onAddDepartment={handlePolytopeAddDepartment}
              onAddNode={handlePolytopeAddNode}
              onInternalBack={insideBH
                ? () => setPolytopeInternalBackStep(c => c + 1)
                : () => controllerRef.current?.drillInteriorBack?.()
              }
              onExitToSubdomain={insideCompanyInterior ? handleExitCompanyInterior : handleBHExitIntent}
              exitToSubdomainLabel={
                insideCompanyInterior
                  ? (navPath.find(p => p.level === 'subdomain')?.name ?? 'Subdomain')
                  : 'Galaxy'
              }
              onUpdateDepartment={polytopeStore.updateDepartment}
              onDeleteDepartment={polytopeStore.deleteDepartment}
              onUpdateNode={polytopeStore.updateNode}
              onDeleteNode={polytopeStore.deleteNode}
              onNodeSelect={insideBH ? setPolytopeInternalPath : () => {}}
              onEditDepartment={handleEditDepartment}
              onEditNode={handleEditNode}
              onDeleteDepartmentClick={handleDeleteDepartmentClick}
              onDeleteNodeClick={handleDeleteNodeClick}
              onAddMember={handlePolytopeAddMember}
              onEditMember={handleEditMember}
              onDeleteMemberClick={handleDeleteMemberClick}
            />
            </div>
          ) : twinWorkspacePhase === 'closed' || twinWorkspacePhase === 'zooming' ? (
            <div
              className={`universe-galaxy-sidebar-host universe-galaxy-sidebar-host--float ${
                twinWorkspacePhase === 'zooming' ? 'universe-galaxy-sidebar-host--exit' : ''
              }`}
            >
              <UniverseGalaxySidebar
                data={data}
                navPath={navPath}
                currentLevel={currentLevel}
                controllerRef={controllerRef}
                onAddCompany={handleAddCompany}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchInputRef={searchInputRef}
                canReadEcosystem={canRead('ecosystem')}
                onNavigateEcosystem={path => navigate(path)}
              />
            </div>
          ) : null}
        </>
      )}

      {/* PolytopeManager modal for BH polytope — only for edit/delete flows */}
      <PolytopeManager
        departments={polytopeStore.departments}
        onAddDepartment={polytopeStore.addDepartment}
        onUpdateDepartment={polytopeStore.updateDepartment}
        onDeleteDepartment={(id) => {
          if (insideBH && polytopeDeptId === id) {
            setPolytopeDeptId(null);
            setPolytopeRequestSelectDeptId(null);
          }
          polytopeStore.deleteDepartment(id);
          controllerRef.current?.syncCompanyDepartments(polytopeStore.departments);
        }}
        onAddNode={polytopeStore.addNode}
        onUpdateNode={polytopeStore.updateNode}
        onDeleteNode={polytopeStore.deleteNode}
        onReset={polytopeStore.resetToDefaults}
        forceOpen={polytopeManagerOpen}
        forcedView={polytopeManagerView}
        onForcedClose={() => setPolytopeManagerOpen(false)}
      />

      {/* Draft Dept Creation Panel — BH/Company polytope */}
      {insideBH && polytopeDraftDept && (
        <CreateDepartmentPanel
          mode="department"
          draftNodeScreenPosRef={polytopeDraftDeptScreenPosRef}
          onDraftUpdate={(patch) => setPolytopeDraftDept(prev => prev ? { ...prev, ...patch } : prev)}
          onClose={(isCancel) => {
            if (isCancel) {
              setPolytopeDraftDept(null);
              setPolytopeRequestSelectDeptId(null);
              setPolytopeDraftResetTrigger(c => c + 1);
            }
          }}
          onCreated={(data) => {
            const saved = polytopeStore.addDepartment(data as Omit<UExternalNode, 'id' | 'internalNodes' | 'isDraft'>);
            setPolytopeDraftDept(null);
            setPolytopeDraftResetTrigger(c => c + 1);
            setPolytopeDeptId(saved.id);
            setPolytopeRequestSelectDeptId(saved.id);
          }}
        />
      )}

      {/* Draft Internal Node Creation Panel — BH/Company polytope */}
      {insideBH && polytopeDraftInternalNode && (() => {
        const dept = polytopeStore.departments.find(d => d.id === polytopeDraftInternalNode.deptId);
        if (!dept) return null;
        return (
          <CreateDepartmentPanel
            mode="node"
            dept={dept}
            draftNodeScreenPosRef={polytopeDraftInternalNodeScreenPosRef}
            onDraftUpdate={(patch) => setPolytopeDraftInternalNode(prev => prev ? { ...prev, node: { ...prev.node, ...patch } } : prev)}
            onClose={(isCancel) => {
              if (isCancel) {
                setPolytopeDraftInternalNode(null);
              }
            }}
            onCreated={(data) => {
              const deptId = polytopeDraftInternalNode.deptId;
              const path = polytopeInternalPath;
              polytopeStore.addNode(deptId, data as Omit<UInternalNode, 'id' | 'children'>, path);
              setPolytopeDraftInternalNode(null);
              setPolytopeDeptId(deptId);
            }}
          />
        );
      })()}

      {/* Draft Member Creation Panel — BH/Company polytope */}
      {insideBH && polytopeDraftMember && (() => {
        const dept = polytopeStore.departments.find(d => d.id === polytopeDraftMember.deptId);
        if (!dept) return null;
        return (
          <CreateDepartmentPanel
            mode="member"
            dept={dept}
            draftNodeScreenPosRef={polytopeDraftMemberScreenPosRef}
            onDraftUpdate={(patch) => setPolytopeDraftMember(prev => prev ? { ...prev, member: { ...prev.member, ...patch } } : prev)}
            onClose={(isCancel) => {
              if (isCancel) {
                setPolytopeDraftMember(null);
              }
            }}
            onCreated={(data) => {
              const { deptId, nodeId } = polytopeDraftMember;
              const deptToUpdate = polytopeStore.departments.find(d => d.id === deptId);
              if (!deptToUpdate) return;
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
              const targetNode = findNode(deptToUpdate.internalNodes, nodeId);
              if (targetNode && targetNode.type === 'team') {
                const newMembers = [...(targetNode.members || []), data];
                polytopeStore.updateNode(deptId, nodeId, { members: newMembers, memberCount: newMembers.length });
              }
              setPolytopeDraftMember(null);
              setPolytopeDeptId(deptId);
            }}
          />
        );
      })()}

      {/* Hover detail panel — right side */}
      {hoverTarget && hoverTarget.type && hoverTarget.type !== 'company' && (
        <div
          className="absolute top-[4.5rem] right-6 w-60 p-4 z-20 rounded-xl border border-slate-700/40 backdrop-blur-xl"
          style={{ background: 'rgba(0, 0, 0, 0.75)' }}
        >
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 mb-2 inline-block">
            {hoverTarget.type}
          </span>
          <h3 className="text-sm font-semibold text-white mt-1">
            {hoverTarget.nodeLabel
              || hoverTarget.industry?.name
              || hoverTarget.subdomain?.name
              || hoverTarget.company?.name
              || hoverTarget.department?.name
              || ''}
          </h3>
          {(hoverTarget.industry?.description || hoverTarget.subdomain?.description || hoverTarget.company?.description) && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-3">
              {hoverTarget.industry?.description || hoverTarget.subdomain?.description || hoverTarget.company?.description}
            </p>
          )}
          {hoverTarget.company?.employees && (
            <div className="mt-2 flex gap-2">
              <div className="bg-white/5 rounded-lg py-1 px-2">
                <span className="text-[9px] text-gray-500">Employees</span>
                <p className="text-xs font-medium text-white">{hoverTarget.company.employees}</p>
              </div>
              {hoverTarget.company?.funding && (
                <div className="bg-white/5 rounded-lg py-1 px-2">
                  <span className="text-[9px] text-gray-500">Stage</span>
                  <p className="text-xs font-medium text-white">{hoverTarget.company.funding}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Tag Dropdown for Companies in 3D Canvas */}
      {hoverTarget && hoverTarget.type === 'company' && hoverTarget.screenX != null && hoverTarget.screenY != null && (
        <div
          className="absolute z-30 w-48"
          style={{
            left: hoverTarget.screenX,
            top: hoverTarget.screenY + 30, // Positioned slightly below the planet
            transform: 'translateX(-50%)',
            pointerEvents: 'auto'
          }}
          onMouseEnter={handleDropdownMouseEnter}
          onMouseLeave={handleDropdownMouseLeave}
        >
          <div className="bg-black/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl">
            <h3 className="text-xs font-bold text-white mb-1.5 px-1 truncate text-center">
              {hoverTarget.company?.name}
            </h3>
            <CompanyTagDropdown 
              companyId={hoverTarget.company?.id}
              companyName={hoverTarget.company?.name}
              industryColor={hoverTarget.industry?.color}
            />
          </div>
        </div>
      )}



      {/* Open workspace — bottom center */}
      {!loading && data && !createModal && !polytopeDraftDept && !polytopeDraftInternalNode && !insideBH && !insideCompanyInterior && !insidePlanetRoots && !insideRootPolytope && twinWorkspacePhase === 'closed' && (
        <OpenWorkspaceCue onClick={handleOpenWorkspace} />
      )}

      {/* Keyboard hint */}
      <div
        className="absolute bottom-4 right-6 text-[10px] z-10 px-3 py-1 rounded-lg backdrop-blur-md"
        style={{ background: 'rgba(0,0,0,0.45)', color: '#4b5563' }}
      >
        {isTwinWorkspaceActive(twinWorkspacePhase)
          ? 'ESC to close workspace'
          : 'ESC to go back · Scroll to zoom · Click to explore'}
      </div>

      {/* ── Action Node Workspace Overlay ── */}
      {delayedActionWorkspace && resolvedWorkspaceNodes && planetContext && (
        <ActionNodeWorkspace
          key={`${delayedActionWorkspace.rootId}-${delayedActionWorkspace.branchId}-${delayedActionWorkspace.actionId}`}
          actionNode={resolvedWorkspaceNodes.action}
          branchNode={resolvedWorkspaceNodes.branch}
          rootNode={resolvedWorkspaceNodes.root}
          context={planetContext}
          isOpen={!!actionWorkspace}
          onClose={handleCloseActionWorkspace}
        />
      )}

      {/* ── Drag to Workspace Overlay ── */}
      <DragWorkspaceOverlay
        planetContext={planetContext}
        activeRootDept={activeRootDept}
        internalPath={rootPolytopeInternalPath}
      />
    </div>
  );
}
