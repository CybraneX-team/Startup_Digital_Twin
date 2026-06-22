import { useState, useMemo } from 'react';
import {
  Globe2, TrendingUp, Zap, Building2, ChevronRight, Search,
  Layers, DollarSign, Users, ArrowRight, Star,
} from 'lucide-react';
import { useFounderWorkspace } from '../../context/FounderWorkspaceContext';

const ACCENT = '#C1AEFF';

const INDUSTRY_KNOWLEDGE: Record<string, {
  emoji: string;
  tagline: string;
  marketSize: string;
  cagr: string;
  keyTrends: string[];
  keyMetrics: string[];
}> = {
  fintech: {
    emoji: '💳',
    tagline: 'Reshaping global finance with software',
    marketSize: '$310B',
    cagr: '16.8%',
    keyTrends: ['Embedded finance', 'Open banking APIs', 'BNPL consolidation', 'Crypto regulation clarity'],
    keyMetrics: ['CAC/LTV ratio', 'Payment volume GMV', 'Monthly active wallets', 'Transaction success rate'],
  },
  healthtech: {
    emoji: '🏥',
    tagline: 'Digital health and medical intelligence',
    marketSize: '$280B',
    cagr: '18.6%',
    keyTrends: ['AI diagnostics', 'Remote patient monitoring', 'Value-based care', 'Mental health SaaS'],
    keyMetrics: ['Patient engagement rate', 'Clinical outcome delta', 'Provider adoption', 'Claims processing speed'],
  },
  edtech: {
    emoji: '🎓',
    tagline: 'Reimagining how the world learns',
    marketSize: '$85B',
    cagr: '13.4%',
    keyTrends: ['AI tutoring', 'Micro-credentials', 'Skills-based hiring', 'Corporate L&D automation'],
    keyMetrics: ['Course completion rate', 'Learning velocity', 'Skills assessment accuracy', 'Employer placement rate'],
  },
  retailtech: {
    emoji: '🛒',
    tagline: 'Commerce intelligence at every touchpoint',
    marketSize: '$200B',
    cagr: '14.2%',
    keyTrends: ['Unified commerce', 'AI merchandising', 'Social commerce', 'Sustainable supply chains'],
    keyMetrics: ['GMV growth', 'Cart abandonment rate', 'Average order value', 'Customer repeat rate'],
  },
  proptech: {
    emoji: '🏗️',
    tagline: 'Smart buildings and digital real estate',
    marketSize: '$18B',
    cagr: '15.8%',
    keyTrends: ['AI valuations', 'Fractional ownership', 'Smart building IoT', 'Short-term rental platforms'],
    keyMetrics: ['Deal velocity', 'Occupancy rate', 'Cost per lead', 'AUM under management'],
  },
  legaltech: {
    emoji: '⚖️',
    tagline: 'Automating legal work and access to justice',
    marketSize: '$27B',
    cagr: '9.5%',
    keyTrends: ['Contract AI', 'E-discovery automation', 'Legal AI assistants', 'Access-to-justice platforms'],
    keyMetrics: ['Hours saved per attorney', 'Contract review speed', 'Error reduction rate', 'Matter resolution time'],
  },
  cleantech: {
    emoji: '🌱',
    tagline: 'Technology for a net-zero future',
    marketSize: '$150B',
    cagr: '22.1%',
    keyTrends: ['Grid-scale storage', 'Carbon credit markets', 'EV infrastructure', 'Green hydrogen'],
    keyMetrics: ['Carbon offset per $ invested', 'Energy cost reduction %', 'Renewable penetration', 'Carbon credit price'],
  },
  saas: {
    emoji: '☁️',
    tagline: 'The backbone of the modern enterprise',
    marketSize: '$800B',
    cagr: '18.4%',
    keyTrends: ['AI-native SaaS', 'Usage-based pricing', 'Product-led growth', 'Vertical SaaS consolidation'],
    keyMetrics: ['ARR growth rate', 'Net Revenue Retention', 'CAC payback period', 'Magic Number'],
  },
  ai: {
    emoji: '🤖',
    tagline: 'Intelligence as infrastructure',
    marketSize: '$450B',
    cagr: '36.8%',
    keyTrends: ['Agentic AI', 'Multimodal models', 'AI at the edge', 'Compound AI systems'],
    keyMetrics: ['Token cost per query', 'Model accuracy benchmarks', 'Inference latency', 'Compute efficiency'],
  },
  cybersecurity: {
    emoji: '🔐',
    tagline: 'Zero trust in every system',
    marketSize: '$160B',
    cagr: '12.3%',
    keyTrends: ['AI-powered SOC', 'Zero Trust architecture', 'Supply chain security', 'Autonomous threat response'],
    keyMetrics: ['Mean time to detect (MTTD)', 'False positive rate', 'Patch velocity', 'Security posture score'],
  },
  mobility: {
    emoji: '🚗',
    tagline: 'Moving people and goods, intelligently',
    marketSize: '$70B',
    cagr: '11.7%',
    keyTrends: ['Autonomous Level 4 deployments', 'Fleet electrification', 'MaaS platforms', 'Last-mile logistics AI'],
    keyMetrics: ['Utilization rate', 'Cost per mile', 'On-time delivery %', 'Fleet downtime'],
  },
  foodtech: {
    emoji: '🍽️',
    tagline: 'The future of food production and delivery',
    marketSize: '$340B',
    cagr: '8.9%',
    keyTrends: ['Alt-protein scale-up', 'Ghost kitchen networks', 'Precision fermentation', 'Regenerative agriculture tech'],
    keyMetrics: ['Food waste reduction %', 'Order fulfillment time', 'Customer reorder rate', 'COGS as % of revenue'],
  },
  hrtech: {
    emoji: '👥',
    tagline: 'People intelligence and workforce automation',
    marketSize: '$30B',
    cagr: '10.4%',
    keyTrends: ['AI recruiting', 'Skills-based org design', 'Continuous performance management', 'Financial wellness benefits'],
    keyMetrics: ['Time-to-hire', 'Employee engagement score', 'Retention rate', 'Offer acceptance rate'],
  },
  martech: {
    emoji: '📣',
    tagline: 'Data-driven growth at every touchpoint',
    marketSize: '$500B',
    cagr: '14.9%',
    keyTrends: ['CDPs replacing DMPs', 'Cookieless attribution', 'Generative content at scale', 'Conversational commerce'],
    keyMetrics: ['ROAS', 'CAC by channel', 'Email open rate', 'Attribution window accuracy'],
  },
  gaming: {
    emoji: '🎮',
    tagline: 'Interactive entertainment and virtual worlds',
    marketSize: '$200B',
    cagr: '12.6%',
    keyTrends: ['Generative game content', 'Cloud gaming infrastructure', 'AI NPCs', 'Creator economy integration'],
    keyMetrics: ['DAU/MAU ratio', 'ARPU', 'Day-7 retention', 'Session length'],
  },
  spacetech: {
    emoji: '🚀',
    tagline: 'Humanity\'s expansion beyond Earth',
    marketSize: '$400B',
    cagr: '9.6%',
    keyTrends: ['Low-cost launch vehicles', 'Satellite mega-constellations', 'In-orbit servicing', 'Earth observation AI'],
    keyMetrics: ['Launch cost per kg to orbit', 'Satellite uptime %', 'Data latency', 'Revenue per satellite'],
  },
};

