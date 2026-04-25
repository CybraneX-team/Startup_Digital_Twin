-- ================================================================
-- FounderOS — Fix recursive RLS on company_members
-- Migration 006
--
-- The previous company_members SELECT policies were self-referential:
--   USING (company_id IN (SELECT company_id FROM company_members ...))
-- PostgreSQL detects this as infinite recursion and throws an error,
-- which breaks any query that touches company_members (RBAC, team
-- pages, onboarding auto-recovery, etc.).
--
-- Fix: introduce a SECURITY DEFINER helper function that reads
-- company_ids for the current user WITHOUT triggering RLS, then
-- reference that function from all affected policies.
-- ================================================================

-- ----------------------------------------------------------------
-- Helper: returns all company_ids the current JWT user belongs to.
-- SECURITY DEFINER → runs as the function owner, bypassing RLS
-- on company_members (safe because we still filter by auth.uid()).
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_company_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM company_members WHERE user_id = auth.uid();
$$;

-- ----------------------------------------------------------------
-- company_members: drop old recursive policies, add correct ones
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "members_company_read"    ON company_members;
DROP POLICY IF EXISTS "members_select"          ON company_members;
DROP POLICY IF EXISTS "members_founder_write"   ON company_members;
DROP POLICY IF EXISTS "members_insert_admin"    ON company_members;
DROP POLICY IF EXISTS "members_update_admin"    ON company_members;
DROP POLICY IF EXISTS "members_delete_founder"  ON company_members;

-- Read: members of the same company (non-recursive via helper)
CREATE POLICY "members_company_read" ON company_members
  FOR SELECT USING (
    company_id IN (SELECT current_user_company_ids())
  );

-- Insert: only founders/admins of the target company
CREATE POLICY "members_insert_admin" ON company_members
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status  = 'active'
        AND cm.role   IN ('founder', 'co_founder', 'admin', 'super_admin')
        AND cm.company_id = company_id
    )
    -- allow inserting your own first row (company creation)
    OR user_id = auth.uid()
  );

-- Update: only founders/admins of the target company
CREATE POLICY "members_update_admin" ON company_members
  FOR UPDATE USING (
    company_id IN (SELECT current_user_company_ids())
    AND company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status  = 'active'
        AND cm.role   IN ('founder', 'co_founder', 'admin', 'super_admin')
    )
  );

-- Delete: only founders of the target company
CREATE POLICY "members_delete_founder" ON company_members
  FOR DELETE USING (
    company_id IN (SELECT current_user_company_ids())
    AND company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status  = 'active'
        AND cm.role   IN ('founder', 'co_founder', 'super_admin')
    )
  );

-- ----------------------------------------------------------------
-- user_profiles: fix profiles_own_read to use the helper
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_own_read" ON user_profiles;

CREATE POLICY "profiles_own_read" ON user_profiles
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (
      SELECT user_id FROM company_members
      WHERE company_id IN (SELECT current_user_company_ids())
    )
  );

-- ----------------------------------------------------------------
-- workspace_invites / join_requests: update policies to use helper
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "invite_select_member"  ON workspace_invites;
DROP POLICY IF EXISTS "invite_insert_admin"   ON workspace_invites;
DROP POLICY IF EXISTS "invite_update_admin"   ON workspace_invites;

CREATE POLICY "invite_select_member" ON workspace_invites
  FOR SELECT USING (
    company_id IN (SELECT current_user_company_ids())
  );

CREATE POLICY "invite_insert_admin" ON workspace_invites
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status  = 'active'
        AND cm.role   IN ('founder', 'co_founder', 'admin', 'super_admin')
    )
  );

CREATE POLICY "invite_update_admin" ON workspace_invites
  FOR UPDATE USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status  = 'active'
        AND cm.role   IN ('founder', 'co_founder', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "joinreq_select_admin"  ON join_requests;
DROP POLICY IF EXISTS "joinreq_update_admin"  ON join_requests;

CREATE POLICY "joinreq_select_admin" ON join_requests
  FOR SELECT USING (
    user_id = auth.uid()
    OR company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status  = 'active'
        AND cm.role   IN ('founder', 'co_founder', 'admin', 'super_admin')
    )
  );

CREATE POLICY "joinreq_update_admin" ON join_requests
  FOR UPDATE USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status  = 'active'
        AND cm.role   IN ('founder', 'co_founder', 'admin', 'super_admin')
    )
  );
