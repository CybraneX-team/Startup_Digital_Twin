-- ================================================================
-- Reference company twins: workspace-owned public-company research
-- ================================================================

CREATE TABLE IF NOT EXISTS public.reference_companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  industry_id     TEXT REFERENCES public.industries(id) ON DELETE SET NULL,
  subdomain_id    TEXT REFERENCES public.subdomains(id) ON DELETE SET NULL,
  name            TEXT,
  source_url      TEXT NOT NULL,
  canonical_url   TEXT,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'ready', 'failed')),
  last_error      TEXT,
  generated_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reference_companies_company_subdomain
  ON public.reference_companies(company_id, subdomain_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reference_companies_status
  ON public.reference_companies(status, created_at DESC)
  WHERE status IN ('pending', 'running', 'failed');

CREATE TABLE IF NOT EXISTS public.reference_company_nodes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_company_id UUID NOT NULL REFERENCES public.reference_companies(id) ON DELETE CASCADE,
  parent_node_id       UUID REFERENCES public.reference_company_nodes(id) ON DELETE CASCADE,
  node_kind            TEXT NOT NULL CHECK (node_kind IN ('root', 'branch', 'action')),
  label                TEXT NOT NULL,
  summary              TEXT,
  node_type            TEXT CHECK (node_type IN ('information', 'metric', 'signal', 'relationship', 'evidence', 'decision')),
  relevance            INTEGER NOT NULL DEFAULT 75 CHECK (relevance BETWEEN 0 AND 100),
  confidence           NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  color                TEXT,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reference_company_nodes_tree
  ON public.reference_company_nodes(reference_company_id, parent_node_id, sort_order);

CREATE TABLE IF NOT EXISTS public.reference_company_sources (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_company_id UUID NOT NULL REFERENCES public.reference_companies(id) ON DELETE CASCADE,
  node_id              UUID REFERENCES public.reference_company_nodes(id) ON DELETE CASCADE,
  url                  TEXT NOT NULL,
  title                TEXT,
  snippet              TEXT,
  retrieved_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reference_company_sources_company
  ON public.reference_company_sources(reference_company_id, node_id);

CREATE TABLE IF NOT EXISTS public.reference_company_jobs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_company_id UUID NOT NULL REFERENCES public.reference_companies(id) ON DELETE CASCADE,
  company_id           UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind                 TEXT NOT NULL DEFAULT 'generate'
                       CHECK (kind IN ('generate', 'refresh')),
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  payload              JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts             INTEGER NOT NULL DEFAULT 0,
  max_attempts         INTEGER NOT NULL DEFAULT 3,
  locked_until         TIMESTAMPTZ,
  locked_by            TEXT,
  last_error           TEXT,
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reference_company_jobs_pickup
  ON public.reference_company_jobs(status, created_at)
  WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS idx_reference_company_jobs_company
  ON public.reference_company_jobs(company_id, created_at DESC);

ALTER TABLE public.reference_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_company_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_company_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_company_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reference_companies_company_read ON public.reference_companies;
CREATE POLICY reference_companies_company_read ON public.reference_companies
  FOR SELECT USING (company_id = public.auth_company_id());

DROP POLICY IF EXISTS reference_company_nodes_company_read ON public.reference_company_nodes;
CREATE POLICY reference_company_nodes_company_read ON public.reference_company_nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reference_companies rc
      WHERE rc.id = reference_company_id
        AND rc.company_id = public.auth_company_id()
    )
  );

DROP POLICY IF EXISTS reference_company_sources_company_read ON public.reference_company_sources;
CREATE POLICY reference_company_sources_company_read ON public.reference_company_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reference_companies rc
      WHERE rc.id = reference_company_id
        AND rc.company_id = public.auth_company_id()
    )
  );

DROP POLICY IF EXISTS reference_company_jobs_company_read ON public.reference_company_jobs;
CREATE POLICY reference_company_jobs_company_read ON public.reference_company_jobs
  FOR SELECT USING (company_id = public.auth_company_id());

DROP TABLE IF EXISTS public.catalog_companies CASCADE;
