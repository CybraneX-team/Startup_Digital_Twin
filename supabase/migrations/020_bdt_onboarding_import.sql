-- ================================================================
-- BDT onboarding — support full internal node types + selective import
-- ================================================================

-- Expand node_type to match frontend BDT seed (branch, action, signal)
ALTER TABLE public.department_bdt_nodes
  DROP CONSTRAINT IF EXISTS department_bdt_nodes_node_type_check;

ALTER TABLE public.department_bdt_nodes
  ADD CONSTRAINT department_bdt_nodes_node_type_check
  CHECK (node_type IN (
    'team', 'process', 'project', 'resource', 'decision', 'risk', 'metric',
    'branch', 'action', 'signal'
  ));

-- Optional: store onboarding selection on company for audit / re-sync
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS bdt_onboarding_selection JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.companies.bdt_onboarding_selection IS
  'BDT onboarding payload: { source_keys: string[], custom_labels: string[], imported_at: timestamptz }';

-- Replace seed function: only seed all 13 when no onboarding selection exists.
-- Backend POST /api/departments/import with mode=replace should call a service
-- that deletes existing departments for company and inserts full tree from JSON.

CREATE OR REPLACE FUNCTION public.clear_company_departments(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.departments WHERE company_id = p_company_id;
END;
$$;
