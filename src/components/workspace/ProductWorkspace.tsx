import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookmarkPlus,
  ChevronRight,
  Cog,
  GripVertical,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  Activity,
  LayoutGrid,
  MousePointerClick,
  Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DbCompany } from '../../lib/supabase';
import {
  WORKSPACE_ZONES,
  buildCompanyVitals,
  getContextInsights,
  getIndustryContext,
  type ContextInsight,
  type WorkspaceZone,
  type WorkspaceZoneId,
} from '../../lib/productWorkspaceData';
import { useProductWorkspaceStore } from '../../lib/useProductWorkspaceStore';
import { U_NODES, U_DOMAIN_COLOR } from '../../lib/universalPolytopeData';
import type { UDomain } from '../../lib/universalPolytopeData';

export interface ProductWorkspaceProps {
  company: DbCompany | null;
  companyName: string;
  onBackToCompany: () => void;
  exiting?: boolean;
}

const DND_INSIGHT = 'application/x-bdt-insight';

function parseInsightFromTransfer(
  e: React.DragEvent,
  fallback: ContextInsight | null,
): ContextInsight | null {
  if (fallback) return fallback;
  try {
    const json = e.dataTransfer.getData(DND_INSIGHT);
    if (json) return JSON.parse(json) as ContextInsight;
  } catch {
    /* ignore */
  }
  return null;
}

function allowDrop(e: React.DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'copy';
}

const ZONE_ICONS: Record<WorkspaceZone['icon'], LucideIcon> = {
  target: Target,
  cog: Cog,
  trending: TrendingUp,
  wallet: Wallet,
  users: Users,
  bookmark: Bookmark,
};

const VITAL_ICONS: Record<string, LucideIcon> = {
  MRR: TrendingUp,
  Team: Users,
  Runway: Activity,
  Stage: LayoutGrid,
  'Health score': Sparkles,
  'Active departments': LayoutGrid,
  Alignment: Target,
};

function RelevanceBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#F9C6FF]/80 to-[#C1AEFF]/90"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-white/45 w-8 text-right">{score}%</span>
    </div>
  );
}

function CompanyInitial({ name, color }: { name: string; color: string }) {
  const letter = (name.trim()[0] ?? 'C').toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0 ws-glass-panel"
      style={{
        color,
        boxShadow: `0 0 20px ${color}20`,
      }}
    >
      {letter}
    </div>
  );
}

function FlowStep({
  step,
  label,
  active,
}: {
  step: number;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 text-[11px] ${active ? 'text-white/80' : 'text-white/35'}`}
    >
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold tabular-nums ${
          active ? 'ws-zone-active' : 'ws-glass'
        }`}
      >
        {step}
      </span>
      <span className="hidden sm:inline font-medium">{label}</span>
    </div>
  );
}

