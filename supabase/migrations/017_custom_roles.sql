-- ================================================================
-- FounderOS — DB-backed custom RBAC roles
-- Migration 017
-- ================================================================

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS base_role_id TEXT REFERENCES public.roles(id),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.roles
  ALTER COLUMN is_system SET DEFAULT false,
  ALTER COLUMN is_archived SET DEFAULT false;

DROP POLICY IF EXISTS "roles_public_read" ON public.roles;
DROP POLICY IF EXISTS "roles_authenticated_read" ON public.roles;

-- These policies compare role columns against the user_role enum, which blocks
-- the enum -> TEXT conversions below. Drop them first; recreated as TEXT afterward.
DROP POLICY IF EXISTS members_write ON public.company_members;
DROP POLICY IF EXISTS joinreq_select_admin ON public.join_requests;

ALTER TABLE public.user_profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.user_profiles ALTER COLUMN role TYPE TEXT USING role::TEXT;
ALTER TABLE public.user_profiles ALTER COLUMN role SET DEFAULT 'viewer';

ALTER TABLE public.company_members ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.company_members ALTER COLUMN role TYPE TEXT USING role::TEXT;
ALTER TABLE public.company_members ALTER COLUMN role SET DEFAULT 'viewer';

ALTER TABLE public.workspace_invites ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.workspace_invites ALTER COLUMN role TYPE TEXT USING role::TEXT;
ALTER TABLE public.workspace_invites ALTER COLUMN role SET DEFAULT 'viewer';

ALTER TABLE public.join_requests ALTER COLUMN requested_role DROP DEFAULT;
ALTER TABLE public.join_requests ALTER COLUMN requested_role TYPE TEXT USING requested_role::TEXT;
ALTER TABLE public.join_requests ALTER COLUMN requested_role SET DEFAULT 'viewer';
ALTER TABLE public.join_requests ALTER COLUMN assigned_role TYPE TEXT USING assigned_role::TEXT;

-- Recreate the policies dropped above, now comparing role as TEXT.
CREATE POLICY members_write ON public.company_members
  FOR INSERT TO public
  WITH CHECK (
    ((user_id = auth.uid()) AND (role = 'founder'))
    OR (company_id IN (SELECT my_company_ids() AS my_company_ids))
  );

CREATE POLICY joinreq_select_admin ON public.join_requests
  FOR SELECT TO public
  USING (
    (user_id = auth.uid())
    OR (company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'active'::member_status
        AND cm.role = ANY (ARRAY['founder', 'co_founder', 'admin', 'super_admin'])
    ))
  );

