import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Plus, Search, Command } from 'lucide-react';
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
import { UniverseNavBackButton, getUniverseBackLabel } from '../components/UniverseNavBackButton';
import { PolytopeManager } from '../components/PolytopeManager';
import CreateDepartmentPanel from '../components/CreateDepartmentPanel';
import CompanyRoleModal from '../components/CompanyRoleModal';
import CompanyPlanet2DView, { ROOT_FOCUS_TOTAL_MS } from '../components/CompanyPlanet2DView';
import { CompanyPlanetSidePanel } from '../components/CompanyPlanetSidePanel';
import {
  getPlanetRootsForCompany,
  rootsToPolytopeDepartments,
  type UserPlanetRole,
  type CompanyPlanetContext,
} from '../data/companyPlanetRoots';
import { usePolytopeStore } from '../lib/usePolytopeStore';
import { SearchTrie} from '../lib/SearchTrie';
import type { UExternalNode, UInternalNode } from '../lib/usePolytopeStore';
import { ActionNodeWorkspace } from '../components/workspace/ActionNodeWorkspace';
import { CompanyTagDropdown } from '../components/planet/CompanyTagDropdown';
import { DragWorkspaceOverlay } from '../components/workspace/DragWorkspaceOverlay';
// ── Side Panel ───────────────────────────────────────────────────────────────

