
import { useCallback, useMemo, useState } from 'react';
import {
  X, ChevronRight, Zap, Target, Check,
  Users, BookOpen, TrendingUp, Shield, DollarSign, Search,
  FileText, Send, BarChart2, AlertTriangle, Rocket,
  Star, Briefcase, Globe, Lock, Activity,
  Bookmark, BookmarkCheck, ExternalLink,
} from 'lucide-react';
import type { PlanetActionNode, PlanetBranchNode, PlanetRootNode, CompanyPlanetContext } from '../../data/companyPlanetRoots';
import { resolveVariant } from './actionWorkspaceData';
import { useSavedWorkflows } from '../../lib/useSavedWorkflows';

export interface ActionNodeWorkspaceProps {
  actionNode: PlanetActionNode;
  branchNode: PlanetBranchNode;
  rootNode: PlanetRootNode;
  context: CompanyPlanetContext;
  onClose: () => void;
  fullScreen?: boolean;
  isOpen?: boolean;
  /** True when opened from a node already in the workspace — hides the redundant Export button. */
  embedded?: boolean;
}

function getModeColors(role: string, rootColor: string) {
  if (role === 'career') return { primary: '#60a5fa', secondary: '#a78bfa', glow: '#3b82f6' };
  if (role === 'founder') return { primary: '#f97316', secondary: '#fb923c', glow: '#ea580c' };
  if (role === 'investor') return { primary: '#22d3ee', secondary: '#34d399', glow: '#06b6d4' };
  return { primary: rootColor, secondary: rootColor, glow: rootColor };
}

function GlassCard({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; }) {
  return (
    <div className={`anw-glass-card ${className}`} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px', ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon?: any }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className="w-3.5 h-3.5 text-white/40" />}
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">{children}</span>
    </div>
  );
}

const VARIANT_ICONS: Record<string, any> = {
  'role-shortlist': Target,
  'app-plan': Send,
  'learning-plan': BookOpen,
  'portfolio-project': Briefcase,
  'outreach': Users,
  'interview-prep': FileText,
  'pricing-compare': DollarSign,
  'feature-matrix': Star,
  'customer-interview': Users,
  'intro-request': Globe,
  'growth-tracker': TrendingUp,
  'moat-analysis': Shield,
  'mitigation-plan': AlertTriangle,
  'benchmark': BarChart2,
  'data-room': Lock,
  'contact-map': Users,
  'gtm-launch': Rocket,
  'market-gap': Search,
  'portfolio-health': Activity,
  'exit-analysis': DollarSign,
  'generic': Zap,
};

