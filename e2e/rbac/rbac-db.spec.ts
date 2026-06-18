import { expect, test } from '@playwright/test';
import { signInUser, withRbacFixture } from './helpers/fixture';

test.describe('RBAC Supabase/RLS contract', () => {
  test('team manager can approve a pending join request', async () => {
    await withRbacFixture(test.info(), async (fixture) => {
      const { client } = await signInUser(fixture.users.founder);

      const { error } = await client.rpc('approve_join_request', {
        p_request_id: fixture.pendingRequestId,
        p_reviewer_id: fixture.users.founder.id,
        p_assigned_role: 'viewer',
      });

      expect(error).toBeFalsy();

      const { data: requestRow } = await fixture.admin
        .from('join_requests')
        .select('status, reviewed_by, assigned_role')
        .eq('id', fixture.pendingRequestId)
        .single();
      expect(requestRow?.status).toBe('approved');
      expect(requestRow?.reviewed_by).toBe(fixture.users.founder.id);
      expect(requestRow?.assigned_role).toBe('viewer');

      const { data: memberRow } = await fixture.admin
        .from('company_members')
        .select('role, status')
        .eq('company_id', fixture.companyId)
        .eq('user_id', fixture.pendingUser.id)
        .single();
      expect(memberRow?.role).toBe('viewer');
      expect(memberRow?.status).toBe('active');
    });
  });

  test('users cannot self-escalate through user_profiles.role', async () => {
    await withRbacFixture(test.info(), async (fixture) => {
      const { client } = await signInUser(fixture.users.viewer);

      const { error } = await client
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('id', fixture.users.viewer.id);

      expect.soft(error, 'viewer profile role update should be rejected').toBeTruthy();

      const { data: profile } = await fixture.admin
        .from('user_profiles')
        .select('role')
        .eq('id', fixture.users.viewer.id)
        .single();
      expect(profile?.role).toBe('viewer');
    });
  });

  test('read-only team members cannot change another member role directly', async () => {
    await withRbacFixture(test.info(), async (fixture) => {
      const { client } = await signInUser(fixture.users.viewer);

      const { error } = await client
        .from('company_members')
        .update({ role: 'admin' })
        .eq('company_id', fixture.companyId)
        .eq('user_id', fixture.users.analyst.id);

      expect(error, 'viewer company_members role update should be rejected').toBeTruthy();

      const { data: member } = await fixture.admin
        .from('company_members')
        .select('role')
        .eq('company_id', fixture.companyId)
        .eq('user_id', fixture.users.analyst.id)
        .single();
      expect(member?.role).toBe('analyst');
    });
  });

  test('read-only team members cannot approve join requests through RPC', async () => {
    await withRbacFixture(test.info(), async (fixture) => {
      const { client } = await signInUser(fixture.users.viewer);

      const { error } = await client.rpc('approve_join_request', {
        p_request_id: fixture.pendingRequestId,
        p_reviewer_id: fixture.users.viewer.id,
        p_assigned_role: 'admin',
      });

      expect.soft(error, 'viewer approve_join_request call should be rejected').toBeTruthy();

      const { data: requestRow } = await fixture.admin
        .from('join_requests')
        .select('status, assigned_role')
        .eq('id', fixture.pendingRequestId)
        .single();
      expect(requestRow?.status).toBe('pending');
      expect(requestRow?.assigned_role).toBeNull();

      const { count } = await fixture.admin
        .from('company_members')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', fixture.companyId)
        .eq('user_id', fixture.pendingUser.id);
      expect(count).toBe(0);
    });
  });

  test('read-only ecosystem users cannot write investor pipeline rows', async () => {
    await withRbacFixture(test.info(), async (fixture) => {
      const { client } = await signInUser(fixture.users.viewer);

      const { data, error } = await client
        .from('investor_pipeline')
        .insert({
          company_id: fixture.companyId,
          created_by: fixture.users.viewer.id,
          custom_name: `RBAC E2E blocked investor ${fixture.runId}`,
          custom_firm: 'RBAC E2E',
          status: 'prospect',
        })
        .select('id')
        .maybeSingle();

      expect.soft(error, 'viewer investor_pipeline insert should be rejected').toBeTruthy();

      const { count } = await fixture.admin
        .from('investor_pipeline')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', fixture.companyId)
        .eq('custom_name', `RBAC E2E blocked investor ${fixture.runId}`);
      expect(count).toBe(0);

      if (data?.id) {
        await fixture.admin.from('investor_pipeline').delete().eq('id', data.id);
      }
    });
  });

  test('every role offered by the UI is valid in persisted membership tables', async () => {
    await withRbacFixture(test.info(), async (fixture) => {
      const target = fixture.users.investor;

      const profileUpdate = await fixture.admin
        .from('user_profiles')
        .update({ role: 'vc' })
        .eq('id', target.id);
      const memberUpdate = await fixture.admin
        .from('company_members')
        .update({ role: 'vc' })
        .eq('company_id', fixture.companyId)
        .eq('user_id', target.id);

      expect.soft(profileUpdate.error, 'user_profiles should accept vc because the UI offers it').toBeFalsy();
      expect.soft(memberUpdate.error, 'company_members should accept vc because the UI offers it').toBeFalsy();
    });
  });
});
