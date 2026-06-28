/**
 * Goal Superalignment + Metric Impact store (localStorage).
 *
 * Implements the BDT doc's goal hierarchy (daily → long-term) and a simple
 * company/department metric model. Goals link to a metric they drive; projects
 * link to goals by name (Project.goalLink), so progress and impact roll up:
 *   tasks → project → goal → metric.
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from './api';

const STORAGE_KEY = 'bdt_goals_v2';
const METRIC_HISTORY_KEY = 'bdt_metric_history_v1';

export type Horizon = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'round' | '3yr' | 'long_term';
export type MetricScope = 'company' | 'department';
export type Trend = 'up' | 'down' | 'flat';

export interface Metric {
  id: string;
  name: string;
  scope: MetricScope;
  department?: string;
  value: number;
  target: number;
  baseline: number;
  unit: string;          // '$', '%', 'mo', ''
  /** does a higher number mean better? (churn/runway-burn = false) */
  higherIsBetter: boolean;
  trend: Trend;
  alertThreshold?: number; // warn when progress drops below this %
}

/** Tracks estimated vs actual impact of a task/decision on a metric */
export interface MetricImpact {
  id: string;
  metricId: string;
  taskId?: string;
  decisionId?: string;
  projectId: string;
  estimatedDelta: number;    // expected change in metric value (e.g. +5000 MRR)
  estimatedConfidence: number; // 0–100
  actualDelta?: number;      // set when task completes
  variance?: number;         // actualDelta - estimatedDelta
  createdAt: string;
  resolvedAt?: string;
}

/** One data point in a metric's value history */
export interface MetricHistoryPoint {
  metricId: string;
  value: number;
  at: string; // ISO
  reason?: string;
}

export interface Goal {
  id: string;
  title: string;
  horizon: Horizon;
  ownerId?: string;
  metricId?: string;
  createdAt: string;
}

interface GoalsState {
  goals: Goal[];
  metrics: Metric[];
  metricImpacts: MetricImpact[];
}

/* ── labels / order ──────────────────────────────────────────────────────── */

export const HORIZON_ORDER: Horizon[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'round', '3yr', 'long_term'];

export const HORIZON_META: Record<Horizon, { label: string; color: string }> = {
  daily:     { label: 'Daily',      color: '#94a3b8' },
  weekly:    { label: 'Weekly',     color: '#60a5fa' },
  monthly:   { label: 'Monthly',    color: '#22d3ee' },
  quarterly: { label: 'Quarterly',  color: '#34d399' },
  annual:    { label: 'Annual',     color: '#a78bfa' },
  round:     { label: 'Round-based', color: '#fbbf24' },
  '3yr':     { label: '3-year',     color: '#fb7185' },
  long_term: { label: 'Long-term',  color: '#f472b6' },
};

/* ── seed ────────────────────────────────────────────────────────────────── */

function seed(): GoalsState {
  const iso = new Date().toISOString();
  const metrics: Metric[] = [
    { id: 'mt_mrr', name: 'MRR', scope: 'company', value: 135000, target: 250000, baseline: 120000, unit: '$', higherIsBetter: true, trend: 'up', alertThreshold: 40 },
    { id: 'mt_runway', name: 'Runway', scope: 'company', value: 18, target: 24, baseline: 16, unit: 'mo', higherIsBetter: true, trend: 'down', alertThreshold: 50 },
    { id: 'mt_activation', name: 'Activation rate', scope: 'department', department: 'Product', value: 41, target: 60, baseline: 38, unit: '%', higherIsBetter: true, trend: 'up', alertThreshold: 40 },
    { id: 'mt_churn', name: 'Monthly churn', scope: 'department', department: 'Customer Success', value: 5.2, target: 3, baseline: 6, unit: '%', higherIsBetter: false, trend: 'down', alertThreshold: 30 },
  ];
  const goals: Goal[] = [
    { id: 'g_canvas', title: 'Launch Canvas v2', horizon: 'quarterly', ownerId: 'm_you', metricId: 'mt_activation', createdAt: iso },
    { id: 'g_seed', title: 'Close Seed Round', horizon: 'round', ownerId: 'm_you', metricId: 'mt_runway', createdAt: iso },
    { id: 'g_mrr', title: 'Reach $250k MRR', horizon: 'annual', ownerId: 'm_you', metricId: 'mt_mrr', createdAt: iso },
    { id: 'g_churn', title: 'Cut churn to 3%', horizon: 'monthly', ownerId: 'm_alex', metricId: 'mt_churn', createdAt: iso },
    { id: 'g_daily', title: 'Ship 5 critical tasks today', horizon: 'daily', ownerId: 'm_you', createdAt: iso },
  ];
  return { goals, metrics, metricImpacts: [] };
}

