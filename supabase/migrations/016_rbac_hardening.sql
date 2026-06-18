-- ================================================================
-- FounderOS — RBAC hardening
-- Migration 016
-- ================================================================

DROP FUNCTION IF EXISTS public.approve_join_request(UUID, UUID, public.user_role);
DROP FUNCTION IF EXISTS public.accept_invite(TEXT, UUID);
DROP FUNCTION IF EXISTS public.join_company_as_viewer(UUID, UUID);

DROP POLICY IF EXISTS "profiles_own_write" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_own_update_basic" ON public.user_profiles;
CREATE POLICY "profiles_own_update_basic" ON public.user_profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "companies_founder_write" ON public.companies;
DROP POLICY IF EXISTS "companies_member_update" ON public.companies;

DROP POLICY IF EXISTS "members_founder_write" ON public.company_members;
DROP POLICY IF EXISTS "members_insert_admin" ON public.company_members;
DROP POLICY IF EXISTS "members_update_admin" ON public.company_members;
DROP POLICY IF EXISTS "members_delete_founder" ON public.company_members;

DROP POLICY IF EXISTS "invite_insert_admin" ON public.workspace_invites;
DROP POLICY IF EXISTS "invite_update_admin" ON public.workspace_invites;
DROP POLICY IF EXISTS "joinreq_insert_self" ON public.join_requests;
DROP POLICY IF EXISTS "joinreq_update_admin" ON public.join_requests;

DROP POLICY IF EXISTS "pipeline company members" ON public.investor_pipeline;
DROP POLICY IF EXISTS "pipeline company members read" ON public.investor_pipeline;
CREATE POLICY "pipeline company members read" ON public.investor_pipeline
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = investor_pipeline.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "updates company members" ON public.investor_updates;
DROP POLICY IF EXISTS "updates company members read" ON public.investor_updates;
CREATE POLICY "updates company members read" ON public.investor_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = investor_updates.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "mentors company members" ON public.vc_mentors;
DROP POLICY IF EXISTS "mentors company members read" ON public.vc_mentors;
CREATE POLICY "mentors company members read" ON public.vc_mentors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = vc_mentors.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "sessions company members" ON public.mentor_sessions;
DROP POLICY IF EXISTS "sessions company members read" ON public.mentor_sessions;
CREATE POLICY "sessions company members read" ON public.mentor_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = mentor_sessions.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

CREATE OR REPLACE FUNCTION public.prevent_profile_authority_self_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() = NEW.id
    AND auth.role() = 'authenticated'
    AND (
      NEW.company_id IS DISTINCT FROM OLD.company_id
      OR NEW.role IS DISTINCT FROM OLD.role
      OR NEW.onboarding_completed IS DISTINCT FROM OLD.onboarding_completed
    )
  THEN
    RAISE EXCEPTION 'company_id, role, and onboarding_completed are server-managed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_prevent_authority_self_edit ON public.user_profiles;
CREATE TRIGGER user_profiles_prevent_authority_self_edit
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_authority_self_edit();
