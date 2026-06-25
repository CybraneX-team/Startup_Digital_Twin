-- ================================================================
-- Reference companies: classification, scoring, dynamic roots
-- ================================================================

ALTER TABLE public.reference_companies
  ADD COLUMN IF NOT EXISTS classification TEXT
    CHECK (classification IN ('competitor', 'customer', 'collaborator')),
  ADD COLUMN IF NOT EXISTS scores JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.reference_company_nodes
  ADD COLUMN IF NOT EXISTS is_dynamic BOOLEAN NOT NULL DEFAULT false;

-- Replace kind check to include 'classify' jobs
ALTER TABLE public.reference_company_jobs
  DROP CONSTRAINT IF EXISTS reference_company_jobs_kind_check;

ALTER TABLE public.reference_company_jobs
  ADD CONSTRAINT reference_company_jobs_kind_check
    CHECK (kind IN ('generate', 'refresh', 'classify'));
