import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

export interface LatestMetric {
  metric_key: string;
  value: number;
  unit: string;
  period_end: string;
}

export function useCompanyMetrics(companyId: string | null | undefined) {
  const [metrics, setMetrics] = useState<Record<string, LatestMetric>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!companyId) {
      queueMicrotask(() => {
        if (cancelled) return;
        setMetrics({});
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    api.get<LatestMetric[]>(`/api/metrics/${companyId}/latest`)
      .then((rows) => {
        if (cancelled) return;
        const next: Record<string, LatestMetric> = {};
        for (const r of rows) {
          next[r.metric_key] = r;
        }
        setMetrics(next);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return { metrics, loading, error };
}

// ── BDT Metrics (goal-aligned, backend-persisted) ─────────────────────────────

export interface BdtMetric {
  id: string;
  company_id: string;
  department_id: string | null;
  name: string;
  metric_key: string | null;
  scope: 'company' | 'department';
  value: number;
  target: number;
  baseline: number;
  unit: string;
  higher_is_better: boolean;
  trend: 'up' | 'down' | 'flat';
  alert_threshold: number | null;
  local_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BdtGoalMetricLink {
  id: string;
  goal_id: string;
  metric_id: string;
  company_id: string;
  contribution_weight: number;
  metric_name?: string;
  value?: number;
  target?: number;
  baseline?: number;
  unit?: string;
  higher_is_better?: boolean;
  trend?: string;
}

export interface BdtGoal {
  id: string;
  company_id: string;
  title: string;
  horizon: string;
  owner_id: string | null;
  local_id: string | null;
  created_at: string;
  updated_at: string;
  links: BdtGoalMetricLink[];
  progress: number | null;
}

export interface BdtMetricImpact {
  id: string;
  company_id: string;
  metric_id: string;
  task_id: string | null;
  decision_id: string | null;
  project_ref: string | null;
  estimated_delta: number;
  estimated_confidence: number;
  actual_delta: number | null;
  variance: number | null;
  local_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

export function useBdtMetrics(companyId: string | null | undefined) {
  const [metrics, setMetrics] = useState<BdtMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!companyId) return;
    setLoading(true);
    api.get<BdtMetric[]>(`/api/bdt-metrics/${companyId}/metrics`)
      .then((rows) => { setMetrics(rows); setError(null); })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => { refetch(); }, [refetch]);

  const updateMetricValue = useCallback(async (
    metricId: string,
    newValue: number,
    reason?: string,
  ) => {
    if (!companyId) return;
    await api.patch(`/api/bdt-metrics/${companyId}/metrics/${metricId}`, { value: newValue, reason });
    refetch();
  }, [companyId, refetch]);

  return { metrics, loading, error, refetch, updateMetricValue };
}

export function useBdtGoals(companyId: string | null | undefined) {
  const [goals, setGoals] = useState<BdtGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!companyId) return;
    setLoading(true);
    api.get<BdtGoal[]>(`/api/bdt-metrics/${companyId}/goals`)
      .then((rows) => { setGoals(rows); setError(null); })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => { refetch(); }, [refetch]);

  const createGoal = useCallback(async (input: {
    title: string; horizon: string; owner_id?: string;
  }) => {
    if (!companyId) return;
    await api.post(`/api/bdt-metrics/${companyId}/goals`, input);
    refetch();
  }, [companyId, refetch]);

  const deleteGoal = useCallback(async (goalId: string) => {
    if (!companyId) return;
    await api.delete(`/api/bdt-metrics/${companyId}/goals/${goalId}`);
    refetch();
  }, [companyId, refetch]);

  const addMetricLink = useCallback(async (
    goalId: string,
    metricId: string,
    contributionWeight = 1.0,
  ) => {
    if (!companyId) return;
    await api.post(`/api/bdt-metrics/${companyId}/goals/${goalId}/links`, {
      metric_id: metricId, contribution_weight: contributionWeight,
    });
    refetch();
  }, [companyId, refetch]);

  return { goals, loading, error, refetch, createGoal, deleteGoal, addMetricLink };
}

export function useBdtImpacts(companyId: string | null | undefined) {
  const [impacts, setImpacts] = useState<BdtMetricImpact[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!companyId) return;
    setLoading(true);
    api.get<BdtMetricImpact[]>(`/api/bdt-metrics/${companyId}/impacts`)
      .then((rows) => setImpacts(rows))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => { refetch(); }, [refetch]);

  const addImpact = useCallback(async (input: {
    metric_id: string;
    task_id?: string;
    project_ref?: string;
    estimated_delta: number;
    estimated_confidence: number;
    local_id?: string;
  }) => {
    if (!companyId) return null;
    const result = await api.post<BdtMetricImpact>(
      `/api/bdt-metrics/${companyId}/impacts`, input,
    );
    refetch();
    return result;
  }, [companyId, refetch]);

  const resolveImpact = useCallback(async (
    impactId: string,
    actualDelta: number,
    reason?: string,
  ) => {
    if (!companyId) return;
    await api.patch(`/api/bdt-metrics/${companyId}/impacts/${impactId}/resolve`, {
      actual_delta: actualDelta, reason,
    });
    refetch();
  }, [companyId, refetch]);

  return { impacts, loading, refetch, addImpact, resolveImpact };
}

// ── BDT helper functions (mirror of useGoalsStore helpers but for BdtMetric) ──

export function bdtMetricProgress(m: BdtMetric): number {
  const span = m.target - m.baseline;
  if (span === 0) return 100;
  return Math.max(0, Math.min(100, Math.round(((m.value - m.baseline) / span) * 100)));
}

export function bdtMetricDisplay(m: BdtMetric): string {
  if (m.unit === '$') return `$${m.value.toLocaleString()}`;
  if (m.unit === '%') return `${m.value}%`;
  if (m.unit === 'mo') return `${m.value} mo`;
  return String(m.value);
}

export function bdtMetricTargetDisplay(m: BdtMetric): string {
  if (m.unit === '$') return `$${m.target.toLocaleString()}`;
  if (m.unit === '%') return `${m.target}%`;
  if (m.unit === 'mo') return `${m.target} mo`;
  return String(m.target);
}

export function bdtMetricAlerts(metrics: BdtMetric[]): { metricId: string; name: string; progress: number; threshold: number }[] {
  return metrics
    .filter(m => m.alert_threshold != null && bdtMetricProgress(m) < m.alert_threshold!)
    .map(m => ({ metricId: m.id, name: m.name, progress: bdtMetricProgress(m), threshold: m.alert_threshold! }));
}
