import { useState, useMemo } from 'react';
import {
  Building2, TrendingUp, Zap, ChevronRight, ChevronLeft,
  Layers, PieChart, Globe2, Search,
} from 'lucide-react';
import { useFounderWorkspace } from '../../context/FounderWorkspaceContext';

const ACCENT = '#C1AEFF';

// High-level market sizing hints per subdomain keyword
const SUBDOMAIN_SIGNALS: Record<string, { trend: string; hot: boolean }> = {
  payment: { trend: 'Embedded finance taking share from legacy rails', hot: true },
  banking: { trend: 'Open banking APIs commoditising core banking', hot: false },
  insurance: { trend: 'AI underwriting shrinking loss ratios', hot: true },
  wealth: { trend: 'Self-directed investing platforms growing fast', hot: false },
  lending: { trend: 'BNPL consolidation; credit AI replacing FICO', hot: true },
  health: { trend: 'Remote monitoring reimbursement expanding', hot: true },
  diagnostic: { trend: 'FDA clearing AI diagnostics at record pace', hot: true },
  therapy: { trend: 'Mental health SaaS CAC dropping with consumer demand', hot: true },
  genome: { trend: 'Whole-genome sequencing cost below $200', hot: false },
  drug: { trend: 'AI accelerating hit identification → IND timelines', hot: true },
  learning: { trend: 'Micro-credential acceptance rising in enterprise hiring', hot: true },
  corporate: { trend: 'CLO budgets shifting from LMS to AI coaching', hot: true },
  retail: { trend: 'AI merchandising delivering +15% AOV lifts', hot: false },
  logistics: { trend: 'Warehouse robotics ROI under 18 months now', hot: true },
  security: { trend: 'Identity-first security eating perimeter model', hot: true },
  cloud: { trend: 'CNAPP consolidating cloud security tools', hot: true },
  saas: { trend: 'Vertical SaaS outperforming horizontal peers 3×', hot: true },
  ai: { trend: 'AI-native SaaS achieving NRR above 120% consistently', hot: true },
  autonomous: { trend: 'Level 4 robotaxi deployments scaling in 3 cities', hot: true },
  energy: { trend: 'Grid-scale battery costs at $90/kWh — parity reached', hot: true },
  carbon: { trend: 'Voluntary carbon markets growing 40% YoY', hot: false },
  food: { trend: 'Ghost kitchens consolidating; alt-protein costs down 60%', hot: false },
  agri: { trend: 'Precision ag reducing input costs by 25–30%', hot: true },
  hr: { trend: 'Skills-based hiring shifting ATS from credential-first', hot: true },
  recruit: { trend: 'AI sourcing cutting time-to-hire by 40%', hot: true },
  marketing: { trend: 'CDPs replacing third-party cookie stacks entirely', hot: false },
  ad: { trend: 'Contextual targeting outperforming behavioural post-cookie', hot: true },
  gaming: { trend: 'Generative content studios cutting dev costs 50%', hot: true },
  space: { trend: 'LEO launch costs below $1,000/kg — opens new use cases', hot: true },
  legal: { trend: 'Contract AI cutting legal review time by 70%', hot: true },
  real: { trend: 'PropTech consolidating after 2024 correction', hot: false },
};

function getSubdomainSignal(name: string) {
  const lower = name.toLowerCase();
  const key = Object.keys(SUBDOMAIN_SIGNALS).find(k => lower.includes(k));
  return key ? SUBDOMAIN_SIGNALS[key] : null;
}

