import {
  ArrowRight,
  Hexagon,
  BarChart3,
  GitBranch,
  Target,
  Shield,
  Users,
  Layers,
  TrendingUp,
  Network,
  Handshake,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useCompany } from '../lib/db/companies';
import { INDUSTRIES } from '../db/industries';
import { companyInfo } from '../data/mockData';

/* ── features list ── */
const features = [
  {
    icon: GitBranch,
    title: '3D Digital Twin',
    desc: 'A living, interactive graph of your startup — industries, departments, KPIs, and signals all connected in real-time.',
    route: '/twin',
  },
  {
    icon: Target,
    title: 'Strategy Engine',
    desc: 'Set goals, track alignment across teams, and simulate scenarios against real market data.',
    route: '/twin/strategy',
  },
  {
    icon: BarChart3,
    title: 'Benchmarking',
    desc: 'Compare your metrics against stage-matched cohorts. Know where you stand before investors ask.',
    route: '/twin/benchmarks',
  },
  {
    icon: Shield,
    title: 'Decision Intelligence',
    desc: 'Structured decision flows with weighted inputs, trade-off analysis, and full audit trails.',
    route: '/twin',
  },
  {
    icon: Users,
    title: 'Team & RBAC',
    desc: 'Role-based access per department. Everyone sees what matters to them — nothing more, nothing less.',
    route: '/twin/team',
  },
  {
    icon: Handshake,
    title: 'VC & Mentor Connect',
    desc: 'Investor pipeline tracking, monthly updates, and structured mentor session workflows.',
    route: '/ecosystem/vc-connect',
  },
  {
    icon: Network,
    title: 'Startup Network',
    desc: 'Peer-to-peer connections for outsourcing, partnerships, referrals, and anonymous benchmarking.',
    route: '/ecosystem/network',
  },
  {
    icon: Layers,
    title: 'Data Ingestion',
    desc: 'Pull from Stripe, GitHub, Slack, Google Analytics and more — your twin stays in sync automatically.',
    route: '/twin/data',
  },
];

/* ── evolution stages ── */
const stages = [
  { label: 'Digital Twin', done: true },
  { label: 'Strategy', done: true },
  { label: 'Decisions', done: true },
  { label: 'Team & RBAC', done: true },
  { label: 'Investor Layer', done: true },
  { label: 'Network', done: true },
  { label: 'IPO Readiness', done: false },
];

/* ── quick stats (fallback only, real data injected in component) ── */
const fallbackStats = [
  { label: 'Stage', value: companyInfo.stage },
  { label: 'Team', value: `${companyInfo.teamSize}` },
  { label: 'MRR', value: `$${companyInfo.mrr.toLocaleString()}` },
  { label: 'Runway', value: companyInfo.runway },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { company } = useCompany(profile?.company_id);
  const isAuthed = !!user;
  const hasCompany = !!profile?.company_id;

  const industryLabel = company?.industry_id
    ? INDUSTRIES.find(i => i.id === company.industry_id)?.label ?? ''
    : '';

  const stats = company ? [
    { label: 'Company', value: company.name },
    { label: 'Stage',   value: company.stage },
    { label: 'Industry', value: industryLabel },
    { label: 'Team',    value: company.employees ? `${company.employees} people` : '—' },
    ...(company.mrr_usd ? [{ label: 'MRR', value: `$${Number(company.mrr_usd).toLocaleString()}` }] : []),
  ] : fallbackStats;

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Hero ── */}
      <section className="pt-8 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)' }}>
            <Hexagon className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {company ? company.name : 'FounderOS'}
            </h1>
            <p className="text-sm" style={{ color: '#5E5E5E' }}>
              {company
                ? `${company.stage} · ${industryLabel} · ${company.country}`
                : 'The operating system for your startup'}
            </p>
          </div>
        </div>

        <p className="text-lg max-w-2xl leading-relaxed mb-8" style={{ color: '#5E5E5E' }}>
          {company
            ? company.description ?? 'Your digital twin is live. Explore the graph, track your KPIs, and benchmark against the market.'
            : 'A digital twin of your company — connecting strategy, operations, team, and market signals into a single living model. Make better decisions, faster.'}
        </p>

        <div className="flex items-center gap-4 mb-10">
          {isAuthed && hasCompany ? (
            <>
              <button
                onClick={() => navigate('/twin')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)', color: '#161618' }}
              >
                Open Twin <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/overview')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all"
                style={{ background: '#1B1B1D', color: '#5E5E5E' }}
              >
                Dashboard
              </button>
            </>
          ) : isAuthed ? (
            <button
              onClick={() => navigate('/onboarding')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)', color: '#161618' }}
            >
              Set up your company <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/auth')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)', color: '#161618' }}
              >
                Get started free <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all"
                style={{ background: '#1B1B1D', color: '#5E5E5E' }}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        {/* Quick stats strip */}
        <div className="flex gap-6">
          {stats.map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
              <span className="text-sm font-semibold text-white">{value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="pb-12">
        <h2 className="text-lg font-semibold text-white mb-1">What&apos;s inside</h2>
        <p className="text-sm text-slate-500 mb-6">Everything you need to run your startup with clarity.</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                onClick={() => navigate(f.route)}
                className="glass-card p-5 cursor-pointer hover:border-slate-600/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-sky-500/8 border border-sky-500/10 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-sky-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{f.desc}</p>
                <span className="flex items-center gap-1 text-[10px] text-sky-400 group-hover:text-sky-300 transition-colors">
                  Open <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Evolution timeline ── */}
      <section className="pb-12">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-400" />
          Platform Evolution
        </h2>
        <div className="glass-card p-6">
          <div className="flex items-center">
            {stages.map((s, i) => (
              <div key={s.label} className="flex items-center flex-1">
                <div className="flex flex-col items-center text-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                    s.done
                      ? 'bg-teal-500/15 border border-teal-500/30'
                      : 'bg-slate-800/60 border border-slate-700/40'
                  }`}>
                    {s.done ? (
                      <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    ) : (
                      <span className="text-xs text-slate-500">{i + 1}</span>
                    )}
                  </div>
                  <p className={`text-[11px] font-medium ${s.done ? 'text-white' : 'text-slate-500'}`}>{s.label}</p>
                </div>
                {i < stages.length - 1 && (
                  <div className={`h-px w-full mt-[-24px] ${
                    s.done && stages[i + 1].done ? 'bg-teal-500/30' : 'bg-slate-700/30'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="pb-12">
        <div className="glass-card p-8 text-center">
          <h3 className="text-lg font-bold text-white mb-2">From Idea to IPO</h3>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed mb-5">
            FounderOS gives startups continuous strategic alignment, faster decisions, institutional memory,
            and credible investor workflows — all built on a single digital twin.
          </p>
          <button
            onClick={() => navigate('/twin')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
          >
            Explore Your Twin <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