INSERT INTO public.roles (id, company_id, name, description, permissions, is_system, is_archived)
VALUES
('super_admin', NULL, 'Super Admin', 'Platform-level administrator', '{
  "*": {"read": true, "write": true, "delete": true}
}'::jsonb, true, false),
('founder', NULL, 'Founder', 'Company founder', '{
  "twin":       {"read": true, "write": true, "delete": false},
  "strategy":   {"read": true, "write": true, "delete": true},
  "analytics":  {"read": true, "write": true, "delete": false},
  "data":       {"read": true, "write": true, "delete": false},
  "benchmarks": {"read": true, "write": false, "delete": false},
  "team":       {"read": true, "write": true, "delete": true},
  "ecosystem":  {"read": true, "write": true, "delete": false},
  "settings":   {"read": true, "write": true, "delete": false}
}'::jsonb, true, false),
('co_founder', NULL, 'Co-Founder', 'Company co-founder', '{
  "twin":       {"read": true, "write": true, "delete": false},
  "strategy":   {"read": true, "write": true, "delete": true},
  "analytics":  {"read": true, "write": true, "delete": false},
  "data":       {"read": true, "write": true, "delete": false},
  "benchmarks": {"read": true, "write": false, "delete": false},
  "team":       {"read": true, "write": true, "delete": false},
  "ecosystem":  {"read": true, "write": true, "delete": false},
  "settings":   {"read": true, "write": false, "delete": false}
}'::jsonb, true, false),
('admin', NULL, 'Admin', 'Team administrator', '{
  "twin":       {"read": true, "write": true, "delete": false},
  "strategy":   {"read": true, "write": true, "delete": false},
  "analytics":  {"read": true, "write": true, "delete": false},
  "data":       {"read": true, "write": true, "delete": false},
  "benchmarks": {"read": true, "write": false, "delete": false},
  "team":       {"read": true, "write": true, "delete": false},
  "ecosystem":  {"read": true, "write": false, "delete": false},
  "settings":   {"read": true, "write": false, "delete": false}
}'::jsonb, true, false),
('analyst', NULL, 'Analyst', 'Strategy and analytics contributor', '{
  "twin":       {"read": true, "write": false, "delete": false},
  "strategy":   {"read": true, "write": true, "delete": false},
  "analytics":  {"read": true, "write": true, "delete": false},
  "data":       {"read": true, "write": false, "delete": false},
  "benchmarks": {"read": true, "write": false, "delete": false},
  "team":       {"read": true, "write": false, "delete": false},
  "ecosystem":  {"read": true, "write": false, "delete": false},
  "settings":   {"read": false, "write": false, "delete": false}
}'::jsonb, true, false),
('engineer', NULL, 'Engineer', 'Data and technical contributor', '{
  "twin":       {"read": true, "write": false, "delete": false},
  "strategy":   {"read": true, "write": false, "delete": false},
  "analytics":  {"read": true, "write": false, "delete": false},
  "data":       {"read": true, "write": true, "delete": false},
  "benchmarks": {"read": true, "write": false, "delete": false},
  "team":       {"read": true, "write": false, "delete": false},
  "ecosystem":  {"read": false, "write": false, "delete": false},
  "settings":   {"read": false, "write": false, "delete": false}
}'::jsonb, true, false),
('viewer', NULL, 'Viewer', 'Read-only team member', '{
  "twin":       {"read": true, "write": false, "delete": false},
  "strategy":   {"read": true, "write": false, "delete": false},
  "analytics":  {"read": true, "write": false, "delete": false},
  "data":       {"read": true, "write": false, "delete": false},
  "benchmarks": {"read": true, "write": false, "delete": false},
  "team":       {"read": true, "write": false, "delete": false},
  "ecosystem":  {"read": true, "write": false, "delete": false},
  "settings":   {"read": false, "write": false, "delete": false}
}'::jsonb, true, false),
('investor', NULL, 'Investor', 'Investor-facing read-only role', '{
  "twin":       {"read": true, "write": false, "delete": false},
  "strategy":   {"read": false, "write": false, "delete": false},
  "analytics":  {"read": true, "write": false, "delete": false},
  "data":       {"read": false, "write": false, "delete": false},
  "benchmarks": {"read": true, "write": false, "delete": false},
  "team":       {"read": true, "write": false, "delete": false},
  "ecosystem":  {"read": false, "write": false, "delete": false},
  "settings":   {"read": false, "write": false, "delete": false}
}'::jsonb, true, false)
ON CONFLICT (id) DO UPDATE SET
  company_id = NULL,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = true,
  is_archived = false,
  updated_at = NOW();

UPDATE public.user_profiles
   SET role = 'viewer'
 WHERE role NOT IN (SELECT id FROM public.roles);

UPDATE public.company_members
   SET role = 'viewer'
 WHERE role NOT IN (SELECT id FROM public.roles);

UPDATE public.workspace_invites
   SET role = 'viewer'
 WHERE role NOT IN (SELECT id FROM public.roles);

UPDATE public.join_requests
   SET requested_role = 'viewer'
 WHERE requested_role NOT IN (SELECT id FROM public.roles);

UPDATE public.join_requests
   SET assigned_role = NULL
 WHERE assigned_role IS NOT NULL
   AND assigned_role NOT IN (SELECT id FROM public.roles);

CREATE INDEX IF NOT EXISTS idx_roles_company_active
  ON public.roles(company_id, is_archived)
  WHERE company_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_role_fk') THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_role_fk FOREIGN KEY (role) REFERENCES public.roles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_members_role_fk') THEN
    ALTER TABLE public.company_members
      ADD CONSTRAINT company_members_role_fk FOREIGN KEY (role) REFERENCES public.roles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_invites_role_fk') THEN
    ALTER TABLE public.workspace_invites
      ADD CONSTRAINT workspace_invites_role_fk FOREIGN KEY (role) REFERENCES public.roles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'join_requests_requested_role_fk') THEN
    ALTER TABLE public.join_requests
      ADD CONSTRAINT join_requests_requested_role_fk FOREIGN KEY (requested_role) REFERENCES public.roles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'join_requests_assigned_role_fk') THEN
    ALTER TABLE public.join_requests
      ADD CONSTRAINT join_requests_assigned_role_fk FOREIGN KEY (assigned_role) REFERENCES public.roles(id);
  END IF;
END $$;
