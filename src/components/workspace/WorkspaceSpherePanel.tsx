import { useMemo, useState } from 'react';
import {
  Orbit, Target, Layers, CheckSquare, FileText, FolderOpen,
  TrendingUp, TrendingDown, Minus, ChevronRight, Zap,
  AlertTriangle, Scale, Clock, Plus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useProjectsStore, generateAlerts } from '../../lib/useProjectsStore';
import { useBdtMetrics, useBdtGoals, bdtMetricDisplay, bdtMetricProgress } from '../../lib/db/metrics';
import { useAuth } from '../../lib/auth';
import { useFounderWorkspace } from '../../context/FounderWorkspaceContext';
import { useCanonicalMetrics, isMetricAdmin } from '../../lib/db/canonicalMetrics';
import { useTeamMembers } from '../../lib/db/team';
import { MetricCreateWizard, MetricRollupHealthPanel } from './metrics/MetricSystem';

const ACCENT = '#C1AEFF';

/* ── stat tile ─────────────────────────────────────────────────────────────── */
function StatTile({
  icon: Icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-1 p-3.5 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/16 transition-all text-left group w-full"
    >
      <div className="flex items-center justify-between w-full">
        <Icon className="w-4 h-4" style={{ color }} />
        <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors" />
      </div>
      <div className="text-xl font-bold tabular-nums leading-none" style={{ color }}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-white/35">{label}</div>
    </button>
  );
}

