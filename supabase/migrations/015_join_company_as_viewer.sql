-- ================================================================
-- FounderOS — Self-join active companies as read-only viewer
-- Migration 015
-- ================================================================

CREATE OR REPLACE FUNCTION public.join_company_as_viewer(
  p_company_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company companies%ROWTYPE;
  v_profile user_profiles%ROWTYPE;
  v_existing_company_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT * INTO v_company
  FROM companies
  WHERE id = p_company_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workspace not found');
  END IF;

  SELECT * INTO v_profile
  FROM user_profiles
  WHERE id = p_user_id;

  IF FOUND AND v_profile.company_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already a company account, so you cannot join another workspace');
  END IF;

  SELECT company_id INTO v_existing_company_id
  FROM company_members
  WHERE user_id = p_user_id
    AND status = 'active'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already a company account, so you cannot join another workspace');
  END IF;

  INSERT INTO company_members (company_id, user_id, role, status, approved_at)
  VALUES (p_company_id, p_user_id, 'viewer', 'active', NOW())
  ON CONFLICT (company_id, user_id) DO UPDATE
    SET role = 'viewer',
        status = 'active',
        approved_at = COALESCE(company_members.approved_at, NOW());

  INSERT INTO user_profiles (id, company_id, role, onboarding_completed)
  VALUES (p_user_id, p_company_id, 'viewer', TRUE)
  ON CONFLICT (id) DO UPDATE
    SET company_id = EXCLUDED.company_id,
        role = 'viewer',
        onboarding_completed = TRUE,
        updated_at = NOW();

  UPDATE join_requests
  SET status = 'approved',
      reviewed_at = COALESCE(reviewed_at, NOW()),
      assigned_role = 'viewer'
  WHERE company_id = p_company_id
    AND user_id = p_user_id
    AND status = 'pending';

  RETURN jsonb_build_object(
    'success', true,
    'companyId', p_company_id,
    'role', 'viewer'
  );
END;
$$;

-- Harden invite acceptance as well: users with an existing company account
-- must not be relinked or downgraded by accepting another invite.
CREATE OR REPLACE FUNCTION public.accept_invite(p_token TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite workspace_invites%ROWTYPE;
  v_existing company_members%ROWTYPE;
  v_profile user_profiles%ROWTYPE;
  v_existing_company_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT * INTO v_profile
  FROM user_profiles
  WHERE id = p_user_id;

  IF FOUND AND v_profile.company_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already a company account, so you cannot join another workspace');
  END IF;

  SELECT company_id INTO v_existing_company_id
  FROM company_members
  WHERE user_id = p_user_id
    AND status = 'active'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already a company account, so you cannot join another workspace');
  END IF;

  SELECT * INTO v_invite
  FROM workspace_invites
  WHERE token = p_token
    AND is_active = TRUE
    AND expires_at > NOW()
    AND (max_uses = 0 OR used_count < max_uses)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite link is invalid or expired');
  END IF;

  IF v_invite.email IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users WHERE id = p_user_id AND email = v_invite.email
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'This invite was sent to a different email address');
    END IF;
  END IF;

  SELECT * INTO v_existing
  FROM company_members
  WHERE company_id = v_invite.company_id AND user_id = p_user_id;

  IF FOUND THEN
    IF v_existing.status = 'active' THEN
      RETURN jsonb_build_object('success', false, 'error', 'You are already a member of this workspace');
    END IF;

    UPDATE company_members
    SET status = 'active', role = v_invite.role, approved_at = NOW()
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO company_members (company_id, user_id, role, status, invited_by, approved_at)
    VALUES (v_invite.company_id, p_user_id, v_invite.role, 'active', v_invite.created_by, NOW());
  END IF;

  UPDATE user_profiles
  SET company_id = v_invite.company_id,
      role = v_invite.role,
      onboarding_completed = TRUE,
      updated_at = NOW()
  WHERE id = p_user_id;

  UPDATE workspace_invites
  SET used_count = used_count + 1,
      is_active = CASE WHEN used_count + 1 >= max_uses AND max_uses > 0 THEN FALSE ELSE is_active END
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'company_id', v_invite.company_id,
    'role', v_invite.role
  );
END;
$$;
