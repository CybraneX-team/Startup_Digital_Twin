import { expect, test } from '@playwright/test';
import {
  cleanupAuthUsersByEmailFragment,
  signInUser,
  withRbacFixture,
} from './helpers/fixture';
import { READ_ONLY_TEAM_ROLES, TEAM_WRITE_ROLES } from './helpers/permissions';

test.describe('RBAC backend API contract', () => {
  test('protected RBAC endpoints reject missing and invalid JWTs', async ({ request }) => {
    await withRbacFixture(test.info(), async (fixture) => {
      const missing = await request.get(`${fixture.env.backendUrl}/api/join-requests`);
      expect(missing.status()).toBe(401);

      const invalid = await request.get(`${fixture.env.backendUrl}/api/join-requests`, {
        headers: { Authorization: 'Bearer not-a-real-token' },
      });
      expect(invalid.status()).toBe(401);
    });
  });

  test('team-write roles can create email invites and read-only roles cannot', async ({ request }) => {
    await withRbacFixture(test.info(), async (fixture) => {
      try {
        for (const role of TEAM_WRITE_ROLES) {
          const { accessToken } = await signInUser(fixture.users[role]);
          const response = await request.post(`${fixture.env.backendUrl}/api/company-invites`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            data: {
              email: `rbac-e2e+${fixture.runId}-invite-${role}@example.com`,
            },
          });

          expect(response.status(), `${role} should be allowed to invite`).toBe(200);
        }

        for (const role of READ_ONLY_TEAM_ROLES) {
          const { accessToken } = await signInUser(fixture.users[role]);
          const response = await request.post(`${fixture.env.backendUrl}/api/company-invites`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            data: {
              email: `rbac-e2e+${fixture.runId}-blocked-invite-${role}@example.com`,
            },
          });

          expect(response.status(), `${role} should not be allowed to invite`).toBe(403);
        }
      } finally {
        await cleanupAuthUsersByEmailFragment(fixture.admin, `rbac-e2e+${fixture.runId}-invite`);
        await cleanupAuthUsersByEmailFragment(fixture.admin, `rbac-e2e+${fixture.runId}-blocked-invite`);
      }
    });
  });

  test('read-only team roles cannot list pending join requests through the backend', async ({ request }) => {
    await withRbacFixture(test.info(), async (fixture) => {
      for (const role of READ_ONLY_TEAM_ROLES) {
        const { accessToken } = await signInUser(fixture.users[role]);
        const response = await request.get(`${fixture.env.backendUrl}/api/join-requests`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        expect(response.status(), `${role} should not list pending join requests`).toBe(403);
      }
    });
  });

  test('unrelated users cannot trigger join-request notifications', async ({ request }) => {
    await withRbacFixture(test.info(), async (fixture) => {
      const { accessToken } = await signInUser(fixture.users.viewer);
      const response = await request.post(
        `${fixture.env.backendUrl}/api/join-requests/${fixture.pendingRequestId}/notify`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      expect(response.status()).toBe(403);
    });
  });
});
