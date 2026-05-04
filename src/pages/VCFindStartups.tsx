import { useState, useMemo } from 'react';
import {
  Search, Filter, TrendingUp, Users, DollarSign,
  Building2, Globe, Star, StarOff, ChevronRight,
  Zap, Award, BarChart2, X,
} from 'lucide-react';
import { COMPANIES } from '../db/companies';
import { INDUSTRIES } from '../db/industries';
import { getAllLocalCompanies } from '../lib/localCompanies';

/* ── Portfolio persistence (VC-specific localStorage) ── */
const VC_PORTFOLIO_KEY = 'vc_portfolio_companies';

export function getVCPortfolio(): string[] {
  try { return JSON.parse(localStorage.getItem(VC_PORTFOLIO_KEY) ?? '[]'); }
  catch { return []; }
}

export function toggleVCPortfolio(id: string): string[] {
  const current = getVCPortfolio();
  const updated = current.includes(id) ? current.filter(c => c !== id) : [...current, id];
  localStorage.setItem(VC_PORTFOLIO_KEY, JSON.stringify(updated));
  return updated;
}

/* ── Helpers ── */
const STAGE_COLORS: Record<string, string> = {
  'Idea': '#6b7280', 'Pre-seed': '#8b5cf6', 'Seed': '#a78bfa',
  'Series A': '#22d3ee', 'Series B': '#34d399', 'Series C': '#fbbf24',
  'Series D+': '#fb923c', 'Series E': '#f87171', 'Series F': '#ef4444',
  'Pre-IPO': '#ec4899', 'Public': '#10b981', 'Bootstrapped': '#6ee7b7',
  'PSU': '#93c5fd',
};

