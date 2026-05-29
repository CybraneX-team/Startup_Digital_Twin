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

/** Custom + text/plain — browsers often only expose text/plain on drop. */
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

function RelevanceBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-white/50 w-8 text-right">{score}%</span>
    </div>
  );
}

function CompanyInitial({ name, color }: { name: string; color: string }) {
  const letter = (name.trim()[0] ?? 'C').toUpperCase();
  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
      style={{
        background: `linear-gradient(135deg, ${color}33, ${color}12)`,
        border: `1px solid ${color}55`,
        color,
        boxShadow: `0 0 24px ${color}25`,
      }}
    >
      {letter}
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

  return (
    <div className="absolute inset-0 z-[70] flex flex-col overflow-hidden workspace-bg-grid">
      {/* Ambient layers */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 50% at 50% -20%, rgba(30,58,138,0.45) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(193,174,255,0.08) 0%, transparent 50%), #07070a',
        }}
      />

      {/* Header */}
      <header className="relative shrink-0 border-b border-white/[0.06] backdrop-blur-xl bg-black/50">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 max-w-[1800px] mx-auto w-full">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={onBackToCompany}
              disabled={exiting}
              className="group flex items-center gap-2 text-sm font-medium shrink-0 pl-2.5 pr-3.5 py-2 rounded-xl transition-all disabled:opacity-50 hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, rgba(249,198,255,0.15), rgba(193,174,255,0.1))',
                border: '1px solid rgba(193,174,255,0.35)',
                boxShadow: '0 4px 20px rgba(193,174,255,0.12)',
              }}
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              Back to company
            </button>

            <div className="h-8 w-px bg-white/10 shrink-0 hidden sm:block" />

            <div className="flex items-center gap-3 min-w-0">
              <CompanyInitial name={companyName} color={industry.color} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-semibold text-white truncate">{companyName}</h1>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{
                      color: industry.color,
                      background: `${industry.color}14`,
                      border: `1px solid ${industry.color}40`,
                    }}
                  >
                    {industry.label}
                  </span>
                </div>
                <p className="text-[11px] text-white/45 mt-0.5 flex items-center gap-1">
                  <span className="gradient-text font-medium">Industry OS</span>
                  <ChevronRight className="w-3 h-3 opacity-40" />
                  <span>Your product workspace</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div
              className="hidden md:flex items-center gap-3 px-3 py-2 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-white/35">Saved</p>
                <p className="text-sm font-semibold text-white tabular-nums">{pins.length}</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-white/35">Twin health</p>
                <p className="text-sm font-semibold tabular-nums" style={{ color: '#C1AEFF' }}>
                  {avgScore}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative flex-1 flex min-h-0 max-w-[1800px] mx-auto w-full">
        {/* Zone rail */}
        <aside className="w-56 lg:w-60 shrink-0 border-r border-white/[0.06] flex flex-col bg-black/30 backdrop-blur-sm">
          <div className="p-4 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Workspace areas</p>
          </div>
          <nav
            className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5"
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
                  className={`w-full text-left rounded-xl px-3 py-3 transition-all duration-200 cursor-pointer ${
                    isDrop ? 'workspace-zone-drop-target' : ''
                  }`}
                  style={{
                    background: isDrop
                      ? `${zone.accent}18`
                      : active
                        ? 'rgba(255,255,255,0.07)'
                        : 'transparent',
                    border: isDrop
                      ? `1px dashed ${zone.accent}`
                      : active
                        ? `1px solid ${zone.accent}40`
                        : '1px solid transparent',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: active ? `${zone.accent}22` : 'rgba(255,255,255,0.05)',
                        color: active ? zone.accent : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="text-sm font-medium truncate"
                          style={{ color: active ? '#fff' : 'rgba(255,255,255,0.8)' }}
                        >
                          {zone.label}
                        </span>
                        {count > 0 && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold tabular-nums shrink-0"
                            style={{ background: `${zone.accent}28`, color: zone.accent }}
                          >
                            {count}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/38 mt-0.5 leading-snug line-clamp-2">
                        {zone.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
          <div
            className="m-3 p-3 rounded-xl text-[10px] leading-relaxed text-white/40"
            style={{
              background: 'linear-gradient(135deg, rgba(193,174,255,0.08), rgba(30,58,138,0.12))',
              border: '1px solid rgba(193,174,255,0.15)',
            }}
          >
            Use the <strong className="text-white/60">⠿ grip</strong> on a signal to drag it into an area, or tap{' '}
            <strong className="text-white/60">Pin</strong> to save instantly.
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Vitals strip */}
          <div className="shrink-0 p-4 sm:p-5 border-b border-white/[0.05]">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {vitals.map(v => {
                const VitalIcon = VITAL_ICONS[v.label] ?? Activity;
                const trendColor =
                  v.trend === 'up' ? '#34d399' : v.trend === 'down' ? '#f87171' : '#94a3b8';
                return (
                  <div
                    key={v.label}
                    className="rounded-xl p-3 sm:p-4 transition-colors hover:bg-white/[0.03]"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">{v.label}</p>
                      <VitalIcon className="w-3.5 h-3.5 text-white/25" />
                    </div>
                    <p className="text-xl sm:text-2xl font-semibold text-white tracking-tight">{v.value}</p>
                    {v.delta && (
                      <p className="text-xs mt-1 font-medium" style={{ color: trendColor }}>
                        {v.delta}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Zone hero + content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div
              className={`rounded-2xl p-4 sm:p-5 mb-5 transition-all duration-200 ${
                dragOverZone === activeZone ? 'workspace-zone-drop-target' : ''
              }`}
              style={{
                background: `linear-gradient(135deg, ${activeZoneMeta.accent}12, rgba(0,0,0,0.2))`,
                border:
                  dragOverZone === activeZone
                    ? `1px dashed ${activeZoneMeta.accent}`
                    : `1px solid ${activeZoneMeta.accent}30`,
              }}
              onDragEnter={e => handleZoneDragOver(e, activeZone)}
              onDragOver={e => handleZoneDragOver(e, activeZone)}
              onDragLeave={e => handleZoneDragLeave(e, activeZone)}
              onDrop={e => dropInsightOnZone(e, activeZone)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${activeZoneMeta.accent}25`, color: activeZoneMeta.accent }}
                  >
                    <ZoneIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{activeZoneMeta.label}</h2>
                    <p className="text-sm text-white/50 mt-0.5 max-w-lg">{activeZoneMeta.description}</p>
                  </div>
                </div>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-lg shrink-0 tabular-nums"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: zonePins.length > 0 ? activeZoneMeta.accent : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {zonePins.length} saved
                </span>
              </div>
              {company?.description && activeZone === 'strategy' && (
                <p className="text-sm text-white/55 mt-4 pt-4 border-t border-white/[0.06] leading-relaxed max-w-3xl">
                  {company.description}
                </p>
              )}
            </div>

            {zonePins.length === 0 ? (
              <div
                className={`flex flex-col items-center justify-center py-20 px-6 rounded-2xl border border-dashed transition-all duration-200 ${
                  dragOverZone === activeZone ? 'workspace-zone-drop-target border-white/25' : 'border-white/10'
                }`}
                style={{ background: 'rgba(255,255,255,0.02)' }}
                onDragEnter={e => handleZoneDragOver(e, activeZone)}
                onDragOver={e => handleZoneDragOver(e, activeZone)}
                onDragLeave={e => handleZoneDragLeave(e, activeZone)}
                onDrop={e => dropInsightOnZone(e, activeZone)}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: `${activeZoneMeta.accent}15`, color: activeZoneMeta.accent }}
                >
                  <BookmarkPlus className="w-7 h-7" />
                </div>
                <p className="text-sm font-medium text-white/70">Nothing saved in {activeZoneMeta.label} yet</p>
                <p className="text-xs text-white/40 mt-2 text-center max-w-sm leading-relaxed">
                  Pull insights from other industries on the right — they stay relevant to your sector and
                  stack up here for later decisions.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {zonePins.map(pin => (
                  <article
                    key={pin.id}
                    className="workspace-pin-card rounded-xl p-4 relative group"
                    style={{
                      background: 'rgba(27,27,29,0.95)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => unpinInsight(pin.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 text-white/35 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-all"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span
                      className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md mb-2"
                      style={{
                        color: pin.sourceIndustryColor,
                        background: `${pin.sourceIndustryColor}18`,
                      }}
                    >
                      {pin.sourceIndustry}
                    </span>
                    <h3 className="text-sm font-semibold text-white pr-8 leading-snug">{pin.title}</h3>
                    <p className="text-xs text-white/48 mt-2 leading-relaxed line-clamp-3">{pin.summary}</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {pin.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-white/45"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-white/[0.06]">
                      <span className="text-[9px] text-white/30 w-full mb-0.5">Move to</span>
                      {WORKSPACE_ZONES.filter(z => z.id !== activeZone && z.id !== 'insights').map(z => (
                        <button
                          key={z.id}
                          type="button"
                          onClick={() => movePin(pin.id, z.id)}
                          className="text-[9px] px-2 py-1 rounded-md bg-white/[0.04] text-white/45 hover:text-white hover:bg-white/10 transition-colors"
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
              <div className="mt-8">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35 mb-3">
                  Live polytope departments
                </h3>
                <div className="flex flex-wrap gap-2">
                  {deptNodes.map(d => (
                    <span
                      key={d.id}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{
                        background: `${U_DOMAIN_COLOR[d.domain as UDomain]}14`,
                        color: U_DOMAIN_COLOR[d.domain as UDomain],
                        border: `1px solid ${U_DOMAIN_COLOR[d.domain as UDomain]}35`,
                      }}
                    >
                      {d.label}
                      <span className="opacity-60 ml-1.5 tabular-nums">{d.score}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Insight feed */}
        <aside className="w-72 lg:w-80 shrink-0 border-l border-white/[0.06] flex flex-col bg-black/40 backdrop-blur-sm">
          <div className="p-4 border-b border-white/[0.06] space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: '#C1AEFF' }} />
                Cross-sector signals
              </h2>
              <p className="text-[11px] text-white/42 mt-1">
                Curated for <span style={{ color: industry.color }}>{industry.label}</span>
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="search"
                value={insightQuery}
                onChange={e => setInsightQuery(e.target.value)}
                placeholder="Search signals…"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg text-white placeholder:text-white/30 outline-none focus:ring-1 transition-shadow"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredInsights.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-8">No signals match your search.</p>
            ) : (
              filteredInsights.map(insight => {
                const isPinned = pinnedIds.has(insight.id);
                const suggested = WORKSPACE_ZONES.find(z => z.id === insight.suggestedZone);
                return (
                  <div
                    key={insight.id}
                    className={`workspace-insight-card rounded-xl p-3.5 ${
                      isPinned ? 'workspace-insight-card--pinned opacity-50' : ''
                    }`}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <div className="flex items-stretch gap-2">
                      {!isPinned ? (
                        <div
                          draggable
                          onDragStart={e => handleDragStart(e, insight)}
                          onDragEnd={handleDragEnd}
                          className="flex items-center shrink-0 cursor-grab active:cursor-grabbing touch-none px-0.5 -ml-0.5 rounded-md hover:bg-white/5 self-stretch"
                          title="Drag to a workspace area"
                        >
                          <GripVertical className="w-4 h-4 text-white/35" />
                        </div>
                      ) : (
                        <GripVertical className="w-4 h-4 text-white/15 shrink-0 mt-1" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              color: insight.sourceIndustryColor,
                              background: `${insight.sourceIndustryColor}15`,
                            }}
                          >
                            {insight.sourceIndustry}
                          </span>
                        </div>
                        <h3 className="text-xs font-semibold text-white leading-snug">{insight.title}</h3>
                        <p className="text-[11px] text-white/45 mt-1.5 leading-relaxed line-clamp-3">
                          {insight.summary}
                        </p>
                        <div className="mt-2.5">
                          <RelevanceBar score={insight.relevanceScore} color={insight.sourceIndustryColor} />
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {insight.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/40"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        {!isPinned ? (
                          <button
                            type="button"
                            draggable={false}
                            onClick={() => pinInsight(insight, insight.suggestedZone)}
                            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all hover:brightness-110"
                            style={{
                              background: 'linear-gradient(135deg, rgba(249,198,255,0.2), rgba(193,174,255,0.12))',
                              border: '1px solid rgba(193,174,255,0.3)',
                              color: '#E8DEFF',
                            }}
                          >
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            Pin to {suggested?.label ?? 'workspace'}
                          </button>
                        ) : (
                          <p className="mt-3 text-[10px] text-center text-emerald-400/80 font-medium flex items-center justify-center gap-1">
                            <Bookmark className="w-3 h-3" />
                            Saved in workspace
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