export function WorkspaceIndustryCanvas() {
  const { entryContext, setEntryContext } = useFounderWorkspace();
  const [search, setSearch] = useState('');

  const industryId = entryContext?.industryId;
  const industryName = entryContext?.industryName ?? 'Industry';
  const industryColor = entryContext?.industryColor ?? ACCENT;
  const industryDescription = entryContext?.industryDescription;
  const subdomains = entryContext?.subdomains ?? [];
  const totalCompanies = entryContext?.totalCompanyCount ?? 0;

  const handleBackToUniverse = () => {
    setEntryContext({
      level: 'universe',
      subdomains: entryContext?.allIndustries?.map(i => ({
        id: i.id, name: i.name, description: i.description,
        companyCount: i.subdomains.reduce((sum, s) => sum + s.companies.length, 0),
        color: i.color,
      })) ?? [],
      totalCompanyCount: entryContext?.allIndustries?.reduce(
        (total, i) => total + i.subdomains.reduce((s2, s) => s2 + s.companies.length, 0), 0
      ) ?? 0,
      allIndustries: entryContext?.allIndustries,
    });
  };

  const handleDrillIntoSubdomain = (sub: { id: string; name: string; description?: string; companyCount: number }) => {
    const fullInd = entryContext?.allIndustries?.find(i => i.id === industryId);
    const fullSub = fullInd?.subdomains.find(s => s.id === sub.id);
    setEntryContext({
      level: 'subdomain',
      industryId,
      industryName,
      industryColor,
      subdomainId: sub.id,
      subdomainName: sub.name,
      subdomainDescription: sub.description,
      companies: fullSub?.companies.map(c => ({
        id: c.id, name: c.name, description: c.description, isLive: c.isLive,
      })) ?? [],
      allIndustries: entryContext?.allIndustries,
    });
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return subdomains;
    const q = search.toLowerCase();
    return subdomains.filter(s => s.name.toLowerCase().includes(q));
  }, [subdomains, search]);

  const hotSubdomains = subdomains.filter(s => getSubdomainSignal(s.name)?.hot);

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide flex flex-col gap-5 pb-6 pr-1">

      {/* ── Industry Header ──────────────────────────────────────────────── */}
      <div
        className="shrink-0 rounded-2xl p-5 border relative overflow-hidden"
        style={{ borderColor: `${industryColor}30`, background: `linear-gradient(135deg, ${industryColor}0d 0%, rgba(255,255,255,0.02) 100%)` }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse at 80% 50%, ${industryColor}12 0%, transparent 65%)`,
        }} />
        <div className="relative">
          {entryContext?.allIndustries && (
            <button
              type="button"
              onClick={handleBackToUniverse}
              className="flex items-center gap-1 text-[10px] font-semibold mb-3 opacity-50 hover:opacity-90 transition-opacity"
              style={{ color: industryColor }}
            >
              <ChevronLeft className="w-3 h-3" />
              All Industries
            </button>
          )}
          <div className="flex items-center gap-2 mb-1">
            <Globe2 className="w-4 h-4" style={{ color: industryColor }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: `${industryColor}80` }}>
              Industry Workspace
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white leading-tight">{industryName}</h2>
          {industryDescription && (
            <p className="text-sm text-white/45 mt-1 max-w-lg">{industryDescription}</p>
          )}
          <div className="flex items-center gap-5 mt-4">
            {[
              { label: 'Subdomains', value: subdomains.length, icon: Layers },
              { label: 'Companies', value: totalCompanies, icon: Building2 },
              { label: 'Hot Areas', value: hotSubdomains.length, icon: Zap },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex flex-col">
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-white/30 mb-0.5">
                  <Icon className="w-3 h-3" />
                  {label}
                </div>
                <span className="text-sm font-bold text-white tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hot Opportunities ────────────────────────────────────────────── */}
      {hotSubdomains.length > 0 && (
        <div className="shrink-0">
          <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/35 mb-2.5 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
            Hot Right Now in {industryName}
          </div>
          <div className="flex flex-wrap gap-2">
            {hotSubdomains.slice(0, 4).map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleDrillIntoSubdomain(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all hover:opacity-75"
                style={{ background: `${industryColor}1a`, color: industryColor, border: `1px solid ${industryColor}30` }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                {s.name}
                <span className="text-[9px] opacity-60">· {s.companyCount} cos</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Market Map (subdomain donut visualization) ──────────────────── */}
      <div className="shrink-0">
        <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/35 mb-2.5 flex items-center gap-1.5">
          <PieChart className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          Market Map — Subdomain Distribution
        </div>
        <div className="grid grid-cols-4 gap-2">
          {subdomains.slice(0, 8).map((s, i) => {
            const pct = totalCompanies > 0 ? Math.round((s.companyCount / totalCompanies) * 100) : 0;
            const opacity = 0.25 + (0.75 * (s.companyCount / (Math.max(...subdomains.map(x => x.companyCount)) || 1)));
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleDrillIntoSubdomain(s)}
                className="rounded-xl p-3 border border-white/8 bg-white/[0.02] flex flex-col items-center text-center hover:border-white/20 hover:bg-white/[0.04] transition-all"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 text-xs font-bold"
                  style={{ background: `${industryColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`, color: 'white' }}
                >
                  {i + 1}
                </div>
                <div className="text-[10px] font-semibold text-white leading-tight mb-1">{s.name}</div>
                <div className="text-[9px] text-white/35">{s.companyCount} cos</div>
                <div className="h-1 w-full rounded-full bg-white/10 mt-2">
                  <div className="h-full rounded-full" style={{ width: `${pct * 3}%`, maxWidth: '100%', background: industryColor }} />
                </div>
                <div className="text-[9px] text-white/25 mt-0.5">{pct}%</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Subdomain Directory ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/35 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            Subdomains
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-7 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white placeholder-white/25 outline-none focus:border-white/20 w-36"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map(sub => {
            const signal = getSubdomainSignal(sub.name);
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => handleDrillIntoSubdomain(sub)}
                className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/8 bg-white/[0.02] hover:border-white/18 hover:bg-white/[0.05] transition-all text-left"
              >
                {signal?.hot && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                )}
                {!signal?.hot && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{sub.name}</span>
                    {signal?.hot && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: '#fbbf2416', color: '#fbbf24', border: '1px solid #fbbf2430' }}>
                        HOT
                      </span>
                    )}
                  </div>
                  {signal && <p className="text-[10px] text-white/35 mt-0.5 leading-relaxed">{signal.trend}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-[10px] text-white/35">
                    <Building2 className="w-3 h-3" />
                    {sub.companyCount}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/25 group-hover:text-white/60 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Navigation hint ──────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[11px] font-medium"
        style={{ background: `${industryColor}0a`, color: `${industryColor}70`, border: `1px solid ${industryColor}18` }}
      >
        <TrendingUp className="w-3.5 h-3.5" />
        Click any subdomain to explore its companies
      </div>
    </div>
  );
}
