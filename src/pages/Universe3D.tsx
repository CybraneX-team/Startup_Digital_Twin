import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import UniverseCanvas from '../three-universe/UniverseCanvas';
import { useUniverseGraph } from '../data/universeGraph';
import { useAuth } from '../lib/auth';
import { UniverseController, type NavPathEntry, type ZoomLevel, type HoverTarget, ZOOM_LEVELS } from '../three-universe/UniverseController';

export default function Universe3DPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, profile, canRead } = useAuth();
  const companyId = user ? (profile?.company_id ?? null) : undefined;
  const { data, loading, error } = useUniverseGraph(companyId);

  const controllerRef = useRef<UniverseController | null>(null);
  const [navPath, setNavPath] = useState<NavPathEntry[]>([]);
  const [currentLevel, setCurrentLevel] = useState<ZoomLevel>(ZOOM_LEVELS.GALAXY);
  const [hoverTarget, setHoverTarget] = useState<HoverTarget | null>(null);

  // When the route becomes /3d (visibility toggled on), force a renderer resize
  // so the canvas fills the full viewport after being hidden.
  useEffect(() => {
    if (pathname === '/3d') {
      const rafId = requestAnimationFrame(() => controllerRef.current?.resize());
      return () => cancelAnimationFrame(rafId);
    }
  }, [pathname]);

  const handleNavigate = useCallback((path: NavPathEntry[], level: ZoomLevel) => {
    setNavPath([...path]);
    setCurrentLevel(level);
  }, []);

  const handleHover = useCallback((target: HoverTarget | null) => {
    setHoverTarget(target);
  }, []);

  const handleBack = useCallback(() => {
    controllerRef.current?.goBack();
  }, []);

  const handleGoGalaxy = useCallback(() => {
    controllerRef.current?.goToGalaxy();
  }, []);

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
    <div className="fixed inset-1 overflow-hidden" >
      {/* Loading State */}
      {loading || !data ? (
        <div className="absolute inset-0 pt-14 flex flex-col items-center justify-center z-50">
          <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: '#C1AEFF' }} />
          <p className="text-sm font-medium" style={{ color: '#C1AEFF' }}>
            Loading Universe...
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Assembling {data?.industries?.length ?? '...'} industry galaxies
          </p>
        </div>
      ) : (
        <UniverseCanvas
          data={data}
          onNavigate={handleNavigate}
          onHover={handleHover}
          controllerRef={controllerRef}
        />
      )}

      {/* HUD — Breadcrumb navigation (below TopBar h-14 + 8px gap) */}
      <div className="absolute top-[4.25rem] left-6 z-20 flex items-center gap-1">
        {currentLevel !== ZOOM_LEVELS.GALAXY && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md transition-all hover:bg-white/10"
            style={{ background: 'rgba(22,22,24,0.85)', color: '#C1AEFF' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        )}

        {navPath.length > 0 && (
          <div
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs backdrop-blur-md ml-2"
            style={{ background: 'rgba(22,22,24,0.85)', color: '#9ca3af' }}
          >
            <button
              onClick={handleGoGalaxy}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Galaxy
            </button>
            {navPath.map((entry, i) => (
              <span key={entry.id} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-gray-600" />
                <span className={i === navPath.length - 1 ? 'text-white font-medium' : 'text-gray-400'}>
                  {entry.name}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Level indicator */}
      <div
        className="absolute top-[4.25rem] right-6 z-20 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-medium backdrop-blur-md"
        style={{ background: 'rgba(22,22,24,0.85)', color: '#C1AEFF' }}
      >
        {currentLevel === ZOOM_LEVELS.GALAXY && 'Galaxy View'}
        {currentLevel === ZOOM_LEVELS.INDUSTRY && 'Industry View'}
        {currentLevel === ZOOM_LEVELS.SUBDOMAIN && 'Subdomain View'}
        {currentLevel === ZOOM_LEVELS.COMPANY && 'Company View'}
        {currentLevel === ZOOM_LEVELS.DEPARTMENT && 'Department View'}
      </div>

      {/* Hover detail panel */}
      {hoverTarget && hoverTarget.type && (
        <div
          className="absolute top-[6.5rem] right-6 w-64 p-4 z-20 rounded-xl border border-slate-700/40 backdrop-blur-xl"
          style={{ background: 'rgba(2, 6, 23, 0.88)' }}
        >
          <span
            className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 mb-2 inline-block"
          >
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
              <div className="bg-gray-900/60 rounded-lg py-1 px-2">
                <span className="text-[9px] text-gray-500">Employees</span>
                <p className="text-xs font-medium text-white">{hoverTarget.company.employees}</p>
              </div>
              {hoverTarget.company?.funding && (
                <div className="bg-gray-900/60 rounded-lg py-1 px-2">
                  <span className="text-[9px] text-gray-500">Stage</span>
                  <p className="text-xs font-medium text-white">{hoverTarget.company.funding}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ecosystem quick-access */}
      {canRead('ecosystem') && (
        <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-10">
          <button
            onClick={() => navigate('/ecosystem/vc-connect')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 border backdrop-blur-md transition-all hover:text-white hover:border-sky-500/30"
            style={{ background: 'rgba(2, 6, 23, 0.75)', borderColor: 'rgba(148,163,184,0.1)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            VC &amp; Mentors
          </button>
          <button
            onClick={() => navigate('/ecosystem/network')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 border backdrop-blur-md transition-all hover:text-white hover:border-teal-500/30"
            style={{ background: 'rgba(2, 6, 23, 0.75)', borderColor: 'rgba(148,163,184,0.1)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            Startup Network
          </button>
        </div>
      )}

      {/* Legend */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 text-xs px-4 py-2 rounded-full backdrop-blur-md z-10"
        style={{ background: 'rgba(22,22,24,0.85)', color: '#5E5E5E' }}
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
        style={{ background: 'rgba(22,22,24,0.6)', color: '#4b5563' }}
      >
        ESC to go back · Scroll to zoom · Click to explore
      </div>
    </div>
  );
}
