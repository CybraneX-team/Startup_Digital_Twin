import { useState, useMemo } from 'react';
import {
  Building2, TrendingUp, Zap, Search, ChevronRight, ChevronLeft,
  Users, BadgeCheck, Star, Filter,
} from 'lucide-react';
import { useFounderWorkspace } from '../../context/FounderWorkspaceContext';

const ACCENT = '#C1AEFF';

const STAGE_ORDER = ['Idea', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Growth', 'IPO'];

function stageColor(stage: string | undefined) {
  const s = (stage ?? '').toLowerCase();
  if (s.includes('idea') || s.includes('pre')) return '#94a3b8';
  if (s.includes('seed')) return '#60a5fa';
  if (s.includes('series a')) return '#34d399';
  if (s.includes('series b')) return '#a78bfa';
  if (s.includes('series c') || s.includes('series d') || s.includes('growth')) return '#fbbf24';
  if (s.includes('ipo') || s.includes('public')) return '#fb7185';
  return '#94a3b8';
}

type Company = {
  id: string; name: string; description?: string;
  stage?: string; employees?: number; isLive?: boolean;
};

export function WorkspaceSubdomainCanvas() {
  const { entryContext, setEntryContext } = useFounderWorkspace();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'employees' | 'stage'>('name');

  const subdomainName = entryContext?.subdomainName ?? 'Subdomain';
  const subdomainDescription = entryContext?.subdomainDescription;
  const industryId = entryContext?.industryId;
  const industryName = entryContext?.industryName ?? '';
  const industryColor = entryContext?.industryColor ?? ACCENT;
  const companies: Company[] = entryContext?.companies ?? [];

  const handleBackToIndustry = () => {
    const fullInd = entryContext?.allIndustries?.find(i => i.id === industryId);
    setEntryContext({
      level: 'industry',
      industryId,
      industryName,
      industryColor,
      subdomains: fullInd?.subdomains.map(s => ({
        id: s.id, name: s.name, description: s.description,
        companyCount: s.companies.length, color: industryColor,
      })) ?? [],
      totalCompanyCount: fullInd?.subdomains.reduce((sum, s) => sum + s.companies.length, 0) ?? 0,
      allIndustries: entryContext?.allIndustries,
    });
  };

  const handleOpenCompany = (c: Company) => {
    setEntryContext({
      level: 'company',
      companyId: c.id,
      companyName: c.name,
      companyDescription: c.description,
      companyStage: c.stage,
      companyEmployees: c.employees,
      companyIsLive: c.isLive,
      // isLive = user's own company already tracked in OS → default to 'own'
      // non-live = external; no relationship set yet (picker will appear)
      companyRelationship: c.isLive ? 'own' : undefined,
      companyRole: 'founder',
      industryId,
      industryName: industryName || undefined,
      industryColor,
      subdomainId: entryContext?.subdomainId,
      subdomainName,
      allIndustries: entryContext?.allIndustries,
    });
  };

  const stages = useMemo(() => {
    const found = [...new Set(companies.map(c => c.stage).filter(Boolean) as string[])];
    return found.sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b));
  }, [companies]);

  const filtered = useMemo(() => {
    let list = companies;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
    }
    if (stageFilter) {
      list = list.filter(c => c.stage === stageFilter);
    }
    if (sortBy === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'employees') list = [...list].sort((a, b) => (b.employees ?? 0) - (a.employees ?? 0));
    if (sortBy === 'stage') list = [...list].sort((a, b) => STAGE_ORDER.indexOf(a.stage ?? '') - STAGE_ORDER.indexOf(b.stage ?? ''));
    return list;
  }, [companies, search, stageFilter, sortBy]);

  const liveCompanies = companies.filter(c => c.isLive);
  const stageDistribution = useMemo(() =>
    STAGE_ORDER.map(s => ({
      stage: s,
      count: companies.filter(c => c.stage === s).length,
    })).filter(s => s.count > 0),
    [companies],
  );

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide flex flex-col gap-5 pb-6 pr-1">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 rounded-2xl p-5 border relative overflow-hidden"
        style={{ borderColor: `${industryColor}30`, background: `linear-gradient(135deg, ${industryColor}0a 0%, rgba(255,255,255,0.015) 100%)` }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse at 75% 50%, ${industryColor}10 0%, transparent 60%)`,
        }} />
        <div className="relative">
          {entryContext?.allIndustries && industryId && (
            <button
              type="button"
              onClick={handleBackToIndustry}
              className="flex items-center gap-1 text-[10px] font-semibold mb-3 opacity-50 hover:opacity-90 transition-opacity"
              style={{ color: industryColor }}
            >
              <ChevronLeft className="w-3 h-3" />
              {industryName || 'Industry'}
            </button>
          )}
          {industryName && (
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5" style={{ color: `${industryColor}70` }}>
              {industryName} ›
            </div>
          )}
          <h2 className="text-xl font-bold text-white leading-tight">{subdomainName}</h2>
          {subdomainDescription && (
            <p className="text-sm text-white/40 mt-1 max-w-lg">{subdomainDescription}</p>
          )}
          <div className="flex items-center gap-5 mt-3">
            {[
              { label: 'Companies', value: companies.length, icon: Building2 },
              { label: 'Live in OS', value: liveCompanies.length, icon: BadgeCheck },
              { label: 'Stage range', value: stages.length > 0 ? `${stages[0]} – ${stages[stages.length - 1]}` : '—', icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex flex-col">
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-white/25 mb-0.5">
                  <Icon className="w-3 h-3" />
                  {label}
                </div>
                <span className="text-sm font-bold text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stage Distribution ───────────────────────────────────────────── */}
      {stageDistribution.length > 0 && (
        <div className="shrink-0">
          <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/30 mb-2.5 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
            Stage Distribution
          </div>
          <div className="flex gap-2 flex-wrap">
            {stageDistribution.map(({ stage, count }) => (
              <button
                key={stage}
                type="button"
                onClick={() => setStageFilter(stageFilter === stage ? null : stage)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: stageFilter === stage ? `${stageColor(stage)}22` : 'rgba(255,255,255,0.03)',
                  color: stageFilter === stage ? stageColor(stage) : 'rgba(255,255,255,0.45)',
                  border: stageFilter === stage ? `1px solid ${stageColor(stage)}40` : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: stageColor(stage) }}
                />
                {stage}
                <span className="opacity-60">({count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Company Directory ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/30 flex items-center gap-1.5 shrink-0">
            <Building2 className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            Companies ({filtered.length})
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/10">
              {(['name', 'employees', 'stage'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSortBy(s)}
                  className={`px-2 py-1 rounded-md text-[9px] font-semibold transition-all ${sortBy === s ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/60'}`}
                >
                  {s === 'name' ? 'A–Z' : s === 'employees' ? 'Size' : 'Stage'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-6 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white placeholder-white/20 outline-none focus:border-white/20 w-32"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="py-10 text-center text-white/25 text-sm">No companies match your filters.</div>
        )}

        <div className="space-y-1.5">
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleOpenCompany(c)}
              className="group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/18 transition-all text-left"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white"
                style={{ background: c.isLive ? `${industryColor}25` : 'rgba(255,255,255,0.06)' }}
              >
                {c.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white truncate">{c.name}</span>
                  {c.isLive && (
                    <BadgeCheck className="w-3 h-3 shrink-0" style={{ color: industryColor }} />
                  )}
                </div>
                {c.description && (
                  <p className="text-[10px] text-white/35 mt-0.5 truncate">{c.description}</p>
                )}
              </div>

              {/* Stage & size */}
              <div className="flex items-center gap-2 shrink-0">
                {c.stage && (
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${stageColor(c.stage)}16`, color: stageColor(c.stage), border: `1px solid ${stageColor(c.stage)}30` }}
                  >
                    {c.stage}
                  </span>
                )}
                {c.employees != null && (
                  <div className="flex items-center gap-1 text-[10px] text-white/30">
                    <Users className="w-3 h-3" />
                    {c.employees > 1000 ? `${(c.employees / 1000).toFixed(1)}k` : c.employees}
                  </div>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/55 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Insights ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 rounded-xl p-4 border border-white/8 bg-white/[0.02]">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/25 mb-2 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
          Subdomain Intelligence
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] text-white/45">
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <Filter className="w-3 h-3 mt-0.5 shrink-0 text-white/25" />
            <span>
              <strong className="text-white/60">{stageDistribution[0]?.stage ?? 'Seed'}</strong> is the most common funding stage — indicating an early/growing market.
            </span>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <TrendingUp className="w-3 h-3 mt-0.5 shrink-0 text-white/25" />
            <span>
              <strong className="text-white/60">{liveCompanies.length}</strong> companies are live in the OS — engage them through the canvas or projects.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
