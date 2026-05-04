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
  X,
  Building2,
  TrendingUp as VCIcon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useCompany } from '../lib/db/companies';
import { INDUSTRIES } from '../db/industries';
import { companyInfo } from '../data/mockData';

/* ── Hardcoded bypass credentials ── */
const BYPASS_EMAIL    = 'developer.cybranex@gmail.com';
const BYPASS_PASSWORD = '12345678';

type BypassRole = 'vc' | 'incubator';

function BypassSignInModal({
  role,
  onClose,
}: {
  role: BypassRole;
  onClose: () => void;
}) {
  const navigate   = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail]       = useState(BYPASS_EMAIL);
  const [password, setPassword] = useState(BYPASS_PASSWORD);
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const roleLabel = role === 'vc' ? 'VC Partner' : 'Incubator';
  const accentColor = role === 'vc' ? '#22d3ee' : '#a78bfa';
  const Icon = role === 'vc' ? VCIcon : Building2;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) { setError(err); return; }
    navigate('/3d');
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl p-8"
        style={{ background: '#1B1B1D', border: `1px solid ${accentColor}30` }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: '#5E5E5E' }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}
          >
            <Icon className="w-6 h-6" style={{ color: accentColor }} />
          </div>
          <div className="text-center">
            <h2 className="text-white text-xl font-semibold">{roleLabel} Access</h2>
            <p className="text-xs mt-1" style={{ color: '#5E5E5E' }}>
              Sign in to explore the Work OS Universe
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSignIn} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: '#5E5E5E' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: '#161618', color: '#fff', border: '1px solid rgba(255,255,255,0.06)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: '#5E5E5E' }}>Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none pr-12"
                style={{ background: '#161618', color: '#fff', border: '1px solid rgba(255,255,255,0.06)' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors hover:text-white"
                style={{ color: '#5E5E5E' }}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p
              className="text-sm rounded-xl px-4 py-3"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 mt-2"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`,
              color: '#161618',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Signing in…' : `Enter as ${roleLabel}`}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── features list ── */
const features = [
  {
    icon: GitBranch,
    title: '3D Digital Twin',
    desc: 'A living, interactive graph of your startup — industries, departments, KPIs, and signals all connected in real-time.',
    route: '/3d',
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
    route: '/3d',
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

  const [bypassRole, setBypassRole] = useState<BypassRole | null>(null);

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
      {/* ── Bypass Sign-In Modal ── */}
      {bypassRole && (
        <BypassSignInModal
          role={bypassRole}
          onClose={() => setBypassRole(null)}
        />
      )}

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

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {isAuthed && hasCompany ? (
            <>
              <button
                onClick={() => navigate('/3d')}
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

              {/* ── VC & Incubator bypass buttons ── */}
              <div className="flex items-center gap-2 ml-2">
                <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <button
                  id="vc-signin-btn"
                  onClick={() => setBypassRole('vc')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, #22d3ee22, #22d3ee11)',
                    border: '1px solid #22d3ee33',
                    color: '#22d3ee',
                  }}
                >
                  <VCIcon className="w-3.5 h-3.5" />
                  VC Sign In
                </button>
                <button
                  id="incubator-signin-btn"
                  onClick={() => setBypassRole('incubator')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, #a78bfa22, #a78bfa11)',
                    border: '1px solid #a78bfa33',
                    color: '#a78bfa',
                  }}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Incubator Sign In
                </button>
              </div>
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
            onClick={() => navigate('/3d')}
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