function ActionWorkspaceBody({
  actionNode, branchNode, rootNode, context, colors, Icon, steps, done, onToggle, pct,
}: {
  actionNode: PlanetActionNode;
  branchNode: PlanetBranchNode;
  rootNode: PlanetRootNode;
  context: CompanyPlanetContext;
  colors: { primary: string; secondary: string; glow: string };
  Icon: any;
  steps: { id: string; label: string }[];
  done: Record<string, boolean>;
  onToggle: (id: string) => void;
  pct: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* objective hero */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${colors.primary}14, rgba(255,255,255,0.02))`, border: `1px solid ${colors.primary}30` }}
      >
        <div className="absolute -top-16 -right-12 w-52 h-52 rounded-full pointer-events-none opacity-40" style={{ background: `radial-gradient(circle, ${colors.primary}40, transparent 70%)` }} />
        <div className="flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-xl grid place-items-center shrink-0" style={{ background: `${colors.primary}1f`, border: `1px solid ${colors.primary}3a` }}>
            <Icon className="w-6 h-6" style={{ color: colors.primary }} />
          </div>
          <div>
            <SectionTitle icon={Zap}>Objective</SectionTitle>
            <h2 className="text-xl font-bold text-white leading-snug">{actionNode.label}</h2>
            <p className="text-[13px] text-white/60 leading-relaxed mt-2 max-w-2xl">
              {actionNode.hint || `Complete this ${branchNode.label || 'workflow'} step to advance ${rootNode.label} for ${context.companyName}.`}
            </p>
          </div>
        </div>
      </div>

      {/* interactive steps */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle icon={Target}>Steps to complete</SectionTitle>
          <span className="text-xs font-bold tabular-nums" style={{ color: colors.primary }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-4">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
        </div>
        <div className="space-y-2">
          {steps.map((s, i) => {
            const checked = !!done[s.id];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onToggle(s.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:brightness-110"
                style={{ background: checked ? `${colors.primary}12` : 'rgba(255,255,255,0.02)', border: `1px solid ${checked ? colors.primary + '33' : 'rgba(255,255,255,0.06)'}` }}
              >
                <span className="w-5 h-5 rounded-md grid place-items-center shrink-0 transition-all" style={{ background: checked ? colors.primary : 'transparent', border: `1.5px solid ${checked ? colors.primary : 'rgba(255,255,255,0.25)'}` }}>
                  {checked && <Check className="w-3 h-3 text-black/80" strokeWidth={3} />}
                </span>
                <span className={`text-[13px] ${checked ? 'text-white/40 line-through' : 'text-white/80'}`}>{i + 1}. {s.label}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* context grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard>
          <SectionTitle icon={Activity}>Why this matters</SectionTitle>
          <p className="text-[13px] text-white/60 leading-relaxed">
            {rootNode.description || `This action supports your ${context.roleLabel} objectives by strengthening ${rootNode.label}.`}
          </p>
        </GlassCard>
        <GlassCard>
          <SectionTitle icon={Briefcase}>Definition of done</SectionTitle>
          <p className="text-[13px] text-white/60 leading-relaxed">
            A clear, shareable {branchNode.label || 'work'} output for “{actionNode.label}”, ready to convert into a task or decision.
          </p>
        </GlassCard>
      </div>

      {/* assist footer */}
      <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: `${colors.primary}0d`, border: `1px solid ${colors.primary}26` }}>
        <Zap className="w-4 h-4 shrink-0" style={{ color: colors.primary }} />
        <p className="text-[12px] text-white/55">
          Use <span className="text-white/80 font-medium">Export To Workspace</span> to bring this node onto your canvas — chat with it, convert it into a task, or assign it.
        </p>
      </div>
    </div>
  );
}
function PricingComparePanel() {
  return (
    <div className="flex flex-col gap-5">
      <GlassCard>
        <SectionTitle icon={DollarSign}>Pricing Comparison</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          
          {/* Your Company */}
          <div className="rounded-xl p-5" style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Your Product</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-orange-400 bg-orange-400/10 border border-orange-400/20">All Segments</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">$299<span className="text-sm font-normal text-white/50">/mo</span></div>
                <div className="text-xs text-orange-400/70 mt-1">17% annual discount</div>
              </div>
            </div>
            
            <div className="space-y-3 mt-6">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Key Features</p>
              {['API Access', 'SSO', 'AI Reports', '24/7 Support', 'Custom Integrations'].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                  <span className="text-orange-400">✓</span> {f}
                </div>
              ))}
            </div>
          </div>

          {/* Competitor */}
          <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
             <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Competitor A</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white/50 bg-white/5 border border-white/10">Enterprise</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white/80">$499<span className="text-sm font-normal text-white/40">/mo</span></div>
                <div className="text-xs text-white/40 mt-1">20% annual discount</div>
              </div>
            </div>
            
            <div className="space-y-3 mt-6">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Key Features</p>
              {['API Access', 'SSO', 'Custom Reports', 'Priority Support'].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                  <span className="text-white/30">✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 rounded-xl" style={{ background: 'linear-gradient(to right, rgba(249,115,22,0.1), transparent)', borderLeft: '2px solid #f97316' }}>
          <p className="text-sm text-white/80">
            <strong className="text-orange-400">Insight:</strong> Your product offers AI Reports and Custom Integrations for $200 less per month compared to Competitor A's Enterprise tier. This is a strong wedge for price-sensitive mid-market companies.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
function CustomerInterviewPanel() {
  const dummyInterviews = [
    { name: 'Sarah J.', role: 'VP Operations', company: 'Logistix', painPoint: 'Manual data entry takes 15h/week.', status: 'Completed' },
    { name: 'Marcus T.', role: 'Director of IT', company: 'HealthSync', painPoint: 'Compliance reporting is a nightmare.', status: 'Scheduled' },
    { name: 'Elena R.', role: 'Founder', company: 'TechStart', painPoint: 'Cannot afford enterprise tools, using spreadsheets.', status: 'Pending' }
  ];

  return (
    <div className="flex flex-col gap-5">
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle icon={Users}>Operator Interviews</SectionTitle>
          <button className="px-3 py-1.5 bg-sky-500/20 text-sky-400 text-xs font-semibold rounded-lg border border-sky-500/30 hover:bg-sky-500/30 transition-colors">
            + New Interview
          </button>
        </div>
        
        <p className="text-[13px] text-white/60 leading-relaxed mb-6">
          Validate the pain point by talking to 10 operators in the SMB segment. Focus on current workarounds and willingness to pay.
        </p>

        <div className="space-y-3">
          {dummyInterviews.map((interview, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl transition-colors hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sky-400 font-bold bg-sky-500/10 border border-sky-500/20">
                  {interview.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{interview.name} <span className="text-white/40 font-normal">at {interview.company}</span></div>
                  <div className="text-xs text-white/50 mt-0.5">{interview.role}</div>
                </div>
              </div>
              
              <div className="flex-1 px-8">
                <p className="text-xs text-white/70 italic border-l-2 border-sky-500/30 pl-3">"{interview.painPoint}"</p>
              </div>

              <div>
                 <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    interview.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    interview.status === 'Scheduled' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                    'bg-white/5 text-white/40 border border-white/10'
                 }`}>
                   {interview.status}
                 </span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