function getKnowledge(name: string) {
  const lower = name.toLowerCase().replace(/[^a-z]/g, '');
  const key = Object.keys(INDUSTRY_KNOWLEDGE).find(k => lower.includes(k) || k.includes(lower.slice(0, 5)));
  return key ? INDUSTRY_KNOWLEDGE[key] : null;
}

export function WorkspaceUniverseCanvas() {
  const { entryContext, setEntryContext } = useFounderWorkspace();
  const [search, setSearch] = useState('');
  const [expandedIndustry, setExpandedIndustry] = useState<string | null>(null);

  const industries = entryContext?.subdomains ?? [];
  const totalCompanies = entryContext?.totalCompanyCount ?? 0;
  const totalIndustries = industries.length;

  const filtered = useMemo(() => {
    if (!search.trim()) return industries;
    const q = search.toLowerCase();
    return industries.filter(i => i.name.toLowerCase().includes(q));
  }, [industries, search]);

  const handleDrillIntoIndustry = (ind: { id: string; name: string; color?: string; description?: string; companyCount: number }) => {
    const fullInd = entryContext?.allIndustries?.find(i => i.id === ind.id);
    setEntryContext({
      level: 'industry',
      industryId: ind.id,
      industryName: ind.name,
      industryColor: ind.color ?? ACCENT,
      industryDescription: ind.description,
      subdomains: fullInd?.subdomains.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        companyCount: s.companies.length,
        color: ind.color ?? ACCENT,
      })) ?? [],
      totalCompanyCount: fullInd?.subdomains.reduce((sum, s) => sum + s.companies.length, 0) ?? 0,
      allIndustries: entryContext?.allIndustries,
    });
  };

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide flex flex-col gap-5 pb-6 pr-1">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 rounded-2xl p-5 border border-white/8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(193,174,255,0.08) 0%, rgba(255,255,255,0.02) 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 80% 50%, rgba(193,174,255,0.1) 0%, transparent 65%)',
        }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Globe2 className="w-5 h-5" style={{ color: ACCENT }} />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Universe Workspace</span>
          </div>
          <h2 className="text-2xl font-bold text-white leading-tight">Innovation Ecosystem</h2>
          <p className="text-sm text-white/45 mt-1 max-w-lg">
            {totalIndustries} industry verticals · {totalCompanies} companies. Click any industry to explore its subdomains.
          </p>
          <div className="flex items-center gap-4 mt-4">
            {[
              { label: 'Industries', value: totalIndustries, icon: Layers },
              { label: 'Companies', value: totalCompanies, icon: Building2 },
              { label: 'Avg CAGR', value: '14.6%', icon: TrendingUp },
              { label: 'Global Market', value: '$3.2T', icon: DollarSign },
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

      {/* ── Cross-industry Signals ─────────────────────────────────────── */}
      <div className="shrink-0">
        <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/35 mb-2.5 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
          Cross-Industry Signals
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'AI × FinTech', desc: 'Risk scoring, fraud detection, and autonomous trading driving massive M&A', color: '#60a5fa' },
            { label: 'HealthTech × AI', desc: 'Diagnostic AI and clinical decision support entering FDA fast-track', color: '#34d399' },
            { label: 'CleanTech × SaaS', desc: 'ESG reporting mandates driving vertical SaaS unicorn formation', color: '#4ade80' },
            { label: 'HR × AI', desc: 'Agentic AI recruiters replacing ATS — skills-first hiring is the new norm', color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 border border-white/8 bg-white/[0.02] flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-[11px] font-bold" style={{ color: s.color }}>{s.label}</span>
              </div>
              <p className="text-[10px] text-white/45 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Industry Grid ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/35 flex items-center gap-1.5">
            <Globe2 className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            Industry Verticals
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter industries…"
              className="pl-7 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white placeholder-white/25 outline-none focus:border-white/20 w-44"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map(ind => {
            const knowledge = getKnowledge(ind.name);
            const isExpanded = expandedIndustry === ind.id;
            return (
              <div
                key={ind.id}
                className="rounded-xl border border-white/8 overflow-hidden transition-all"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                {/* Row — clicking row body expands; clicking arrow navigates */}
                <div className="w-full flex items-center gap-3 px-4 py-3 group hover:bg-white/[0.03] transition-all">
                  <button
                    type="button"
                    onClick={() => setExpandedIndustry(isExpanded ? null : ind.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <span className="text-xl shrink-0">{knowledge?.emoji ?? '🏭'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{ind.name}</span>
                        {knowledge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${ind.color ?? ACCENT}1a`, color: ind.color ?? ACCENT, border: `1px solid ${ind.color ?? ACCENT}30` }}>
                            {knowledge.cagr} CAGR
                          </span>
                        )}
                      </div>
                      {knowledge && <p className="text-[10px] text-white/35 mt-0.5 truncate">{knowledge.tagline}</p>}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-[10px] text-white/35">
                      <Building2 className="w-3 h-3" />
                      <span>{ind.companyCount}</span>
                    </div>
                    {knowledge && (
                      <div className="text-[10px] font-semibold text-white/50">{knowledge.marketSize}</div>
                    )}
                    {/* Expand toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedIndustry(isExpanded ? null : ind.id)}
                      className="p-1 rounded-lg hover:bg-white/[0.06] transition-all"
                    >
                      <ChevronRight
                        className="w-3.5 h-3.5 text-white/25 transition-transform"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      />
                    </button>
                  </div>
                </div>

                {isExpanded && knowledge && (
                  <div className="px-4 pb-4 pt-0 border-t border-white/[0.06]">
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1.5 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Key Trends
                        </div>
                        <ul className="space-y-1">
                          {knowledge.keyTrends.map(t => (
                            <li key={t} className="flex items-start gap-1.5 text-[10px] text-white/55">
                              <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: ind.color ?? ACCENT }} />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1.5 flex items-center gap-1">
                          <Star className="w-3 h-3" /> Key Metrics to Track
                        </div>
                        <ul className="space-y-1">
                          {knowledge.keyMetrics.map(m => (
                            <li key={m} className="flex items-start gap-1.5 text-[10px] text-white/55">
                              <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: '#fbbf24' }} />
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {/* Navigate into this industry */}
                    <button
                      type="button"
                      onClick={() => handleDrillIntoIndustry(ind)}
                      className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                      style={{ background: `${ind.color ?? ACCENT}1a`, color: ind.color ?? ACCENT, border: `1px solid ${ind.color ?? ACCENT}30` }}
                    >
                      <ArrowRight className="w-3 h-3" />
                      Explore {ind.name} Workspace
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-white/30 text-sm">No industries match "{search}"</div>
          )}
        </div>
      </div>

      {/* ── Global Macro Context ────────────────────────────────────────── */}
      <div className="shrink-0 rounded-xl p-4 border border-white/8 bg-white/[0.02]">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-3 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Macro Context
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Global VC deployed (2025)', value: '$340B' },
            { label: 'Active unicorns', value: '1,240+' },
            { label: 'YoY startup formation', value: '+8.4%' },
          ].map(s => (
            <div key={s.label} className="rounded-lg p-2 bg-white/[0.02] border border-white/[0.06]">
              <div className="text-base font-bold text-white">{s.value}</div>
              <div className="text-[9px] text-white/30 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