export function ProductWorkspace({
  company,
  companyName,
  onBackToCompany,
  exiting = false,
}: ProductWorkspaceProps) {
  const { pins, pinInsight, unpinInsight, movePin, pinsForZone } = useProductWorkspaceStore();
  const [activeZone, setActiveZone] = useState<WorkspaceZoneId>('strategy');
  const [dragOverZone, setDragOverZone] = useState<WorkspaceZoneId | null>(null);
  const [insightQuery, setInsightQuery] = useState('');
  const draggedInsightRef = useRef<ContextInsight | null>(null);

  const industry = useMemo(() => getIndustryContext(company?.industry_id), [company?.industry_id]);
  const vitals = useMemo(() => buildCompanyVitals(company), [company]);
  const insights = useMemo(
    () => getContextInsights(company?.industry_id, companyName),
    [company?.industry_id, companyName],
  );

  const filteredInsights = useMemo(() => {
    const q = insightQuery.trim().toLowerCase();
    if (!q) return insights;
    return insights.filter(
      i =>
        i.title.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.sourceIndustry.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q)),
    );
  }, [insights, insightQuery]);

  const deptNodes = U_NODES.filter(n => n.domain !== 'inactive');
  const avgScore = Math.round(deptNodes.reduce((s, n) => s + n.score, 0) / deptNodes.length);
  const activeZoneMeta = WORKSPACE_ZONES.find(z => z.id === activeZone)!;
  const ZoneIcon = ZONE_ICONS[activeZoneMeta.icon];
  const zonePins = pinsForZone(activeZone);
  const pinnedIds = new Set(pins.map(p => p.id));
  const isDragging = dragOverZone !== null;

  const handleDragStart = (e: React.DragEvent, insight: ContextInsight) => {
    draggedInsightRef.current = insight;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', insight.id);
    e.dataTransfer.setData(DND_INSIGHT, JSON.stringify(insight));
  };

  const handleDragEnd = () => {
    draggedInsightRef.current = null;
    setDragOverZone(null);
  };

  const dropInsightOnZone = (e: React.DragEvent, zoneId: WorkspaceZoneId) => {
    e.preventDefault();
    e.stopPropagation();
    const insight = parseInsightFromTransfer(e, draggedInsightRef.current);
    draggedInsightRef.current = null;
    setDragOverZone(null);
    if (!insight) return;
    pinInsight(insight, zoneId);
    setActiveZone(zoneId);
  };

  const handleZoneDragOver = (e: React.DragEvent, zoneId: WorkspaceZoneId) => {
    allowDrop(e);
    setDragOverZone(zoneId);
  };

  const handleZoneDragLeave = (e: React.DragEvent, zoneId: WorkspaceZoneId) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDragOverZone(prev => (prev === zoneId ? null : prev));
  };

  const zoneItemClass = (_zoneId: WorkspaceZoneId, active: boolean, isDrop: boolean) => {
    const base =
      'w-full text-left rounded-xl px-3 py-2.5 transition-all duration-200 cursor-pointer border border-transparent';
    if (isDrop) return `${base} workspace-zone-drop-target`;
    if (active) return `${base} ws-zone-active`;
    return `${base} hover:bg-white/[0.04] hover:border-white/[0.06]`;
  };

  return (
    <div className="absolute inset-0 z-[70] flex flex-col overflow-hidden ws-shell workspace-bg-grid">
      {/* Header */}
      <header className="relative shrink-0 ws-glass-strong border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 max-w-[1800px] mx-auto w-full">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToCompany}
              disabled={exiting}
              className="ws-btn-primary group flex items-center gap-2 text-sm font-medium shrink-0 px-3 py-2 rounded-xl disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="h-7 w-px bg-white/10 shrink-0 hidden sm:block" />

            <div className="flex items-center gap-3 min-w-0">
              <CompanyInitial name={companyName} color={industry.color} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-semibold text-white truncate tracking-tight">
                    {companyName}
                  </h1>
                  <span
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ws-glass"
                    style={{ color: industry.color }}
                  >
                    {industry.label}
                  </span>
                </div>
                <p className="text-[10px] text-white/40 mt-0.5 flex items-center gap-1">
                  <span className="gradient-text font-medium">Industry OS</span>
                  <ChevronRight className="w-3 h-3 opacity-30" />
                  <span>Workspace</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-4 px-3 py-1.5 rounded-xl ws-glass">
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-white/30">Saved</p>
                <p className="text-sm font-semibold text-white tabular-nums">{pins.length}</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-white/30">Twin health</p>
                <p className="text-sm font-semibold tabular-nums gradient-text">{avgScore}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Flow hint */}
        <div className="px-4 sm:px-6 pb-3 max-w-[1800px] mx-auto w-full">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-6 py-2 px-3 rounded-xl ws-glass">
            <FlowStep step={1} label="Browse signals" active={!isDragging && pins.length === 0} />
            <ChevronRight className="w-3 h-3 text-white/20 hidden sm:block" />
            <FlowStep step={2} label="Drag or pin" active={isDragging} />
            <ChevronRight className="w-3 h-3 text-white/20 hidden sm:block" />
            <FlowStep step={3} label="Build your board" active={pins.length > 0 && !isDragging} />
          </div>
        </div>
      </header>

      <div className="relative flex-1 flex min-h-0 gap-2 sm:gap-3 p-2 sm:p-3 max-w-[1800px] mx-auto w-full">
        {/* Zone rail */}
        <aside className="w-[13.5rem] lg:w-56 shrink-0 flex flex-col rounded-2xl ws-glass-strong overflow-hidden">
          <div className="p-3 pb-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/28 flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              Areas
            </p>
          </div>
          <nav
            className="flex-1 overflow-y-auto px-2 pb-2 space-y-1"
            onDragOver={allowDrop}
            onDrop={e => dropInsightOnZone(e, activeZone)}
          >
            {WORKSPACE_ZONES.map(zone => {
              const count = pinsForZone(zone.id).length;
              const active = activeZone === zone.id;
              const isDrop = dragOverZone === zone.id;
              const Icon = ZONE_ICONS[zone.icon];
              return (
                <div
                  key={zone.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveZone(zone.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveZone(zone.id);
                    }
                  }}
                  onDragEnter={e => handleZoneDragOver(e, zone.id)}
                  onDragOver={e => handleZoneDragOver(e, zone.id)}
                  onDragLeave={e => handleZoneDragLeave(e, zone.id)}
                  onDrop={e => dropInsightOnZone(e, zone.id)}
                  className={zoneItemClass(zone.id, active, isDrop)}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ws-glass ${
                        active ? 'text-[#C1AEFF]' : 'text-white/45'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-medium truncate text-white/90">{zone.label}</span>
                        {count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold tabular-nums shrink-0 ws-glass text-[#C1AEFF]">
                            {count}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/32 mt-0.5 leading-snug line-clamp-1 hidden lg:block">
                        {zone.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
          <div className="m-2 p-2.5 rounded-xl ws-glass text-[10px] leading-relaxed text-white/38">
            <MousePointerClick className="w-3.5 h-3.5 text-[#C1AEFF]/70 mb-1.5" />
            Drag via <span className="text-white/55">⠿</span> or tap <span className="text-white/55">Pin</span>
          </div>
        </aside>

        {/* Main canvas */}
        <main className="flex-1 flex flex-col min-w-0 rounded-2xl ws-glass-strong overflow-hidden">
          {/* Vitals */}
          <div className="shrink-0 p-3 sm:p-4 border-b border-white/[0.05]">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {vitals.map(v => {
                const VitalIcon = VITAL_ICONS[v.label] ?? Activity;
                const trendColor =
                  v.trend === 'up' ? '#34d399' : v.trend === 'down' ? '#f87171' : '#94a3b8';
                return (
                  <div key={v.label} className="rounded-xl p-3 ws-glass-panel transition-colors hover:bg-white/[0.05]">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[9px] font-medium uppercase tracking-wider text-white/35">{v.label}</p>
                      <VitalIcon className="w-3 h-3 text-white/20" />
                    </div>
                    <p className="text-lg sm:text-xl font-semibold text-white tracking-tight">{v.value}</p>
                    {v.delta && (
                      <p className="text-[11px] mt-0.5 font-medium" style={{ color: trendColor }}>
                        {v.delta}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {/* Zone header */}
            <div
              className={`rounded-xl p-4 mb-4 ws-glass-panel transition-all duration-200 ${
                dragOverZone === activeZone ? 'workspace-zone-drop-target ws-drop-surface-active' : ''
              }`}
              onDragEnter={e => handleZoneDragOver(e, activeZone)}
              onDragOver={e => handleZoneDragOver(e, activeZone)}
              onDragLeave={e => handleZoneDragLeave(e, activeZone)}
              onDrop={e => dropInsightOnZone(e, activeZone)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ws-glass text-[#C1AEFF]">
                    <ZoneIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white tracking-tight">{activeZoneMeta.label}</h2>
                    <p className="text-xs text-white/45 mt-0.5 max-w-lg">{activeZoneMeta.description}</p>
                  </div>
                </div>
                <span className="text-[11px] font-medium px-2 py-1 rounded-lg ws-glass tabular-nums text-white/50">
                  {zonePins.length} saved
                </span>
              </div>
              {company?.description && activeZone === 'strategy' && (
                <p className="text-xs text-white/50 mt-3 pt-3 border-t border-white/[0.06] leading-relaxed max-w-3xl">
                  {company.description}
                </p>
              )}
            </div>

            {zonePins.length === 0 ? (
              <div
                className={`flex flex-col items-center justify-center py-16 sm:py-20 px-6 rounded-2xl ws-drop-surface transition-all duration-200 ${
                  dragOverZone === activeZone ? 'workspace-zone-drop-target ws-drop-surface-active' : ''
                }`}
                onDragEnter={e => handleZoneDragOver(e, activeZone)}
                onDragOver={e => handleZoneDragOver(e, activeZone)}
                onDragLeave={e => handleZoneDragLeave(e, activeZone)}
                onDrop={e => dropInsightOnZone(e, activeZone)}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ws-glass text-[#C1AEFF]">
                  <BookmarkPlus className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-white/75">Drop signals here</p>
                <p className="text-xs text-white/38 mt-2 text-center max-w-xs leading-relaxed">
                  Nothing in {activeZoneMeta.label} yet. Pull cross-sector insights from the feed on the right.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {zonePins.map(pin => (
                  <article key={pin.id} className="workspace-pin-card rounded-xl p-4 relative group">
                    <button
                      type="button"
                      onClick={() => unpinInsight(pin.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg ws-btn-ghost text-white/35 hover:text-red-400 hover:border-red-400/30 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-all"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span
                      className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md mb-2 ws-glass"
                      style={{ color: pin.sourceIndustryColor }}
                    >
                      {pin.sourceIndustry}
                    </span>
                    <h3 className="text-sm font-semibold text-white pr-8 leading-snug">{pin.title}</h3>
                    <p className="text-xs text-white/45 mt-2 leading-relaxed line-clamp-3">{pin.summary}</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {pin.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/40"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-white/[0.06]">
                      <span className="text-[9px] text-white/28 w-full mb-0.5">Move to</span>
                      {WORKSPACE_ZONES.filter(z => z.id !== activeZone && z.id !== 'insights').map(z => (
                        <button
                          key={z.id}
                          type="button"
                          onClick={() => movePin(pin.id, z.id)}
                          className="text-[9px] px-2 py-1 rounded-md ws-btn-ghost text-white/45 hover:text-white"
                        >
                          {z.label}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeZone === 'operations' && (
              <div className="mt-6">
                <h3 className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">
                  Live departments
                </h3>
                <div className="flex flex-wrap gap-2">
                  {deptNodes.map(d => (
                    <span
                      key={d.id}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium ws-glass"
                      style={{
                        color: U_DOMAIN_COLOR[d.domain as UDomain],
                      }}
                    >
                      {d.label}
                      <span className="opacity-50 ml-1 tabular-nums">{d.score}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Signal feed */}
        <aside className="w-[17rem] lg:w-72 shrink-0 flex flex-col rounded-2xl ws-glass-strong overflow-hidden">
          <div className="p-3 border-b border-white/[0.06] space-y-2.5">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 tracking-tight">
                <Sparkles className="w-4 h-4 text-[#C1AEFF]" />
                Signals
              </h2>
              <p className="text-[10px] text-white/38 mt-0.5">
                For <span style={{ color: industry.color }}>{industry.label}</span>
                <span className="text-white/25"> · {filteredInsights.length}</span>
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="search"
                value={insightQuery}
                onChange={e => setInsightQuery(e.target.value)}
                placeholder="Search…"
                className="ws-input w-full pl-8 pr-3 py-2 text-xs rounded-lg text-white placeholder:text-white/28"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredInsights.length === 0 ? (
              <p className="text-xs text-white/35 text-center py-10">No matches</p>
            ) : (
              filteredInsights.map(insight => {
                const isPinned = pinnedIds.has(insight.id);
                const suggested = WORKSPACE_ZONES.find(z => z.id === insight.suggestedZone);
                return (
                  <div
                    key={insight.id}
                    className={`workspace-insight-card rounded-xl p-3 ${
                      isPinned ? 'workspace-insight-card--pinned opacity-45' : ''
                    }`}
                  >
                    <div className="flex items-stretch gap-1.5">
                      {!isPinned ? (
                        <div
                          draggable
                          onDragStart={e => handleDragStart(e, insight)}
                          onDragEnd={handleDragEnd}
                          className="flex items-center shrink-0 cursor-grab active:cursor-grabbing touch-none px-1 rounded-md hover:bg-white/[0.06] self-stretch"
                          title="Drag to an area"
                        >
                          <GripVertical className="w-4 h-4 text-[#C1AEFF]/50" />
                        </div>
                      ) : (
                        <GripVertical className="w-4 h-4 text-white/12 shrink-0 mt-1" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded ws-glass inline-block mb-1"
                          style={{ color: insight.sourceIndustryColor }}
                        >
                          {insight.sourceIndustry}
                        </span>
                        <h3 className="text-xs font-semibold text-white leading-snug">{insight.title}</h3>
                        <p className="text-[11px] text-white/42 mt-1 leading-relaxed line-clamp-2">
                          {insight.summary}
                        </p>
                        <div className="mt-2">
                          <RelevanceBar score={insight.relevanceScore} />
                        </div>
                        {!isPinned ? (
                          <button
                            type="button"
                            draggable={false}
                            onClick={() => pinInsight(insight, insight.suggestedZone)}
                            className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold ws-btn-primary"
                          >
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            Pin · {suggested?.label ?? 'area'}
                          </button>
                        ) : (
                          <p className="mt-2 text-[10px] text-center text-emerald-400/75 font-medium flex items-center justify-center gap-1">
                            <Bookmark className="w-3 h-3" />
                            Saved
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
