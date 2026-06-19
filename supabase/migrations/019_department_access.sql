-- ================================================================
-- FounderOS — Department-scoped BDT access grants
-- ================================================================

CREATE TABLE IF NOT EXISTS public.department_role_grants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  role_id       TEXT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  read          BOOLEAN NOT NULL DEFAULT false,
  write         BOOLEAN NOT NULL DEFAULT false,
  "delete"      BOOLEAN NOT NULL DEFAULT false,
  manage        BOOLEAN NOT NULL DEFAULT false,
  created_by    UUID REFERENCES auth.users(id),
  updated_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, department_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.department_member_grants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES public.company_members(id) ON DELETE CASCADE,
  read          BOOLEAN NOT NULL DEFAULT false,
  write         BOOLEAN NOT NULL DEFAULT false,
  "delete"      BOOLEAN NOT NULL DEFAULT false,
  manage        BOOLEAN NOT NULL DEFAULT false,
  created_by    UUID REFERENCES auth.users(id),
  updated_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, department_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_department_role_grants_role
  ON public.department_role_grants(company_id, role_id);

CREATE INDEX IF NOT EXISTS idx_department_member_grants_member
  ON public.department_member_grants(company_id, member_id);

ALTER TABLE public.department_role_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_member_grants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_member_id(p_company_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cm.id
    FROM public.company_members cm
   WHERE cm.company_id = p_company_id
     AND cm.user_id = auth.uid()
     AND cm.status = 'active'
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_member_role(p_company_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cm.role
    FROM public.company_members cm
   WHERE cm.company_id = p_company_id
     AND cm.user_id = auth.uid()
     AND cm.status = 'active'
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_read_department(p_company_id UUID, p_department_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.company_members cm
     WHERE cm.company_id = p_company_id
       AND cm.user_id = auth.uid()
       AND cm.status = 'active'
       AND (
         cm.role IN ('founder', 'super_admin')
         OR cm.department_id = p_department_id
         OR EXISTS (
           SELECT 1 FROM public.department_role_grants drg
            WHERE drg.company_id = p_company_id
              AND drg.department_id = p_department_id
              AND drg.role_id = cm.role
              AND drg.read = true
         )
         OR EXISTS (
           SELECT 1 FROM public.department_member_grants dmg
            WHERE dmg.company_id = p_company_id
              AND dmg.department_id = p_department_id
              AND dmg.member_id = cm.id
              AND dmg.read = true
         )
       )
  )
$$;

DROP POLICY IF EXISTS departments_company_read ON public.departments;
DROP POLICY IF EXISTS departments_access_read ON public.departments;
CREATE POLICY departments_access_read ON public.departments
  FOR SELECT USING (public.can_read_department(company_id, id));

DROP POLICY IF EXISTS department_nodes_company_read ON public.department_bdt_nodes;
DROP POLICY IF EXISTS department_nodes_access_read ON public.department_bdt_nodes;
CREATE POLICY department_nodes_access_read ON public.department_bdt_nodes
  FOR SELECT USING (public.can_read_department(company_id, department_id));

DROP POLICY IF EXISTS department_detail_read ON public.department_teams;
DROP POLICY IF EXISTS department_teams_access_read ON public.department_teams;
CREATE POLICY department_teams_access_read ON public.department_teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.department_bdt_nodes n
       WHERE n.id = node_id
         AND public.can_read_department(n.company_id, n.department_id)
    )
  );

DROP POLICY IF EXISTS department_projects_read ON public.department_projects;
DROP POLICY IF EXISTS department_projects_access_read ON public.department_projects;
CREATE POLICY department_projects_access_read ON public.department_projects
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.department_bdt_nodes n WHERE n.id = node_id AND public.can_read_department(n.company_id, n.department_id)));

DROP POLICY IF EXISTS department_processes_read ON public.department_processes;
DROP POLICY IF EXISTS department_processes_access_read ON public.department_processes;
CREATE POLICY department_processes_access_read ON public.department_processes
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.department_bdt_nodes n WHERE n.id = node_id AND public.can_read_department(n.company_id, n.department_id)));

DROP POLICY IF EXISTS department_resources_read ON public.department_resources;
DROP POLICY IF EXISTS department_resources_access_read ON public.department_resources;
CREATE POLICY department_resources_access_read ON public.department_resources
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.department_bdt_nodes n WHERE n.id = node_id AND public.can_read_department(n.company_id, n.department_id)));

DROP POLICY IF EXISTS department_decisions_read ON public.department_decisions;
DROP POLICY IF EXISTS department_decisions_access_read ON public.department_decisions;
CREATE POLICY department_decisions_access_read ON public.department_decisions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.department_bdt_nodes n WHERE n.id = node_id AND public.can_read_department(n.company_id, n.department_id)));

DROP POLICY IF EXISTS department_risks_read ON public.department_risks;
DROP POLICY IF EXISTS department_risks_access_read ON public.department_risks;
CREATE POLICY department_risks_access_read ON public.department_risks
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.department_bdt_nodes n WHERE n.id = node_id AND public.can_read_department(n.company_id, n.department_id)));

DROP POLICY IF EXISTS department_metric_links_read ON public.department_metric_links;
DROP POLICY IF EXISTS department_metric_links_access_read ON public.department_metric_links;
CREATE POLICY department_metric_links_access_read ON public.department_metric_links
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.department_bdt_nodes n WHERE n.id = node_id AND public.can_read_department(n.company_id, n.department_id)));

DROP POLICY IF EXISTS department_role_grants_read ON public.department_role_grants;
CREATE POLICY department_role_grants_read ON public.department_role_grants
  FOR SELECT USING (public.can_read_department(company_id, department_id));

DROP POLICY IF EXISTS department_member_grants_read ON public.department_member_grants;
CREATE POLICY department_member_grants_read ON public.department_member_grants
  FOR SELECT USING (public.can_read_department(company_id, department_id));
