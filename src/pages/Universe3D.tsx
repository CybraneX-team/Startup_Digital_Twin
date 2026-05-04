import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Search, Command } from 'lucide-react';
import UniverseCanvas from '../three-universe/UniverseCanvas';
import { useUniverseGraph } from '../data/universeGraph';
import { useAuth } from '../lib/auth';
import { UniverseController, type NavPathEntry, type ZoomLevel, type HoverTarget, ZOOM_LEVELS } from '../three-universe/UniverseController';
import type { UniverseIndustry, UniverseSubdomain } from '../data/universeGraph';
import CreateCompanyModal from '../components/CreateCompanyModal';
import type { LocalCompany } from '../lib/localCompanies';

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
  let onItemClick = (id: string) => { };

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

  const backToGalaxy = () => controllerRef.current?.goToGalaxy();
  const goBack = () => controllerRef.current?.goBack();

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
      {/* Back nav — slides in when drilled */}
      {!isGalaxy && !isSearchActive && (
        <div
          className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0 panel-slide-in"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-[11px] font-medium transition-colors hover:text-white"
            style={{ color: '#C1AEFF' }}
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
          <button
            onClick={backToGalaxy}
            className="ml-auto text-[10px] transition-colors hover:text-gray-300"
            style={{ color: '#5E5E5E' }}
          >
            Galaxy
          </button>
        </div>
      )}

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
          controllerRef={controllerRef}
        />
      )}

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

      {/* Bottom-left column: hidden when create modal is active */}
      {!createModal && (
        <div className="absolute bottom-6 left-4 z-20 flex flex-col items-start gap-3">
          {/* Search Bar */}
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

          {/* Side nav panel */}
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
        </div>
      )}

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
