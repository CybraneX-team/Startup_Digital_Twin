import { useMemo } from 'react';
import { LayoutDashboard, Activity, Zap, Shield, Bot, User, Clock, CheckCircle2, Loader2, CircleDot } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import { keyMetrics, revenueHistory, departmentHealth, environmentSignals, activeTasks } from '../data/mockData';
import { useAuth } from '../lib/auth';
import { useCompany } from '../lib/db/companies';
import { useCompanyMetrics } from '../lib/db/metrics';
import { INDUSTRIES } from '../db/industries';
import type { Metric } from '../types';

const statusConfig = {
  running: { icon: Loader2, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', animate: 'animate-spin' },
  completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', animate: '' },
  queued: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', animate: '' },
  failed: { icon: CircleDot, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', animate: '' },
};

export default function Overview() {
  const { profile } = useAuth();
  const { company } = useCompany(profile?.company_id);
  const { metrics } = useCompanyMetrics(profile?.company_id ?? null);

  const industryLabel = company?.industry_id
    ? INDUSTRIES.find(i => i.id === company.industry_id)?.label ?? company.industry_id
    : 'SaaS';

  const displayName = company?.name ?? 'Your Company';
  const displayStage = company?.stage ?? 'Seed';

  const liveKeyMetrics = useMemo<Metric[]>(() => {
    const ordered = [
      { key: 'revenue', name: 'Revenue', unit: '$' },
      { key: 'burn', name: 'Burn', unit: '$' },
      { key: 'cash', name: 'Cash', unit: '$' },
      { key: 'headcount', name: 'Team', unit: 'people' },
      { key: 'ad_spend', name: 'Ad Spend', unit: '$' },
      { key: 'signups', name: 'Signups', unit: 'count' },
    ] as const;

    return ordered
      .map(({ key, name, unit }) => {
        const m = metrics[key];
        if (!m) return null;
        return {
          name,
          value: Number(m.value),
          unit,
          change: 0,
        } as Metric;
      })
      .filter(Boolean) as Metric[];
  }, [metrics]);

  const displayMetrics = liveKeyMetrics.length > 0 ? liveKeyMetrics : keyMetrics.slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Digital Twin Overview"
        subtitle={`${displayName} — ${displayStage} · ${industryLabel}`}
        icon={<LayoutDashboard className="w-6 h-6" />}
        badge="Live"
      />

      {/* Twin Status Bar */}
      <div className="glass-card p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 status-pulse" />
            <span className="text-sm text-gray-300">System Twin: <span className="text-emerald-400">Synced</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 status-pulse" />
            <span className="text-sm text-gray-300">Environment Twin: <span className="text-cyan-400">Synced</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-sm text-gray-300">Last sync: <span className="text-gray-400">2 min ago</span></span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" /> 3 AI Agents Active</span>
          <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-sky-400" /> Data: Real + Simulated</span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {displayMetrics.map((m) => (
          <MetricCard key={m.name} metric={m} />
        ))}
      </div>

      {/* Charts + Tasks Row */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Revenue & Burn Chart */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Revenue vs Burn</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueHistory}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#9ca3af' }} />
              <Area type="monotone" dataKey="mrr" stroke="#0ea5e9" fill="url(#mrrGrad)" name="MRR ($)" />
              <Area type="monotone" dataKey="burn" stroke="#ef4444" fill="url(#burnGrad)" name="Burn ($)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Department Health Radar */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Department Health</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={departmentHealth}>
              <PolarGrid stroke="#1f2937" />
              <PolarAngleAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Radar name="Health" dataKey="health" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} />
              <Radar name="Velocity" dataKey="velocity" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} />
              <Radar name="Satisfaction" dataKey="satisfaction" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Live Task Execution */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300">Tasks Executing</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/20">
              {activeTasks.filter((t) => t.status === 'running').length} running
            </span>
          </div>
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {activeTasks.map((task) => {
              const cfg = statusConfig[task.status];
              const Icon = cfg.icon;
              return (
                <div key={task.id} className={`p-3 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                  <div className="flex items-start gap-2.5">
                    <Icon className={`w-3.5 h-3.5 mt-0.5 ${cfg.color} ${cfg.animate} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-500">{task.department}</span>
                        <span className="text-[10px] text-gray-600">·</span>
                        {task.aiPowered ? (
                          <span className="flex items-center gap-0.5 text-[10px] text-sky-400"><Bot className="w-2.5 h-2.5" /> AI</span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[10px] text-gray-400"><User className="w-2.5 h-2.5" /> {task.assignee}</span>
                        )}
                        {task.eta && <span className="text-[10px] text-gray-600 ml-auto">{task.eta}</span>}
                      </div>
                      {task.status === 'running' && (
                        <div className="mt-1.5 h-1 rounded-full bg-gray-800 overflow-hidden">
                          <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${task.progress}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Environment Signals */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Latest Environment Signals</h3>
        <div className="space-y-3">
          {environmentSignals.slice(0, 4).map((signal, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-900/50 border border-gray-800/50">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${
                  signal.impact === 'positive' ? 'bg-emerald-500' : signal.impact === 'negative' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                <span className="text-sm text-gray-300">{signal.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 uppercase">{signal.type}</span>
                <span className="text-xs text-gray-500">{signal.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
