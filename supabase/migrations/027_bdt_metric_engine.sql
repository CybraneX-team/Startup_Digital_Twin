-- 027_bdt_metric_engine.sql
-- Metric Impact Engine: persists BDT goals, metrics, impacts, and propagation results server-side.
-- Separate from normalized_metrics (ingestion lineage) and metric_snapshots (integration blobs).

-- ── bdt_metrics ────────────────────────────────────────────────────────────────
-- Goal-aligned in-app metrics. Each row is a measurable KPI with a baseline,
-- target, and current value. Linked to a department when scope = 'department'.
CREATE TABLE IF NOT EXISTS public.bdt_metrics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id    UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  metric_key       TEXT,                         -- soft-link to metric_definitions.metric_key
  scope            TEXT NOT NULL CHECK (scope IN ('company', 'department')),
  value            NUMERIC NOT NULL DEFAULT 0,
  target           NUMERIC NOT NULL DEFAULT 0,
  baseline         NUMERIC NOT NULL DEFAULT 0,
  unit             TEXT NOT NULL DEFAULT '',     -- '$', '%', 'mo', ''
  higher_is_better BOOLEAN NOT NULL DEFAULT TRUE,
  trend            TEXT NOT NULL DEFAULT 'flat' CHECK (trend IN ('up', 'down', 'flat')),
  alert_threshold  NUMERIC,                      -- warn when progress % drops below this
  local_id         TEXT,                         -- localStorage ID for migration reconciliation
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bdt_metrics_company    ON public.bdt_metrics (company_id);
CREATE INDEX IF NOT EXISTS idx_bdt_metrics_department ON public.bdt_metrics (department_id);

-- ── bdt_metric_history ─────────────────────────────────────────────────────────
-- Append-only log of value changes. Replaces pushHistory() in localStorage.
CREATE TABLE IF NOT EXISTS public.bdt_metric_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id  UUID NOT NULL REFERENCES public.bdt_metrics(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  old_value  NUMERIC NOT NULL,
  new_value  NUMERIC NOT NULL,
  reason     TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bdt_metric_history ON public.bdt_metric_history (metric_id, changed_at DESC);

-- ── bdt_goals ──────────────────────────────────────────────────────────────────
-- Goals persisted to DB. A goal can drive multiple metrics (via bdt_goal_metric_links).
CREATE TABLE IF NOT EXISTS public.bdt_goals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  horizon    TEXT NOT NULL CHECK (horizon IN (
    'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'round', '3yr', 'long_term'
  )),
  owner_id   UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  local_id   TEXT,                               -- localStorage ID for migration reconciliation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bdt_goals_company ON public.bdt_goals (company_id);

-- ── bdt_goal_metric_links ──────────────────────────────────────────────────────
-- Many-to-many: a goal can link to multiple metrics with contribution weights.
-- Replaces the single Goal.metricId field from localStorage.
-- Weights need not sum to 1; computation normalises: sum(w×progress)/sum(w).
CREATE TABLE IF NOT EXISTS public.bdt_goal_metric_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id             UUID NOT NULL REFERENCES public.bdt_goals(id) ON DELETE CASCADE,
  metric_id           UUID NOT NULL REFERENCES public.bdt_metrics(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL,
  contribution_weight NUMERIC NOT NULL DEFAULT 1.0
    CHECK (contribution_weight > 0 AND contribution_weight <= 1.0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (goal_id, metric_id)
);

CREATE INDEX IF NOT EXISTS idx_goal_metric_links_goal   ON public.bdt_goal_metric_links (goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_metric_links_metric ON public.bdt_goal_metric_links (metric_id);

-- ── bdt_metric_impacts ─────────────────────────────────────────────────────────
-- Tracks estimated vs actual impact of tasks or decisions on a metric.
-- task_id / decision_id / project_ref are soft refs to localStorage IDs (TEXT, no FK).
CREATE TABLE IF NOT EXISTS public.bdt_metric_impacts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  metric_id            UUID NOT NULL REFERENCES public.bdt_metrics(id) ON DELETE CASCADE,
  task_id              TEXT,                     -- localStorage task ID
  decision_id          TEXT,
  project_ref          TEXT,                     -- localStorage project ID (no FK until projects table exists)
  estimated_delta      NUMERIC NOT NULL,
  estimated_confidence NUMERIC NOT NULL CHECK (estimated_confidence BETWEEN 0 AND 100),
  actual_delta         NUMERIC,
  variance             NUMERIC,
  created_by           UUID REFERENCES auth.users(id),
  local_id             TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at          TIMESTAMPTZ,
  CONSTRAINT resolved_requires_actual CHECK (resolved_at IS NULL OR actual_delta IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_bdt_impacts_company ON public.bdt_metric_impacts (company_id);
CREATE INDEX IF NOT EXISTS idx_bdt_impacts_metric  ON public.bdt_metric_impacts (metric_id);

-- ── companies.strategic_score ──────────────────────────────────────────────────
-- Cached result of weighted goal-progress computation. Updated by propagation logic
-- whenever a metric value changes. NULL means not yet computed.
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS strategic_score NUMERIC DEFAULT NULL;
