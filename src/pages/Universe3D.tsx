import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Plus, Search, Command } from 'lucide-react';
import UniverseCanvas from '../three-universe/UniverseCanvas';
import { useUniverseGraph } from '../data/universeGraph';
import { useAuth } from '../lib/auth';
import { UniverseController, type NavPathEntry, type ZoomLevel, type HoverTarget, ZOOM_LEVELS } from '../three-universe/UniverseController';
import type { UniverseIndustry, UniverseSubdomain } from '../data/universeGraph';
import CreateCompanyModal from '../components/CreateCompanyModal';
import type { LocalCompany } from '../lib/localCompanies';
import UniversalPolytope from '../components/UniversalPolytope';
import { PolytopeSidePanel } from '../components/PolytopeSidePanel';
import { UniverseNavBackButton, getUniverseBackLabel } from '../components/UniverseNavBackButton';
import { PolytopeManager } from '../components/PolytopeManager';
import CreateDepartmentPanel from '../components/CreateDepartmentPanel';
import { usePolytopeStore } from '../lib/usePolytopeStore';
import type { UExternalNode, UInternalNode } from '../lib/usePolytopeStore';

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
  let items: { id: string; name: string; color?: string; meta?: string; onClick?: () => void }[] = [];
  let onItemClick = (_id: string) => { };

  const isSearchActive = searchQuery.trim().length > 0;

  if (isSearchActive) {
    const q = searchQuery.toLowerCase();
    const results: typeof items = [];
    
    data?.industries.forEach(ind => {
      if (ind.name.toLowerCase().includes(q)) {
        results.push({ id: ind.id, name: ind.name, color: ind.color, meta: 'Industry', onClick: () => { controllerRef.current?.routeTo('industry', ind.id); setSearchQuery(''); } });
      }
      ind.subdomains.forEach(sub => {
        if (sub.name.toLowerCase().includes(q)) {
          results.push({ id: sub.id, name: sub.name, color: sub.color ?? ind.color, meta: `Subdomain in ${ind.name}`, onClick: () => { controllerRef.current?.routeTo('subdomain', ind.id, sub.id); setSearchQuery(''); } });
        }
        sub.companies.forEach(co => {
          if (co.name.toLowerCase().includes(q)) {
            results.push({ id: co.id, name: co.name, color: ind.color, meta: `Company in ${sub.name}`, onClick: () => { controllerRef.current?.routeTo('company', ind.id, sub.id, co.id); setSearchQuery(''); } });
          }
        });
      });
    });
    
    sectionLabel = 'SEARCH RESULTS';
    items = results.slice(0, 50);
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
      <div key={listKey + '-header'} className="px-3 pt-3 pb-1 shrink-0 panel-slide-in">
        <span className="text-[10px] font-semibold tracking-widest" style={{ color: '#5E5E5E' }}>
          {sectionLabel}
        </span>
        {!isGalaxy && industry && (
          <p className="text-[11px] font-semibold text-white mt-0.5 truncate">
            {isSubdomainOrDeeper && subdomain ? subdomain.name : industry.name}
          </p>
        )}
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
            className="panel-item-in w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.06] group"
            style={{ animationDelay: `${i * 28}ms` }}
          >
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
  const { pathname } = useLocation();
  const { user, profile, canRead } = useAuth();
  // Bypass users (VC/Incubator) have no company — pass null so the universe loads without waiting
  const isBypassUser = !!user && localStorage.getItem('active_role') === 'vc';
  const companyId = isBypassUser ? null : (user ? (profile?.company_id ?? null) : undefined);
  const { data, loading, error, appendLocalCompany } = useUniverseGraph(companyId);

  const controllerRef = useRef<UniverseController | null>(null);
  const [navPath, setNavPath] = useState<NavPathEntry[]>([]);
  const [currentLevel, setCurrentLevel] = useState<ZoomLevel>(ZOOM_LEVELS.GALAXY);
  const [hoverTarget, setHoverTarget] = useState<HoverTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [insideBH, setInsideBH] = useState(false);
  // Mount once on first BH entry — never unmount (avoids R3F OrbitControls null-connect error)
  const [bhMounted, setBhMounted] = useState(false);
  // Increments each entry so UniversalPolytope resets camera to initial view
  const [bhEntryCount, setBhEntryCount] = useState(0);

  // ── Polytope sidebar state (shown when insideBH) ──────────────────────────
  const polytopeStore = usePolytopeStore();
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
    setBhEntryCount(c => c + 1);
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

  // ── Company Polytope (live/user-created company) ──────────────────────────
  const [insideCompanyPolytope, setInsideCompanyPolytope] = useState(false);
  const [companyPolytopeMounted, setCompanyPolytopeMounted] = useState(false);
  const [companyPolytopeEntryCount, setCompanyPolytopeEntryCount] = useState(0);
  const [activeCompany, setActiveCompany] = useState<any>(null);

  // Company polytope sidebar state — mirrors the BH polytope pattern
  const [companyPolytopeDeptId, setCompanyPolytopeDeptId] = useState<string | null>(null);
  const [companyPolytopeInternalPath, setCompanyPolytopeInternalPath] = useState<string[]>([]);
  const [companyPolytopeRequestSelectDeptId, setCompanyPolytopeRequestSelectDeptId] = useState<string | null | undefined>(undefined);
  const [companyPolytopeInternalBackStep, setCompanyPolytopeInternalBackStep] = useState(0);

  const handleEnterCompanyPolytope = useCallback((company: any) => {
    setActiveCompany(company);
    setCompanyPolytopeMounted(true);
    setInsideCompanyPolytope(true);
    setCompanyPolytopeEntryCount(c => c + 1);
    // Reset sidebar for fresh entry
    setCompanyPolytopeDeptId(null);
    setCompanyPolytopeInternalPath([]);
    setCompanyPolytopeRequestSelectDeptId(undefined);
    setCompanyPolytopeInternalBackStep(0);
  }, []);

  // Called when the 3D scene selects a dept inside company polytope
  const handleCompanyPolytopeDeptChange = useCallback((id: string | null) => {
    setCompanyPolytopeDeptId(id);
    setCompanyPolytopeRequestSelectDeptId(id);
    if (id === null) {
      setCompanyPolytopeInternalPath([]);
      setCompanyPolytopeInternalBackStep(0);
    }
  }, []);

  // Called when the sidebar selects a dept — triggers camera fly-in
  const handleCompanyPolytopeSidebarDeptSelect = useCallback((id: string | null) => {
    setCompanyPolytopeDeptId(id);
    if (id === null) {
      setCompanyPolytopeInternalPath([]);
      setCompanyPolytopeRequestSelectDeptId(null);
      setCompanyPolytopeInternalBackStep(0);
    } else {
      setCompanyPolytopeRequestSelectDeptId(id);
    }
  }, []);

  // Called by NavigationManager whenever leaving COMPANY level (back button, ESC, or scroll-out)
  const handleExitCompanyPolytope = useCallback(() => {
    setInsideCompanyPolytope(false);
    setActiveCompany(null);
    setCompanyPolytopeDeptId(null);
    setCompanyPolytopeInternalPath([]);
    setCompanyPolytopeRequestSelectDeptId(null);
    setCompanyPolytopeInternalBackStep(0);
  }, []);

  // Sidebar only — 3D journey + overlay fade handled in NavigationManager
  const handleCompanyPolytopeBackToSubdomain = useCallback(() => {
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
  }, [pathname]);

  const handleNavigate = useCallback((path: NavPathEntry[], level: ZoomLevel) => {
    setNavPath([...path]);
    setCurrentLevel(level);
    // Close create modal when navigating away
    setCreateModal(null);
  }, []);

  const handleHover = useCallback((target: HoverTarget | null) => {
    setHoverTarget(target);
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
  }, [createModal]);

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
          onEnterCompanyPolytope={handleEnterCompanyPolytope}
          onExitCompanyPolytope={handleExitCompanyPolytope}
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
          transition: insideBH
            ? 'opacity 1.4s ease-in-out'                          // entering: fade in, visible immediately
            : 'opacity 1.4s ease-in-out, visibility 0s 1.4s',    // exiting: fade then hide
        }}
      >
        {bhMounted && (
          <UniversalPolytope
            companyName="Work OS Orbit"
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

      {/* ── Company Polytope overlay (live / user-created companies only) ──
           Same visibility:hidden pattern as BH overlay — children stay event-dead
           while fading out so the 3D canvas underneath is interactive. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          opacity: insideCompanyPolytope ? 1 : 0,
          visibility: insideCompanyPolytope ? 'visible' : 'hidden',
          transition: insideCompanyPolytope
            ? 'opacity 1.4s ease-in-out'
            : 'opacity 1.4s ease-in-out, visibility 0s 1.4s',
        }}
      >
        {companyPolytopeMounted && (
          <UniversalPolytope
            companyName={activeCompany?.name ?? 'My Company'}
            transparent={true}
            cameraResetTrigger={companyPolytopeEntryCount + polytopeDraftResetTrigger}
            requestSelectDeptId={companyPolytopeRequestSelectDeptId}
            onDepartmentChange={handleCompanyPolytopeDeptChange}
            onInternalPathChange={setCompanyPolytopeInternalPath}
            requestBackStep={companyPolytopeInternalBackStep}
            draftDept={polytopeDraftDept}
            draftNodeScreenPosRef={polytopeDraftDeptScreenPosRef}
            draftInternalNode={polytopeDraftInternalNode}
            draftInternalNodeScreenPosRef={polytopeDraftInternalNodeScreenPosRef}
            departments={polytopeStore.departments}
            selectedInternalPath={companyPolytopeInternalPath}
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

      {/* Bottom-left column: hidden when create modal is active OR drafting dept/node */}
      {!createModal && !polytopeDraftDept && !polytopeDraftInternalNode && (
        <div className="absolute bottom-6 left-4 z-20 flex flex-col items-start gap-3">
          {/* When inside BH or Company polytope — show polytope dept sidebar */}
          {(insideBH || insideCompanyPolytope) ? (
            <PolytopeSidePanel
              departments={polytopeStore.departments}
              selectedDeptId={insideBH ? polytopeDeptId : companyPolytopeDeptId}
              onDeptSelect={insideBH ? handlePolytopeSidebarDeptSelect : handleCompanyPolytopeSidebarDeptSelect}
              selectedInternalPath={insideBH ? polytopeInternalPath : companyPolytopeInternalPath}
              onAddDepartment={handlePolytopeAddDepartment}
              onAddNode={handlePolytopeAddNode}
              onInternalBack={insideBH
                ? () => setPolytopeInternalBackStep(c => c + 1)
                : () => setCompanyPolytopeInternalBackStep(c => c + 1)
              }
              onExitToSubdomain={insideCompanyPolytope ? handleCompanyPolytopeBackToSubdomain : handleBHExitIntent}
              exitToSubdomainLabel={
                insideCompanyPolytope
                  ? (navPath.find(p => p.level === 'subdomain')?.name ?? 'Subdomain')
                  : 'Galaxy'
              }
              onUpdateDepartment={polytopeStore.updateDepartment}
              onDeleteDepartment={polytopeStore.deleteDepartment}
              onUpdateNode={polytopeStore.updateNode}
              onDeleteNode={polytopeStore.deleteNode}
              onNodeSelect={insideBH ? setPolytopeInternalPath : setCompanyPolytopeInternalPath}
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
          if (insideBH ? (polytopeDeptId === id) : (companyPolytopeDeptId === id)) {
            if (insideBH) {
              setPolytopeDeptId(null);
              setPolytopeRequestSelectDeptId(null);
            } else {
              setCompanyPolytopeDeptId(null);
              setCompanyPolytopeRequestSelectDeptId(null);
            }
          }
          polytopeStore.deleteDepartment(id);
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
      {(insideBH || insideCompanyPolytope) && polytopeDraftDept && (
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
      {(insideBH || insideCompanyPolytope) && polytopeDraftInternalNode && (() => {
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
              const path = insideBH ? polytopeInternalPath : companyPolytopeInternalPath;
              polytopeStore.addNode(deptId, data as Omit<UInternalNode, 'id' | 'children'>, path);
              setPolytopeDraftInternalNode(null);
              setPolytopeDeptId(deptId);
            }}
          />
        );
      })()}

      {/* Hover detail panel — right side */}
      {hoverTarget && hoverTarget.type && (
        <div
          className="absolute top-[4.5rem] right-6 w-60 p-4 z-20 rounded-xl border border-slate-700/40 backdrop-blur-xl"
          style={{ background: 'rgba(0, 0, 0, 0.75)' }}
        >
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 mb-2 inline-block">
            {hoverTarget.type}
          </span>
          <h3 className="text-sm font-semibold text-white mt-1">
            {hoverTarget.industry?.name || hoverTarget.subdomain?.name || hoverTarget.company?.name || hoverTarget.department?.name || ''}
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

      {/* Legend */}
      {!insideBH && !insideCompanyPolytope && (
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
    </div>
  );
}
