-- ================================================================
-- BDT node members — real company member assignments to team nodes
-- ================================================================

CREATE TABLE IF NOT EXISTS public.department_node_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id     UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  node_id           UUID NOT NULL REFERENCES public.department_bdt_nodes(id) ON DELETE CASCADE,
  company_member_id UUID NOT NULL REFERENCES public.company_members(id) ON DELETE CASCADE,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (node_id, company_member_id)
);

CREATE INDEX IF NOT EXISTS idx_department_node_members_company_node
  ON public.department_node_members(company_id, node_id);

CREATE INDEX IF NOT EXISTS idx_department_node_members_company_member
  ON public.department_node_members(company_id, company_member_id);

ALTER TABLE public.department_node_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS department_node_members_read ON public.department_node_members;
CREATE POLICY department_node_members_read ON public.department_node_members
  FOR SELECT USING (public.can_read_department(company_id, department_id));
