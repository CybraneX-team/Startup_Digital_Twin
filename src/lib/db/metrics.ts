import { useEffect, useState } from 'react';
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
    if (!companyId) {
      setMetrics({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
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