/* ── persistence ─────────────────────────────────────────────────────────── */

function load(): GoalsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { const s = seed(); localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); return s; }
    return JSON.parse(raw) as GoalsState;
  } catch {
    return seed();
  }
}

function persist(state: GoalsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('goals_updated'));
  } catch { /* quota */ }
}

function loadHistory(): MetricHistoryPoint[] {
  try { return JSON.parse(localStorage.getItem(METRIC_HISTORY_KEY) ?? '[]'); } catch { return []; }
}

function pushHistory(pt: MetricHistoryPoint) {
  try {
    const h = loadHistory();
    h.push(pt);
    // keep last 200 points per metric
    const trimmed = h.slice(-400);
    localStorage.setItem(METRIC_HISTORY_KEY, JSON.stringify(trimmed));
  } catch { /* quota */ }
}

function uid(p: string) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

/* ── hook ────────────────────────────────────────────────────────────────── */

export function useGoalsStore() {
  const [state, setState] = useState<GoalsState>(() => load());

  useEffect(() => {
    const h = () => setState(load());
    window.addEventListener('goals_updated', h);
    return () => window.removeEventListener('goals_updated', h);
  }, []);

  // Listen for task completions that have a linked metric impact
  useEffect(() => {
    const h = (e: Event) => {
      const { impactId } = (e as CustomEvent<{ impactId: string }>).detail;
      setState(prev => {
        const impact = (prev.metricImpacts ?? []).find(i => i.id === impactId);
        if (!impact || impact.resolvedAt) return prev;
        const metric = prev.metrics.find(m => m.id === impact.metricId);
        if (!metric) return prev;
        const delta = impact.estimatedDelta;
        const newValue = +(metric.value + delta).toFixed(2);
        pushHistory({ metricId: metric.id, value: metric.value, at: new Date().toISOString(), reason: 'Task completed' });
        const next = {
          ...prev,
          metrics: prev.metrics.map(m => m.id === metric.id ? {
            ...m,
            value: newValue,
            trend: delta > 0 ? (m.higherIsBetter ? 'up' : 'down') as Trend
                 : delta < 0 ? (m.higherIsBetter ? 'down' : 'up') as Trend
                 : 'flat' as Trend,
          } : m),
          metricImpacts: (prev.metricImpacts ?? []).map(i => i.id === impactId
            ? { ...i, actualDelta: delta, variance: 0, resolvedAt: new Date().toISOString() }
            : i),
        };
        persist(next);
        return next;
      });
    };
    window.addEventListener('task-completed-metric-impact', h);
    return () => window.removeEventListener('task-completed-metric-impact', h);
  }, []);

  const update = useCallback((mutate: (s: GoalsState) => GoalsState) => {
    setState(prev => { const next = mutate(prev); persist(next); return next; });
  }, []);

  const createGoal = useCallback((input: { title: string; horizon: Horizon; metricId?: string; ownerId?: string }) => {
    update(s => ({ ...s, goals: [{ id: uid('g'), title: input.title, horizon: input.horizon, metricId: input.metricId, ownerId: input.ownerId, createdAt: new Date().toISOString() }, ...s.goals] }));
  }, [update]);

  const deleteGoal = useCallback((id: string) => {
    update(s => ({ ...s, goals: s.goals.filter(g => g.id !== id) }));
  }, [update]);

  /** Register a predicted metric impact from a task or decision */
  const addMetricImpact = useCallback((input: Omit<MetricImpact, 'id' | 'createdAt'>) => {
    const impact: MetricImpact = { ...input, id: uid('mi'), createdAt: new Date().toISOString() };
    update(s => ({ ...s, metricImpacts: [...(s.metricImpacts ?? []), impact] }));
    return impact.id;
  }, [update]);

  /** Record actual impact when a task completes — applies delta to metric value */
  const resolveMetricImpact = useCallback((impactId: string, actualDelta: number) => {
    update(s => {
      const impact = (s.metricImpacts ?? []).find(i => i.id === impactId);
      if (!impact) return s;
      const metric = s.metrics.find(m => m.id === impact.metricId);
      if (!metric) return s;
      const newValue = +(metric.value + actualDelta).toFixed(2);
      const prevValue = metric.value;
      pushHistory({ metricId: metric.id, value: prevValue, at: new Date().toISOString(), reason: `Impact resolved: ${actualDelta > 0 ? '+' : ''}${actualDelta}` });
      const updatedMetric = {
        ...metric,
        value: newValue,
        trend: actualDelta > 0 ? (metric.higherIsBetter ? 'up' : 'down') as Trend
              : actualDelta < 0 ? (metric.higherIsBetter ? 'down' : 'up') as Trend
              : 'flat' as Trend,
      };
      return {
        ...s,
        metrics: s.metrics.map(m => m.id === metric.id ? updatedMetric : m),
        metricImpacts: (s.metricImpacts ?? []).map(i => i.id === impactId
          ? { ...i, actualDelta, variance: actualDelta - i.estimatedDelta, resolvedAt: new Date().toISOString() }
          : i),
      };
    });
  }, [update]);

  /** Directly update a metric value (manual entry) */
  const updateMetricValue = useCallback((metricId: string, newValue: number, reason?: string) => {
    update(s => {
      const metric = s.metrics.find(m => m.id === metricId);
      if (!metric) return s;
      pushHistory({ metricId, value: metric.value, at: new Date().toISOString(), reason });
      const delta = newValue - metric.value;
      return {
        ...s,
        metrics: s.metrics.map(m => m.id === metricId ? {
          ...m,
          value: newValue,
          trend: delta > 0 ? (m.higherIsBetter ? 'up' : 'down') as Trend
               : delta < 0 ? (m.higherIsBetter ? 'down' : 'up') as Trend
               : 'flat' as Trend,
        } : m),
      };
    });
  }, [update]);

  const getMetricHistory = useCallback((metricId: string): MetricHistoryPoint[] => {
    return loadHistory().filter(p => p.metricId === metricId).slice(-20);
  }, []);

  const getMetricAlerts = useCallback((): { metricId: string; name: string; progress: number; threshold: number }[] => {
    return state.metrics
      .filter(m => m.alertThreshold != null && metricProgress(m) < m.alertThreshold!)
      .map(m => ({ metricId: m.id, name: m.name, progress: metricProgress(m), threshold: m.alertThreshold! }));
  }, [state.metrics]);

  return {
    goals: state.goals,
    metrics: state.metrics,
    metricImpacts: state.metricImpacts ?? [],
    createGoal,
    deleteGoal,
    addMetricImpact,
    resolveMetricImpact,
    updateMetricValue,
    getMetricHistory,
    getMetricAlerts,
  };
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** % of the way from baseline → target. */
export function metricProgress(m: Metric): number {
  const span = m.target - m.baseline;
  if (span === 0) return 100;
  const pct = ((m.value - m.baseline) / span) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function metricDisplay(m: Metric): string {
  if (m.unit === '$') return `$${m.value.toLocaleString()}`;
  if (m.unit === '%') return `${m.value}%`;
  if (m.unit === 'mo') return `${m.value} mo`;
  return String(m.value);
}

export function metricTargetDisplay(m: Metric): string {
  if (m.unit === '$') return `$${m.target.toLocaleString()}`;
  if (m.unit === '%') return `${m.target}%`;
  if (m.unit === 'mo') return `${m.target} mo`;
  return String(m.target);
}

/* ── localStorage → DB seed ──────────────────────────────────────────────────
 * Called once per company on app init (guarded by bdt_seeded_v1 flag).
 * Sends current localStorage goals/metrics/impacts to the backend seed endpoint.
 * Returns the ID mapping so callers can update their references.
 */
const SEED_FLAG = 'bdt_seeded_v1';

export async function seedGoalsToDb(companyId: string): Promise<{
  metricMap: Record<string, string>;
  goalMap: Record<string, string>;
} | null> {
  if (localStorage.getItem(SEED_FLAG) === companyId) return null; // already seeded

  try {
    const raw = localStorage.getItem('bdt_goals_v2');
    const state: GoalsState = raw ? JSON.parse(raw) : { goals: [], metrics: [], metricImpacts: [] };

    const result = await api.post<{
      seeded: boolean;
      metricMap: Record<string, string>;
      goalMap: Record<string, string>;
    }>(`/api/bdt-metrics/${companyId}/seed-from-local`, {
      metrics: state.metrics,
      goals: state.goals,
      impacts: state.metricImpacts ?? [],
    });

    localStorage.setItem(SEED_FLAG, companyId);
    return { metricMap: result.metricMap, goalMap: result.goalMap };
  } catch (err) {
    console.error('[goals] seed to DB failed (non-fatal)', err);
    return null;
  }
}
