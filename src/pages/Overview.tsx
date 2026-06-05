import { useMemo, useEffect, useState } from 'react';
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
import { api } from '../lib/api';
import { getCurrencySymbol } from '../lib/currency';
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

  const currencySymbol = getCurrencySymbol(company?.currency);

  const industryLabel = company?.industry_id
    ? INDUSTRIES.find(i => i.id === company.industry_id)?.label ?? company.industry_id
    : 'SaaS';

  const displayName = company?.name ?? 'Your Company';
  const displayStage = company?.stage ?? 'Seed';

  const [simSnapshot, setSimSnapshot] = useState<Record<string, number> | null>(null);
  const [chartData, setChartData] = useState(revenueHistory);

  useEffect(() => {
    if (!profile?.company_id) return;
    api.get<Record<string, number> | null>(`/api/metrics-onboarding/${profile.company_id}/latest`)
      .then((m) => { if (m) setSimSnapshot(m); })
      .catch(() => {});
    api.get<{ month: string; mrr: number; burn: number }[]>(`/api/metrics-onboarding/${profile.company_id}/history`)
      .then((rows) => { if (rows?.length) setChartData(rows); })
      .catch(() => {});
  }, [profile?.company_id]);

  const liveKeyMetrics = useMemo<Metric[]>(() => {
    const c = currencySymbol;
    const ordered = [
      // Financial summary
      { key: 'revenue',             name: 'Monthly Revenue',      unit: c },
      { key: 'burn',                name: 'Monthly Burn',         unit: c },
      { key: 'rent',                name: 'Monthly Rent',         unit: c },
      { key: 'salaries',            name: 'Salaries',             unit: c },
      // Team & acquisition
      { key: 'headcount',           name: 'Team Size',            unit: 'people' },
      { key: 'signups',             name: 'User Acquisition',     unit: '/mo' },
      { key: 'ad_spend',            name: 'Ad Spend',             unit: c },
      { key: 'cost_of_sales',       name: 'Cost of Sales',        unit: c },
      // Core startup metrics
      { key: 'buyer_count',         name: 'Buyers',               unit: 'count' },
      { key: 'conversion_rate',     name: 'Conversion Rate',      unit: '%' },
      { key: 'avg_order_value',     name: 'Avg Order Value',      unit: c },
      { key: 'cogs',                name: 'COGS',                 unit: c },
      { key: 'avg_payment_count',   name: 'Avg Payment Count',    unit: 'x' },
      { key: 'customer_ltv',        name: 'Customer LTV',         unit: c },
      { key: 'arpu',                name: 'ARPU',                 unit: c },
      { key: 'cpa',                 name: 'CPA',                  unit: c },
      { key: 'contribution_margin', name: 'Contribution Margin',  unit: c },
    ];

    return ordered
      .map(({ key, name, unit }) => {
        const m = metrics[key];
        if (!m) return null;
        // Use the unit stored in DB (real currency code/symbol) for monetary fields,
        // fall back to the hardcoded label for non-monetary fields.
        const displayUnit = m.unit && m.unit !== 'count' ? m.unit : unit;
        return {
          name,
          value: Number(m.value),
          unit: displayUnit,
          change: 0,
        } as Metric;
      })
      .filter(Boolean) as Metric[];
  }, [metrics, currencySymbol]);

  // Fall back to company record data when no normalized metrics exist yet.
  // Always returns a full 8-card grid so the dashboard is never empty.
  const companyFallbackMetrics = useMemo<Metric[]>(() => {
    if (!company) return [];
    const c = currencySymbol;
    return [
      { name: 'Monthly Revenue', value: company.mrr_usd       ?? 0, unit: c,        change: 0 },
      { name: 'Monthly Burn',    value: company.burn_rate_usd  ?? 0, unit: c,        change: 0 },
      { name: 'Team Size',       value: company.employees      ?? 0, unit: 'people', change: 0 },
      { name: 'Runway',          value: company.runway_months  ?? 0, unit: 'months', change: 0 },
      { name: 'CAC',             value: 0,                           unit: c,        change: 0 },
      { name: 'LTV / CLTV',     value: 0,                           unit: c,        change: 0 },
      { name: 'Churn Rate',      value: 0,                           unit: '%',      change: 0 },
      { name: 'NPS Score',       value: 0,                           unit: '',       change: 0 },
    ];
  }, [company, currencySymbol]);

  const displayMetrics = useMemo<Metric[]>(() => {
    if (simSnapshot) {
      const c = currencySymbol;
      return [
        { name: 'MRR',        value: simSnapshot.revenue   ?? 0, unit: c,        change: 0 },
        { name: 'CAC',        value: simSnapshot.cpa        ?? 0, unit: c,        change: 0 },
        { name: 'LTV',        value: simSnapshot.cltv       ?? 0, unit: c,        change: 0 },
        { name: 'Churn Rate', value: simSnapshot.churn      ?? 0, unit: '%',      change: 0 },
        { name: 'Burn Rate',  value: simSnapshot.burn       ?? 0, unit: c,        change: 0 },
        { name: 'NPS Score',  value: simSnapshot.nps        ?? 0, unit: '',       change: 0 },
        { name: 'Runway',     value: simSnapshot.runway     ?? 0, unit: 'months', change: 0 },
        { name: 'Team Size',  value: simSnapshot.headcount  ?? 0, unit: 'people', change: 0 },
      ];
    }
    if (liveKeyMetrics.length > 0) return liveKeyMetrics;
    if (companyFallbackMetrics.length > 0) return companyFallbackMetrics;
    return keyMetrics.slice(0, 8);
  }, [simSnapshot, liveKeyMetrics, companyFallbackMetrics, currencySymbol]);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
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
            <AreaChart data={chartData}>
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
              <Area type="monotone" dataKey="mrr" stroke="#0ea5e9" fill="url(#mrrGrad)" name={`MRR (${currencySymbol})`} />
              <Area type="monotone" dataKey="burn" stroke="#ef4444" fill="url(#burnGrad)" name={`Burn (${currencySymbol})`} />
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