interface SidePanelProps {
  data: ReturnType<typeof useUniverseGraph>['data'];
  navPath: NavPathEntry[];
  currentLevel: ZoomLevel;
  controllerRef: React.MutableRefObject<UniverseController | null>;
  onAddCompany: (industry: UniverseIndustry, subdomain: UniverseSubdomain) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

function SidePanel({ data, navPath, currentLevel, controllerRef, onAddCompany, searchQuery, setSearchQuery }: SidePanelProps) {
  // navPath entries carry stale snapshots — always look up from live `data` by ID
  const industryId  = navPath[0]?.data?.id ?? null;
  const subdomainId = navPath[1]?.data?.id ?? null;

  const industry  = (data?.industries.find(i => i.id === industryId)) ?? (navPath[0]?.data as UniverseIndustry | null) ?? null;
  const subdomain = (industry?.subdomains.find(s => s.id === subdomainId)) ?? (navPath[1]?.data as UniverseSubdomain | null) ?? null;

  const isGalaxy = currentLevel === ZOOM_LEVELS.GALAXY;
  const isIndustry = currentLevel === ZOOM_LEVELS.INDUSTRY;
  const isSubdomainOrDeeper = !isGalaxy && !isIndustry;

  // Key changes on every level transition → React remounts list → CSS animation fires
  const listKey = `${currentLevel}-${navPath.map(e => e.id).join('-')}`;

  let sectionLabel = 'GALAXIES';
  let items: { id: string; name: string; color?: string; meta?: string; type?: string; onClick?: () => void }[] = [];
  let onItemClick = (_id: string) => { };

  const isSearchActive = searchQuery.trim().length > 0;

  const searchTrie = useMemo(() => {
    const trie = new SearchTrie();
    if (data?.industries) {
      data.industries.forEach(ind => {
        trie.insert(ind.name, {
          id: ind.id, name: ind.name, color: ind.color, meta: 'Industry', type: 'industry',
          industryId: ind.id
        });
        ind.subdomains.forEach(sub => {
          trie.insert(sub.name, {
            id: sub.id, name: sub.name, color: sub.color ?? ind.color, meta: `Subdomain in ${ind.name}`, type: 'subdomain',
            industryId: ind.id, subdomainId: sub.id
          });
          sub.companies.forEach(co => {
            trie.insert(co.name, {
              id: co.id, name: co.name, color: ind.color, meta: `Company in ${sub.name}`, type: 'company',
              industryId: ind.id, subdomainId: sub.id, companyId: co.id
            });
          });
        });
      });
    }
    return trie;
  }, [data]);

  if (isSearchActive) {
    const results = searchTrie.search(searchQuery, 50);
    
    sectionLabel = 'SEARCH RESULTS';
    items = results.map(r => ({
      id: r.id,
      name: r.name,
      color: r.color,
      meta: r.meta,
      type: r.type,
      onClick: () => {
        if (r.type === 'industry') controllerRef.current?.routeTo('industry', r.industryId!);
        else if (r.type === 'subdomain') controllerRef.current?.routeTo('subdomain', r.industryId!, r.subdomainId!);
        else if (r.type === 'company') controllerRef.current?.routeTo('company', r.industryId!, r.subdomainId!, r.companyId!);
        setSearchQuery('');
      }
    }));
  } else if (isGalaxy) {
    sectionLabel = 'GALAXIES';
    items = (data?.industries ?? []).map((ind) => ({
      id: ind.id,
      name: ind.name,
      color: ind.color,
      meta: `${ind.subdomains.length} domains`,
    }));
    onItemClick = (id) => controllerRef.current?.zoomToIndustry(id);
  } else if (isIndustry && industry) {
    sectionLabel = 'SUBDOMAINS';
    items = industry.subdomains.map((sd) => ({
      id: sd.id,
      name: sd.name,
      color: sd.color ?? industry.color,
      meta: `${sd.companies.length} companies`,
    }));
    onItemClick = (id) => controllerRef.current?.zoomToSubdomain(industry.id, id);
  } else if (isSubdomainOrDeeper && industry && subdomain) {
    sectionLabel = 'COMPANIES';
    items = subdomain.companies.map((co) => ({
      id: co.id,
      name: co.name,
      color: industry.color,
      meta: co.employees ? `${co.employees.toLocaleString()} emp` : co.stage ?? '',
      type: 'company'
    }));
    onItemClick = (id) => controllerRef.current?.zoomToCompany(industry.id, subdomain.id, id);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        width: '196px',
        maxHeight: '420px',
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Section label + context — animates on level change */}
      <div key={listKey + '-header'} className="px-4 pt-4 pb-3 shrink-0 panel-slide-in relative overflow-hidden border-b border-white/[0.04]">
        {/* Subtle accent glow behind the text */}
        <div 
          className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none"
          style={{ 
            background: `linear-gradient(135deg, ${industry?.color ?? '#C1AEFF'}40 0%, transparent 100%)` 
          }} 
        />
        
        <div className="relative flex flex-col gap-1 z-10">
          <span 
            className="text-[9px] font-bold uppercase tracking-[0.2em] inline-flex items-center" 
            style={{ 
              color: industry?.color ?? '#C1AEFF', 
              textShadow: `0 0 10px ${industry?.color ?? '#C1AEFF'}40`,
              opacity: 0.8 
            }}
          >
            {sectionLabel}
          </span>
          {!isGalaxy && industry && (
            <p className="text-[13px] font-medium text-white truncate drop-shadow-md flex items-center gap-2 mt-0.5">
              <span 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ 
                  background: industry?.color ?? '#C1AEFF', 
                  boxShadow: `0 0 8px ${industry?.color ?? '#C1AEFF'}` 
                }} 
              />
              {isSubdomainOrDeeper && subdomain ? subdomain.name : industry.name}
            </p>
          )}
        </div>
      </div>

      {/* Animated list — remounts on every level change */}
      <div
        key={listKey}
        className="overflow-y-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((item, i) => (
          <button
            key={item.meta + '-' + item.id}
            onClick={() => {
              if (item.onClick) item.onClick();
              else onItemClick(item.id);
            }}
            className="panel-item-in w-full flex flex-col items-start px-3 py-2 text-left transition-colors hover:bg-white/[0.06] group"
            style={{ animationDelay: `${i * 28}ms` }}
          >
            <div className="flex items-center gap-2.5 w-full">
              <span
                className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125"
                style={{
                  background: item.color ?? '#7c3aed',
                  boxShadow: `0 0 8px ${item.color ?? '#7c3aed'}70`,
                }}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-[12px] text-gray-300 group-hover:text-white transition-colors leading-tight truncate">
                  {item.name}
                </span>
                {item.meta && (
                  <span className="block text-[10px] leading-tight mt-0.5" style={{ color: '#4b5563' }}>
                    {item.meta}
                  </span>
                )}
              </span>
            </div>
            
            {item.type === 'company' && (
              <div 
                className="w-full mt-2 overflow-hidden max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 transition-all duration-300"
                onClick={e => e.stopPropagation()}
              >
                <CompanyTagDropdown 
                  companyId={item.id} 
                  companyName={item.name} 
                  industryColor={item.color} 
                />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* ── Add Company button — only at subdomain level ── */}
      {isSubdomainOrDeeper && industry && subdomain && !isSearchActive && (
        <div className="px-3 pb-3 pt-1 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={() => onAddCompany(industry, subdomain)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-all hover:opacity-90"
            style={{
              background: `${industry.color ?? '#7c3aed'}18`,
              border: `1px solid ${industry.color ?? '#7c3aed'}30`,
              color: industry.color ?? '#C1AEFF',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Company
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Universe3DPage() {
  const navigate = useNavigate();
  const { pathname, state } = useLocation();
  const { user, profile, canRead } = useAuth();
  const { company } = useCompany(profile?.company_id);
  // Bypass users (VC/Incubator) have no company — pass null so the universe loads without waiting
  const isBypassUser = !!user && localStorage.getItem('active_role') === 'vc';
  const companyId = isBypassUser ? null : (user ? (profile?.company_id ?? null) : undefined);
  const { data, loading, error, appendLocalCompany } = useUniverseGraph(companyId);

  // Company name for the polytope core sphere — same fallback chain as UniversalPage
  const bhCompanyName = company?.name || (profile?.company_id
    ? profile?.first_name ? `${profile.first_name}'s workspace` : 'My workspace'
    : 'My Organisation');

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

  // ── Polytope sidebar state (shown when insideBH) ──────────────────────────
  const polytopeStore = usePolytopeStore('twin');
  const [polytopeDeptId, setPolytopeDeptId] = useState<string | null>(null);
  const [polytopeInternalPath, setPolytopeInternalPath] = useState<string[]>([]);
  const [polytopeManagerOpen, setPolytopeManagerOpen] = useState(false);
  const [polytopeManagerView, setPolytopeManagerView] = useState<any>({ type: 'home' });

  const handleEditDepartment = useCallback((dept: UExternalNode) => {
    setPolytopeManagerView({ type: 'editDept', dept });
    setPolytopeManagerOpen(true);
  }, []);

  const handleEditNode = useCallback((dept: UExternalNode, node: UInternalNode) => {
    setPolytopeManagerView({ type: 'editNode', dept, node });
    setPolytopeManagerOpen(true);
  }, []);

  const handleDeleteDepartmentClick = useCallback((dept: UExternalNode) => {
    setPolytopeManagerView({ type: 'deleteDept', dept });
    setPolytopeManagerOpen(true);
  }, []);

  const handleDeleteNodeClick = useCallback((dept: UExternalNode, node: UInternalNode) => {
    setPolytopeManagerView({ type: 'deleteNode', dept, node });
    setPolytopeManagerOpen(true);
  }, []);

  // Separate state so clicking sidebar triggers camera fly-in without looping
  const [polytopeRequestSelectDeptId, setPolytopeRequestSelectDeptId] = useState<string | null | undefined>(undefined);
  // Counter incremented by sidebar back button to go back one internal level
  const [polytopeInternalBackStep, setPolytopeInternalBackStep] = useState(0);

  // ── Draft dept/node state for inline creation panels ─────────────────────
  const [polytopeDraftDept, setPolytopeDraftDept] = useState<UExternalNode | null>(null);
  const polytopeDraftDeptScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  const [polytopeDraftInternalNode, setPolytopeDraftInternalNode] = useState<{ deptId: string; node: UInternalNode } | null>(null);
  const polytopeDraftInternalNodeScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  // Incremented on draft create/cancel to fly camera back to overview
  const [polytopeDraftResetTrigger, setPolytopeDraftResetTrigger] = useState(0);

  const handlePolytopeAddDepartment = useCallback(() => {
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
  }, []);

  const handlePolytopeAddNode = useCallback((deptId: string) => {
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
  }, [polytopeStore.departments, polytopeDeptId]);

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
    setRoleModal(null);
    setRootPolytopeDeptId(null);
    setRootPolytopeInternalPath([]);
    setRootPolytopeBackStep(0);
  }, []);

  // ── Company planet root systems (Industry OS) ──
  const [roleModal, setRoleModal] = useState<{
    company: { id: string; name: string };
    industry: UniverseIndustry;
    subdomain: UniverseSubdomain;
  } | null>(null);
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

  const activeRootDept = useMemo(
    () => rootPolytopeDepts.find(d => d.id === rootPolytopeDeptId && d.domain !== 'inactive') ?? null,
    [rootPolytopeDepts, rootPolytopeDeptId],
  );

  const handleCompanyAwaitingRole = useCallback((ctx: {
    company: { id: string; name: string };
    industry: UniverseIndustry;
    subdomain: UniverseSubdomain;
  }) => {
    setRoleModal(ctx);
  }, []);

  const handleRoleSelect = useCallback((role: UserPlanetRole) => {
    if (!roleModal) return;
    const ctx = getPlanetRootsForCompany(roleModal.company.id, roleModal.company.name, role);
    setPlanetContext(ctx);
    setRoleModal(null);
    setPlanetIndustryColor(roleModal.industry.color);
    setInsidePlanetRoots(true);
    // Signal to TopBar that a company planet has been entered this session
    sessionStorage.setItem('company_entered_in_3d', '1');
    window.dispatchEvent(new Event('company_entered_in_3d'));
  }, [roleModal]);

  const handleRoleModalClose = useCallback(() => {
    setRoleModal(null);
    controllerRef.current?.goBack();
  }, []);

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

  const handleExitRootPolytope = useCallback(() => {
    setInsideRootPolytope(false);
    setRootPolytopeDeptId(null);
    setRootPolytopeInternalPath([]);
    setRootPolytopeBackStep(0);
  }, []);

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
    }
  }, [pathname, state, navigate]);

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

  useEffect(() => {
    if (pathname === '/3d') {
      const rafId = requestAnimationFrame(() => controllerRef.current?.resize());
      return () => cancelAnimationFrame(rafId);
    }

    // Left 3D twin — close overlays so BDT (/universal) is fully independent
    setInsideBH(false);
    setInsideCompanyInterior(false);
    setCompanyInteriorPath([]);
    setInsidePlanetRoots(false);
    setInsideRootPolytope(false);
    setPlanetContext(null);
    setPlanetSearchQuery('');
    setRoleModal(null);
    setRootPolytopeDeptId(null);
    setRootPolytopeInternalPath([]);
    setRootPolytopeBackStep(0);
    setPolytopeDraftDept(null);
    setPolytopeDraftInternalNode(null);
    setPolytopeDeptId(null);
    setPolytopeInternalPath([]);
    setPolytopeRequestSelectDeptId(null);
    setPolytopeInternalBackStep(0);
    controllerRef.current?.exitBlackHole();
    controllerRef.current?.exitCompanyPolytope();
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
    // Close create modal when navigating away
    setCreateModal(null);
  }, []);

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

  /** The 3D sun button fires this callback via UniverseController */
  const handleCreateFromSun = useCallback((industry: any, subdomain: any) => {
    handleAddCompany(industry, subdomain);
  }, [handleAddCompany]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        if (roleModal) {
          handleRoleModalClose();
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
  }, [createModal, roleModal, handleRoleModalClose, insideRootPolytope, insidePlanetRoots, planetContext, rootPolytopeInternalPath, rootPolytopeDeptId, handleExitRootPolytope, handleExitPlanetRoots, actionWorkspace]);

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
      )}

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
            departments={polytopeStore.departments}
            selectedInternalPath={polytopeInternalPath}
          />
        )}
      </div>

      {roleModal && (
        <CompanyRoleModal
          companyName={roleModal.company.name}
          industryColor={roleModal.industry.color}
          onSelect={handleRoleSelect}
          onClose={handleRoleModalClose}
        />
      )}

      {/* ── Company Planet 2D root map (after role pick) ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 6,
          opacity: insidePlanetRoots && planetContext && !insideRootPolytope ? 1 : 0,
          visibility: insidePlanetRoots && planetContext && !insideRootPolytope ? 'visible' : 'hidden',
          pointerEvents: insidePlanetRoots && planetContext && !insideRootPolytope ? 'auto' : 'none',
          transition: 'opacity 0.5s ease-in-out',
        }}
      >
        {planetContext && !insideRootPolytope && (
          <CompanyPlanet2DView
            context={planetContext}
            depth={0}
            path={[]}
            requestFocusRootId={requestFocusRootId}
            onFocusTransitionComplete={handleRootFocusTransitionComplete}
            onDrillInto={() => {}}
            onDrillBack={() => {}}
            onActionNodeClick={handleActionNodeClick}
            industryColor={planetIndustryColor}
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
            ? 'opacity 0.85s ease-out, right 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            : 'opacity 0.45s ease-in, visibility 0s 0.45s, right 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          right: actionWorkspace ? '75vw' : '0',
          background: insideRootPolytope
            ? 'radial-gradient(ellipse at 50% 40%, rgba(18,10,36,0.98) 0%, rgba(2,2,6,0.99) 65%)'
            : undefined,
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
        <div className="absolute bottom-6 left-4 z-20 flex flex-col items-start gap-3">
          {insideRootPolytope && activeRootDept ? (
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
          ) : insidePlanetRoots && planetContext ? (
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
            />
          ) : (insideBH || insideCompanyInterior) ? (
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
            />
          ) : (
            <>
              {/* Search Bar — galaxy mode */}
              <div
                className="relative rounded-2xl overflow-hidden shadow-xl"
                style={{
                  width: '196px',
                  background: 'rgba(0, 0, 0, 0.72)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="flex items-center px-3 py-2.5">
                  <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search universe..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-gray-500"
                  />
                  <div className="flex items-center gap-0.5 ml-2 opacity-50 shrink-0 bg-white/10 px-1.5 py-0.5 rounded">
                    <Command className="w-2.5 h-2.5 text-gray-300" />
                    <span className="text-[9px] text-gray-300 font-medium">K</span>
                  </div>
                </div>
              </div>

              {/* Back — above panel (industry / subdomain / catalog company) */}
              {(() => {
                const backTarget = searchQuery.trim() ? null : getUniverseBackLabel(currentLevel, navPath);
                return backTarget ? (
                  <UniverseNavBackButton
                    label={`Back to ${backTarget}`}
                    onClick={() => controllerRef.current?.goBack()}
                  />
                ) : null;
              })()}

              {/* Side nav panel — galaxy/subdomain/company */}
              {data && (
                <SidePanel
                  data={data}
                  navPath={navPath}
                  currentLevel={currentLevel}
                  controllerRef={controllerRef}
                  onAddCompany={handleAddCompany}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              )}

              {/* Ecosystem pills */}
              {canRead('ecosystem') && (
                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={() => navigate('/ecosystem/vc-connect')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 border backdrop-blur-md transition-all hover:text-white hover:border-sky-500/30"
                    style={{ background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(148,163,184,0.1)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    VC &amp; Mentors
                  </button>
                  <button
                    onClick={() => navigate('/ecosystem/network')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 border backdrop-blur-md transition-all hover:text-white hover:border-teal-500/30"
                    style={{ background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(148,163,184,0.1)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    Startup Network
                  </button>
                </div>
              )}
            </>
          )}
        </div>
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

      {/* Legend */}
      {!insideBH && !insideCompanyInterior && !insidePlanetRoots && !insideRootPolytope && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 text-xs px-4 py-2 rounded-full backdrop-blur-md z-10"
          style={{ background: 'rgba(0,0,0,0.55)', color: '#5E5E5E', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {[
            { color: '#7c3aed', label: 'Galaxy' },
            { color: '#C1AEFF', label: 'Subdomain' },
            { color: '#38bdf8', label: 'Company' },
            { color: '#2dd4bf', label: 'Department' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      )}

      {/* Keyboard hint */}
      <div
        className="absolute bottom-4 right-6 text-[10px] z-10 px-3 py-1 rounded-lg backdrop-blur-md"
        style={{ background: 'rgba(0,0,0,0.45)', color: '#4b5563' }}
      >
        ESC to go back · Scroll to zoom · Click to explore
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