export function ActionNodeWorkspace({ actionNode, branchNode, rootNode, context, onClose, fullScreen = false, isOpen = true, embedded = false }: ActionNodeWorkspaceProps) {
  const colors = getModeColors(context.role, rootNode.color);
  const variant = resolveVariant(rootNode.label, branchNode.label, actionNode.label);
  const PanelIcon = VARIANT_ICONS[variant] ?? Zap;

  const isGenericBody = variant !== 'pricing-compare' && variant !== 'customer-interview';
  const steps = useMemo(() => ([
    { id: 's1', label: `Review the context behind “${actionNode.label}”` },
    { id: 's2', label: 'Gather the inputs, data, and people you need' },
    { id: 's3', label: `Draft your ${branchNode.label || 'work'} output` },
    { id: 's4', label: 'Validate, refine, and mark complete' },
  ]), [actionNode.label, branchNode.label]);
  const [stepsDone, setStepsDone] = useState<Record<string, boolean>>({});
  const stepsPct = Math.round((steps.filter(s => stepsDone[s.id]).length / steps.length) * 100);
  const toggleStep = (id: string) => setStepsDone(d => ({ ...d, [id]: !d[id] }));

  // ── Save workflow ────────────────────────────────────────────────────────
  const { save, has, getId, remove } = useSavedWorkflows();

  const lookup = {
    companyId: context.companyId,
    role: context.role,
    rootId: rootNode.id,
    branchId: branchNode.id,
    actionId: actionNode.id,
  };

  const alreadySaved = has(lookup);

  const [exported, setExported] = useState(false);

  // ── Export to Workspace ──────────────────────────────────────────────────
  // Persists this node as a workspace card, then opens the product workspace
  // focused on it (works both inline on /3d and from a standalone tab).
  const handleExport = useCallback(() => {
    const saved = save({
      level: 'action',
      companyId: context.companyId,
      companyName: context.companyName,
      role: context.role,
      roleLabel: context.roleLabel,
      rootId: rootNode.id,
      rootLabel: rootNode.label,
      rootColor: rootNode.color,
      rootDescription: rootNode.description,
      branchId: branchNode.id,
      branchLabel: branchNode.label,
      actionId: actionNode.id,
      actionLabel: actionNode.label,
      actionHint: actionNode.hint,
    });
    try { localStorage.setItem('ws_pending_node_v1', saved.id); } catch { /* storage full */ }
    setExported(true);

    if (window.opener && !window.opener.closed) {
      // standalone tab → tell the universe to open the workspace, then close
      window.opener.postMessage({ type: 'EXPORT_TO_WORKSPACE', savedId: saved.id }, '*');
      window.setTimeout(() => window.close(), 380);
    } else {
      // inline on /3d → ask the host to open the product workspace
      window.dispatchEvent(new CustomEvent('request-open-workspace'));
      window.setTimeout(() => onClose(), 380);
    }
  }, [save, context, rootNode, branchNode, actionNode, onClose]);

  const handleToggleSave = useCallback(() => {
    if (alreadySaved) {
      const id = getId(lookup);
      if (id) remove(id);
    } else {
      save({
        level: 'action',
        companyId: context.companyId,
        companyName: context.companyName,
        role: context.role,
        roleLabel: context.roleLabel,
        rootId: rootNode.id,
        rootLabel: rootNode.label,
        rootColor: rootNode.color,
        rootDescription: rootNode.description,
        branchId: branchNode.id,
        branchLabel: branchNode.label,
        actionId: actionNode.id,
        actionLabel: actionNode.label,
        actionHint: actionNode.hint,
      });
    }
  }, [alreadySaved, save, remove, getId, lookup.companyId, lookup.role, lookup.rootId, lookup.branchId, lookup.actionId, context, rootNode, branchNode, actionNode]);


  return (
    <div 
      className={
        fullScreen
          ? "absolute inset-0 w-full h-full text-white cosmos-bg flex flex-col z-50 overflow-hidden"
          : "absolute top-0 right-0 h-full w-[75vw] text-white flex flex-col z-50 overflow-hidden rounded-l-2xl"
      }
      style={
        fullScreen
          ? {}
          : { 
              background: 'rgba(10, 10, 14, 0.90)', 
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
              transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            }
      }
    >
      {/* Dynamic ambient glow based on rootNode color */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20" 
        style={{ 
          background: `radial-gradient(circle at 50% -20%, ${colors.primary}40 0%, transparent 60%), 
                       radial-gradient(circle at 120% 80%, ${colors.secondary}30 0%, transparent 50%)` 
        }} 
      />

      {/* Top Header Navigation */}
      <header className={`relative z-10 shrink-0 px-8 py-5 flex items-center justify-between border-b ${!fullScreen ? 'rounded-tl-2xl' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(24px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg" style={{ background: `linear-gradient(135deg, ${colors.primary}33, ${colors.secondary}22)`, border: `1px solid ${colors.primary}44`, boxShadow: `0 0 20px ${colors.primary}20` }}>
            <PanelIcon className="w-5 h-5" style={{ color: colors.primary }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest" style={{ background: `${colors.primary}22`, color: colors.primary, border: `1px solid ${colors.primary}44` }}>
                {context.roleLabel}
              </span>
              <span className="text-white/20 text-[10px]">/</span>
              <span className="text-[11px] text-white/40 uppercase tracking-wider">{context.companyName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span style={{ color: rootNode.color }}>{rootNode.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/20" />
              <span className="text-white/60">{branchNode.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/20" />
              <span className="text-white drop-shadow-md">{actionNode.label}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Export to Workspace — only when opening a node fresh from the IDT
              universe (redundant when already inside the product workspace). */}
          {!embedded && (
            <button
              type="button"
              onClick={handleExport}
              disabled={exported}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110 shrink-0 disabled:opacity-80"
              style={{
                background: 'linear-gradient(135deg, rgba(249,198,255,0.15), rgba(193,174,255,0.1))',
                border: '1px solid rgba(193,174,255,0.3)',
                color: '#EDD9FF',
                boxShadow: '0 0 16px rgba(193,174,255,0.15)',
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {exported ? 'Exported ✓' : 'Export To Workspace'}
            </button>
          )}

          {/* Save Workflow button */}
          <button
            type="button"
            onClick={handleToggleSave}
            className="px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all duration-300"
            style={{
              background: alreadySaved
                ? `${colors.primary}18`
                : `rgba(255,255,255,0.04)`,
              border: alreadySaved
                ? `1px solid ${colors.primary}40`
                : '1px solid rgba(255,255,255,0.1)',
              color: alreadySaved
                ? colors.primary
                : 'rgba(255,255,255,0.6)',
              boxShadow: alreadySaved
                ? `0 0 16px ${colors.primary}20`
                : 'none',
              transform: alreadySaved ? 'scale(1.02)' : 'scale(1)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = alreadySaved ? `${colors.primary}28` : 'rgba(255,255,255,0.08)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = alreadySaved ? `${colors.primary}18` : 'rgba(255,255,255,0.04)';
            }}
          >
            <div className={`transition-transform duration-300 ${alreadySaved ? 'scale-110' : 'scale-100'}`}>
              {alreadySaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            </div>
            <span className="whitespace-nowrap">{alreadySaved ? 'Saved' : 'Save Workflow'}</span>
          </button>

          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all hover:bg-white/10" 
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
          >
            <X className="w-3.5 h-3.5" />
            Close Workspace
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        
        {/* Left Sidebar (Action Info & Context) */}
        <div className={`w-80 shrink-0 flex flex-col border-r ${!fullScreen ? 'rounded-bl-2xl' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(10,10,14,0.4)', backdropFilter: 'blur(16px)' }}>
          <div className="p-6 flex-1 overflow-y-auto scrollbar-hide">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2 leading-tight" style={{ textShadow: `0 0 30px ${colors.primary}40` }}>
              {actionNode.label}
            </h1>
            {actionNode.hint && (
              <p className="text-sm leading-relaxed mb-8" style={{ color: colors.primary + 'aa' }}>
                {actionNode.hint}
              </p>
            )}

            <div className="space-y-4">
              {isGenericBody && (
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <SectionTitle icon={Activity as any}>Task Status</SectionTitle>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${stepsPct}%`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
                    </div>
                    <span className="text-xs font-medium text-white/50 tabular-nums">{stepsPct}%</span>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <SectionTitle icon={Briefcase as any}>Branch Context</SectionTitle>
                <p className="text-xs text-white/50 leading-relaxed">
                  This task is part of the <strong>{branchNode.label}</strong> workflow, optimizing your {context.role} objectives.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area (Dynamic Panels) */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-hide relative">
          <div className="max-w-5xl mx-auto">
            {variant === 'pricing-compare' ? (
              <PricingComparePanel />
            ) : variant === 'customer-interview' ? (
              <CustomerInterviewPanel />
            ) : (
              <ActionWorkspaceBody
                actionNode={actionNode}
                branchNode={branchNode}
                rootNode={rootNode}
                context={context}
                colors={colors}
                Icon={PanelIcon}
                steps={steps}
                done={stepsDone}
                onToggle={toggleStep}
                pct={stepsPct}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}