/* ── main ────────────────────────────────────────────────────────────────────── */
export function WorkspaceSpherePanel() {
  const {
    projects, tasks, decisions, risks, members, files,
  } = useProjectsStore();
  const { profile, role } = useAuth();
  const companyId = profile?.company_id ?? null;
  const { goals } = useBdtGoals(companyId);
  const { metrics } = useBdtMetrics(companyId);
  const { setActiveSidebarTab, notes, departments } = useFounderWorkspace();
  const { rollups, createMetric, createDraft } = useCanonicalMetrics(companyId, { target_type: 'department', status: 'active' });
  const { members: teamMembers } = useTeamMembers(companyId);
  const canEditMetrics = isMetricAdmin(role);
  const [metricWizardTarget, setMetricWizardTarget] = useState<{ id: string; label: string } | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const stats = useMemo(() => {
    const openTasks   = tasks.filter(t => t.status !== 'done').length;
    const doneTasks   = tasks.filter(t => t.status === 'done').length;
    const overdue     = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length;
    const activeProjs = projects.filter(p => p.status !== 'done').length;
    const totalGoals  = goals.length;
    const openDecisions = decisions.filter(d => d.status === 'open').length;
    return { openTasks, doneTasks, overdue, activeProjs, totalGoals, openDecisions, notes: (notes || []).length, files: files.length };
  }, [tasks, projects, goals, decisions, notes, files, today]);

  const alerts = useMemo(() => generateAlerts(projects, tasks, decisions, risks, members), [projects, tasks, decisions, risks, members]);
  const topAlerts = alerts.slice(0, 4);

  const alertIconAndColor = (type: string) => {
    if (type === 'overdue' || type === 'blocker') return { Icon: Clock, color: '#fb7185' };
    if (type === 'at_risk' || type === 'risk') return { Icon: AlertTriangle, color: '#fbbf24' };
    if (type === 'decision') return { Icon: Scale, color: '#fbbf24' };
    return { Icon: Zap, color: ACCENT };
  };

  const topMetrics = useMemo(() => metrics.slice(0, 4), [metrics]);

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide flex flex-col gap-5 pr-1 pb-6">

      {/* ── Universe Header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl grid place-items-center"
          style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}35` }}
        >
          <Orbit className="w-5 h-5" style={{ color: ACCENT }} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Universe Pulse</h3>
          <div className="text-[10px] text-white/35">Live overview of your digital twin</div>
        </div>
        <div className="ml-auto text-[10px] text-white/25">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* ── Quick Stats ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile
          icon={CheckSquare}
          label="Open Tasks"
          value={stats.openTasks}
          color={stats.overdue > 0 ? '#fb7185' : '#fff'}
          onClick={() => setActiveSidebarTab('tasks')}
        />
        <StatTile
          icon={Layers}
          label="Active Projects"
          value={stats.activeProjs}
          color={ACCENT}
          onClick={() => setActiveSidebarTab('projects')}
        />
        <StatTile
          icon={Target}
          label="Goals"
          value={stats.totalGoals}
          color="#34d399"
          onClick={() => setActiveSidebarTab('goals')}
        />
        <StatTile
          icon={Scale}
          label="Open Decisions"
          value={stats.openDecisions}
          color={stats.openDecisions > 0 ? '#fbbf24' : '#94a3b8'}
          onClick={() => setActiveSidebarTab('projects')}
        />
      </div>

      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile
          icon={CheckSquare}
          label="Tasks Done"
          value={stats.doneTasks}
          color="#34d399"
          onClick={() => setActiveSidebarTab('tasks')}
        />
        <StatTile
          icon={AlertTriangle}
          label="Overdue"
          value={stats.overdue}
          color={stats.overdue > 0 ? '#fb7185' : '#94a3b8'}
          onClick={() => setActiveSidebarTab('tasks')}
        />
        <StatTile
          icon={FileText}
          label="Notes"
          value={stats.notes}
          color="#94a3b8"
          onClick={() => setActiveSidebarTab('notes')}
        />
        <StatTile
          icon={FolderOpen}
          label="Files"
          value={stats.files}
          color="#94a3b8"
          onClick={() => setActiveSidebarTab('files')}
        />
      </div>

      {/* ── Key Metrics Snapshot ────────────────────────────────────────────── */}
      {topMetrics.length > 0 && (
        <div className="shrink-0">
          <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/35 mb-2.5 flex items-center gap-1.5 px-0.5">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            Key Metrics
            <button
              type="button"
              onClick={() => setActiveSidebarTab('goals')}
              className="ml-auto flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              All metrics <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {topMetrics.map(m => {
              const pct = bdtMetricProgress(m);
              const good = m.trend === 'flat' ? null : (m.trend === 'up') === m.higher_is_better;
              const tc = good === null ? '#94a3b8' : good ? '#34d399' : '#fb7185';
              const TIcon = m.trend === 'up' ? TrendingUp : m.trend === 'down' ? TrendingDown : Minus;
              return (
                <div key={m.id} className="rounded-xl p-3 bg-white/[0.03] border border-white/8">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-white/35 truncate">{m.name}</span>
                    <TIcon className="w-3 h-3 shrink-0" style={{ color: tc }} />
                  </div>
                  <div className="text-base font-bold leading-none mb-1.5" style={{ color: tc }}>{bdtMetricDisplay(m)}</div>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tc }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Active Alerts ───────────────────────────────────────────────────── */}
      <div className="shrink-0">
        <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/35 mb-2.5 flex items-center gap-1.5 px-0.5">
          <Zap className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
          Active Alerts
          <span className="ml-1.5 text-[9px] text-white/25 font-normal normal-case tracking-normal">
            {alerts.length} total
          </span>
        </div>

        {topAlerts.length === 0 && (
          <div className="py-5 text-center text-xs text-white/30">No active alerts. All clear!</div>
        )}

        <div className="space-y-1.5">
          {topAlerts.map((a, i) => {
            const { Icon, color } = alertIconAndColor(a.type);
            return (
              <div
                key={i}
                className="flex items-start gap-3 px-3.5 py-3 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-default"
              >
                <span
                  className="w-7 h-7 rounded-lg grid place-items-center shrink-0 mt-0.5"
                  style={{ background: `${color}16`, border: `1px solid ${color}30` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white leading-snug">{a.title}</div>
                  {a.detail && (
                    <div className="text-[11px] text-white/40 mt-0.5 leading-relaxed">{a.detail}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Quick Navigation ────────────────────────────────────────────────── */}
      {departments.length > 0 && (
        <div className="shrink-0">
          <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/35 mb-2.5 flex items-center gap-1.5 px-0.5">
            <Target className="w-3.5 h-3.5" style={{ color: '#34d399' }} />
            Department Health
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {departments.map((department) => {
              const rollup = rollups.find(r => r.target_type === 'department' && r.target_id === department.id);
              return (
                <div key={department.id} className="rounded-2xl p-3 bg-white/[0.03] border border-white/8">
                  <MetricRollupHealthPanel rollup={rollup} title={department.name} />
                  {canEditMetrics && (
                    <button
                      type="button"
                      onClick={() => setMetricWizardTarget({ id: department.id, label: department.name })}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: `${ACCENT}20`, border: `1px solid ${ACCENT}40`, color: ACCENT }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Create department metric
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="shrink-0">
        <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/35 mb-2.5 px-0.5">Quick Navigate</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {([
            { tab: 'tasks',        label: 'My Tasks',        Icon: CheckSquare, color: ACCENT },
            { tab: 'projects',     label: 'Projects',        Icon: Layers,      color: '#60a5fa' },
            { tab: 'goals',        label: 'Goals & Metrics', Icon: Target,      color: '#34d399' },
            { tab: 'signals',      label: 'Signals',         Icon: Zap,         color: '#fbbf24' },
            { tab: 'roadmap',      label: 'Roadmap',         Icon: TrendingUp,  color: '#a78bfa' },
            { tab: 'competitors',  label: 'Competitors',     Icon: AlertTriangle, color: '#fb7185' },
          ] as const).map(({ tab, label, Icon, color }) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveSidebarTab(tab as Parameters<typeof setActiveSidebarTab>[0])}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/16 transition-all text-left group"
            >
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
              <span className="text-[11px] font-semibold text-white/65 group-hover:text-white transition-colors">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {metricWizardTarget && companyId && (
        <MetricCreateWizard
          companyId={companyId}
          members={teamMembers}
          targetType="department"
          targetId={metricWizardTarget.id}
          targetLabel={`Department Health: ${metricWizardTarget.label}`}
          createMetric={createMetric}
          createDraft={createDraft}
          onClose={() => setMetricWizardTarget(null)}
        />
      )}
    </div>
  );
}