function stageBadge(stage: string) {
  const color = STAGE_COLORS[stage] ?? '#5E5E5E';
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {stage}
    </span>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

/* ── Startup Detail Drawer ── */
function StartupDrawer({
  company,
  industryLabel,
  industryColor,
  inPortfolio,
  onTogglePortfolio,
  onClose,
}: {
  company: any;
  industryLabel: string;
  industryColor: string;
  inPortfolio: boolean;
  onTogglePortfolio: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="h-full w-full max-w-md flex flex-col overflow-y-auto"
        style={{ background: '#1B1B1D', borderLeft: `1px solid ${industryColor}25` }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${industryColor}18`, border: `1px solid ${industryColor}30` }}>
            <Building2 className="w-5 h-5" style={{ color: industryColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold truncate">{company.name}</h2>
            <p className="text-xs" style={{ color: '#5E5E5E' }}>{industryLabel} · {company.country}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: '#5E5E5E' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5 flex flex-col gap-5">
          {/* Stage + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {stageBadge(company.stage)}
            {company.isPublic && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: '#10b98118', color: '#10b981', border: '1px solid #10b98130' }}>
                🏛 Public · {company.stockSymbol}
              </span>
            )}
          </div>

          {/* Description */}
          {company.description && (
            <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>{company.description}</p>
          )}

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: DollarSign, label: 'MRR', value: company.mrrUSD ? fmt(company.mrrUSD) : '—' },
              { icon: Users, label: 'Team', value: company.employees ? `${company.employees.toLocaleString()} people` : '—' },
              { icon: TrendingUp, label: 'Valuation', value: company.valuation ? `$${company.valuation}` : '—' },
              { icon: Globe, label: 'Founded', value: company.founded ?? '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: '#161618', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5" style={{ color: '#5E5E5E' }} />
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: '#5E5E5E' }}>{label}</span>
                </div>
                <span className="text-sm font-semibold text-white">{value}</span>
              </div>
            ))}
          </div>

          {/* Investors */}
          {company.investors?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: '#5E5E5E' }}>Backed by</p>
              <div className="flex flex-wrap gap-1.5">
                {company.investors.map((inv: string) => (
                  <span key={inv} className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
                    {inv}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={onTogglePortfolio}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{
              background: inPortfolio
                ? 'rgba(239,68,68,0.12)'
                : `linear-gradient(135deg, ${industryColor}, ${industryColor}bb)`,
              color: inPortfolio ? '#f87171' : '#161618',
              border: inPortfolio ? '1px solid rgba(239,68,68,0.25)' : 'none',
            }}
          >
            {inPortfolio ? (
              <><StarOff className="w-4 h-4" /> Remove from Portfolio</>
            ) : (
              <><Star className="w-4 h-4" fill="#161618" /> Add to Portfolio</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
const ALL_STAGES = [...new Set(COMPANIES.map(c => c.stage))].sort();
const ALL_COUNTRIES = [...new Set(COMPANIES.map(c => c.country))].sort();

export default function VCFindStartups() {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [portfolio, setPortfolio] = useState<string[]>(getVCPortfolio);

  // Combine static companies + locally created ones
  const localCos = getAllLocalCompanies().map(c => ({
    id: c.id,
    name: c.name,
    industryId: c.industry_id,
    country: c.country,
    stage: c.stage,
    founded: c.founded_year ?? undefined,
    isPublic: false,
    valuation: '—',
    mrrUSD: c.mrr_usd,
    employees: c.employees,
    investors: [],
    description: c.description ?? undefined,
    status: 'healthy' as const,
    offset3D: [0, 0, 0] as [number, number, number],
    _isLocal: true,
  }));

  const allCompanies = [...COMPANIES, ...localCos];

  const filtered = useMemo(() => {
    return allCompanies.filter(c => {
      const q = search.toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !(c.description ?? '').toLowerCase().includes(q)) return false;
      if (stageFilter && c.stage !== stageFilter) return false;
      if (countryFilter && c.country !== countryFilter) return false;
      if (industryFilter && c.industryId !== industryFilter) return false;
      return true;
    });
  }, [allCompanies, search, stageFilter, countryFilter, industryFilter]);

  function getIndustry(industryId: string) {
    return INDUSTRIES.find(i => i.id === industryId);
  }

  function togglePortfolio(id: string) {
    setPortfolio(toggleVCPortfolio(id));
  }

  const hasFilters = search || stageFilter || countryFilter || industryFilter;

  return (
    <div className="max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #22d3ee20, #22d3ee10)', border: '1px solid #22d3ee30' }}>
            <Zap className="w-4.5 h-4.5" style={{ color: '#22d3ee' }} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Find Startups</h1>
        </div>
        <p className="text-sm" style={{ color: '#5E5E5E' }}>
          Browse {allCompanies.length} startups across {INDUSTRIES.length} industries · {portfolio.length} in your portfolio
        </p>
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#5E5E5E' }} />
          <input
            type="text"
            placeholder="Search startups…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none"
            style={{ background: '#1B1B1D', border: '1px solid rgba(255,255,255,0.07)', color: '#fff' }}
          />
        </div>

        {/* Stage */}
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer"
          style={{ background: '#1B1B1D', border: '1px solid rgba(255,255,255,0.07)', color: stageFilter ? '#fff' : '#5E5E5E' }}
        >
          <option value="">All Stages</option>
          {ALL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Country */}
        <select
          value={countryFilter}
          onChange={e => setCountryFilter(e.target.value)}
          className="rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer"
          style={{ background: '#1B1B1D', border: '1px solid rgba(255,255,255,0.07)', color: countryFilter ? '#fff' : '#5E5E5E' }}
        >
          <option value="">All Countries</option>
          {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Industry */}
        <select
          value={industryFilter}
          onChange={e => setIndustryFilter(e.target.value)}
          className="rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer"
          style={{ background: '#1B1B1D', border: '1px solid rgba(255,255,255,0.07)', color: industryFilter ? '#fff' : '#5E5E5E' }}
        >
          <option value="">All Industries</option>
          {INDUSTRIES.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
        </select>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStageFilter(''); setCountryFilter(''); setIndustryFilter(''); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm transition-colors hover:bg-white/5"
            style={{ color: '#5E5E5E', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* ── Results count ── */}
      <p className="text-xs mb-4" style={{ color: '#5E5E5E' }}>
        Showing <span className="text-white font-medium">{filtered.length}</span> startups
      </p>

      {/* ── Cards grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(company => {
          const ind = getIndustry(company.industryId);
          const color = ind?.color ?? '#7c3aed';
          const inPort = portfolio.includes(company.id);

          return (
            <div
              key={company.id}
              onClick={() => setSelected(company)}
              className="rounded-2xl p-5 cursor-pointer group transition-all hover:translate-y-[-2px]"
              style={{
                background: '#1B1B1D',
                border: `1px solid rgba(255,255,255,0.06)`,
                boxShadow: inPort ? `0 0 0 1px ${color}40` : 'none',
              }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                  <Building2 className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex items-center gap-1.5">
                  {inPort && <Star className="w-3.5 h-3.5" style={{ color }} fill={color} />}
                  {(company as any)._isLocal && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#22d3ee15', color: '#22d3ee' }}>LOCAL</span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }} />
                </div>
              </div>

              {/* Name */}
              <h3 className="text-sm font-semibold text-white mb-1 leading-tight truncate">{company.name}</h3>
              <p className="text-[11px] mb-3 truncate" style={{ color: '#5E5E5E' }}>
                {ind?.label ?? company.industryId} · {company.country}
              </p>

              {/* Stage */}
              <div className="mb-3">{stageBadge(company.stage)}</div>

              {/* Metrics */}
              <div className="flex items-center gap-3 text-[11px]" style={{ color: '#5E5E5E' }}>
                {company.mrrUSD ? (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />{fmt(company.mrrUSD)} MRR
                  </span>
                ) : null}
                {company.employees ? (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />{company.employees.toLocaleString()}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: '#22d3ee' }} />
          <p className="text-white font-medium mb-1">No startups found</p>
          <p className="text-sm" style={{ color: '#5E5E5E' }}>Try adjusting your filters</p>
        </div>
      )}

      {/* ── Detail Drawer ── */}
      {selected && (
        <StartupDrawer
          company={selected}
          industryLabel={getIndustry(selected.industryId)?.label ?? selected.industryId}
          industryColor={getIndustry(selected.industryId)?.color ?? '#7c3aed'}
          inPortfolio={portfolio.includes(selected.id)}
          onTogglePortfolio={() => togglePortfolio(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
