import { useState } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Database, Pencil, Radio,
  ChevronDown, ChevronUp, Target,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
  CartesianGrid,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import { trackedMetrics } from '../data/mockData';
import type { MetricCategory, TrackedMetric } from '../types';

const CATEGORIES: { key: MetricCategory; color: string; accent: string }[] = [
  { key: 'Growth', color: 'text-emerald-400', accent: '#34d399' },
  { key: 'Product', color: 'text-cyan-400', accent: '#22d3ee' },
  { key: 'Sales', color: 'text-sky-400', accent: '#818cf8' },
  { key: 'Finance', color: 'text-amber-400', accent: '#fbbf24' },
  { key: 'Ops/People', color: 'text-sky-400', accent: '#38bdf8' },
];

const SOURCE_CFG: Record<string, { icon: typeof Database; label: string; color: string }> = {
  'auto-ingested': { icon: Database, label: 'Auto', color: 'text-emerald-400 bg-emerald-500/10' },
  manual: { icon: Pencil, label: 'Manual', color: 'text-amber-400 bg-amber-500/10' },
  proxy: { icon: Radio, label: 'Proxy', color: 'text-sky-400 bg-sky-500/10' },
};

const MONTH_LABELS = ['M-11', 'M-10', 'M-9', 'M-8', 'M-7', 'M-6', 'M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'Now'];

export default function Metrics() {
  const [activeCategory, setActiveCategory] = useState<MetricCategory | 'All'>('All');
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const filtered = activeCategory === 'All'
    ? trackedMetrics
    : trackedMetrics.filter((m) => m.category === activeCategory);

  const categoryCounts = CATEGORIES.map((c) => ({
    ...c,
    count: trackedMetrics.filter((m) => m.category === c.key).length,
  }));

  const activeAccent = activeCategory === 'All'
    ? '#818cf8'
    : CATEGORIES.find((c) => c.key === activeCategory)?.accent ?? '#818cf8';

  return (
    <div>
      <PageHeader
        title="Metrics"
        subtitle="Track and visualise core startup metrics — auto-ingested, manual, or estimated via proxy signals"
        icon={<BarChart3 className="w-6 h-6" />}
        badge={`${trackedMetrics.length} Tracked`}
      />

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveCategory('All')}
          className={`px-4 py-2 text-xs rounded-lg border transition-all ${
            activeCategory === 'All'
              ? 'bg-sky-500/10 border-sky-500/20 text-sky-300 font-medium'
              : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'
          }`}
        >
          All ({trackedMetrics.length})
        </button>
        {categoryCounts.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            className={`px-4 py-2 text-xs rounded-lg border transition-all ${
              activeCategory === c.key
                ? `bg-gray-900/80 border-gray-700 ${c.color} font-medium`
                : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'
            }`}
          >
            {c.key} ({c.count})
          </button>
        ))}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {CATEGORIES.map((c) => {
          const catMetrics = trackedMetrics.filter((m) => m.category === c.key);
          const avgChange = catMetrics.length > 0
            ? catMetrics.reduce((s, m) => s + m.change, 0) / catMetrics.length
            : 0;
          const improving = catMetrics.filter((m) => {
            const lower = ['CAC', 'Churn Rate', 'Monthly Burn', 'Deal Cycle Time', 'Top Churn Driver'];
            return lower.includes(m.name) ? m.change < 0 : m.change > 0;
          }).length;
          return (
            <div key={c.key} className="glass-card p-4">
              <p className={`text-[10px] uppercase tracking-wider mb-2 ${c.color}`}>{c.key}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-lg font-bold text-white">{catMetrics.length}</p>
                  <p className="text-[10px] text-gray-500">metrics</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${avgChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-gray-600">{improving}/{catMetrics.length} improving</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((metric) => (
          <MetricTile
            key={metric.id}
            metric={metric}
            accent={CATEGORIES.find((c) => c.key === metric.category)?.accent ?? activeAccent}
            expanded={expandedMetric === metric.id}
            onToggle={() => setExpandedMetric(expandedMetric === metric.id ? null : metric.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass-card p-8 text-center mt-4">
          <BarChart3 className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No metrics in this category</p>
        </div>
      )}
    </div>
  );
}

// --- Metric Tile ---

function MetricTile({
  metric,
  accent,
  expanded,
  onToggle,
}: {
  metric: TrackedMetric;
  accent: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const src = SOURCE_CFG[metric.dataSource];
  const SrcIcon = src.icon;
  const isPositive = metric.change >= 0;
  const lowerBetter = ['CAC', 'Churn Rate', 'Monthly Burn', 'Deal Cycle Time', 'Top Churn Driver'];
  const isGood = lowerBetter.includes(metric.name) ? !isPositive : isPositive;

  const sparkData = metric.trend.map((v, i) => ({ month: MONTH_LABELS[i], value: v }));

  const targetPct = metric.target
    ? Math.min(100, Math.round((metric.value / metric.target) * 100))
    : null;

  return (
    <div className="glass-card p-4 transition-all hover:border-gray-700/50">
      {/* Header row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400 font-medium">{metric.name}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${src.color} flex items-center gap-1`}>
              <SrcIcon className="w-2.5 h-2.5" />
              {src.label}
            </span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-xl font-bold text-white">
              {metric.unit === '$' && '$'}
              {metric.value.toLocaleString()}
              {metric.unit === '%' && '%'}
            </span>
            {metric.unit !== '$' && metric.unit !== '%' && metric.unit && (
              <span className="text-[10px] text-gray-500 mb-0.5">{metric.unit}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`flex items-center gap-1 text-xs ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(metric.change)}%
          </div>
          {metric.percentile && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300">
              P{metric.percentile}
            </span>
          )}
        </div>
      </div>

      {/* Sparkline */}
      <div className="h-12 mt-1 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData}>
            <defs>
              <linearGradient id={`grad-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accent} stopOpacity={0.3} />
                <stop offset="95%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={accent}
              strokeWidth={1.5}
              fill={`url(#grad-${metric.id})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Target progress */}
      {metric.target && targetPct !== null && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
            <span className="flex items-center gap-1">
              <Target className="w-2.5 h-2.5" />
              Target: {metric.unit === '$' ? '$' : ''}{metric.target.toLocaleString()}{metric.unit === '%' ? '%' : ''}
            </span>
            <span>{targetPct}%</span>
          </div>
          <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${targetPct}%`,
                backgroundColor: targetPct >= 80 ? '#34d399' : targetPct >= 50 ? accent : '#f87171',
              }}
            />
          </div>
        </div>
      )}

      {/* Integration source */}
      {metric.integration && (
        <p className="text-[9px] text-gray-600 mt-2">via {metric.integration}</p>
      )}

      {/* Expand toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-center gap-1 mt-2 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Less' : 'Details'}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-800/50 space-y-3">
          <p className="text-[11px] text-gray-400">{metric.description}</p>

          {/* Full trend chart */}
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(14,165,233,0.2)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  labelStyle={{ color: '#38bdf8' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={accent}
                  strokeWidth={2}
                  dot={{ r: 2, fill: accent }}
                  activeDot={{ r: 4 }}
                />
                {metric.target && (
                  <Line
                    type="monotone"
                    dataKey={() => metric.target}
                    stroke="#4b5563"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    dot={false}
                    name="Target"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="py-2 rounded-lg bg-gray-900/50">
              <p className="text-[10px] text-gray-500">12m Low</p>
              <p className="text-xs font-medium text-white">{Math.min(...metric.trend).toLocaleString()}</p>
            </div>
            <div className="py-2 rounded-lg bg-gray-900/50">
              <p className="text-[10px] text-gray-500">12m High</p>
              <p className="text-xs font-medium text-white">{Math.max(...metric.trend).toLocaleString()}</p>
            </div>
            <div className="py-2 rounded-lg bg-gray-900/50">
              <p className="text-[10px] text-gray-500">12m Avg</p>
              <p className="text-xs font-medium text-white">
                {Math.round(metric.trend.reduce((s, v) => s + v, 0) / metric.trend.length).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
