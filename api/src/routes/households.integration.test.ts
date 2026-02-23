import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { forceExpireInvitationForTests } from '../data/repositories/InMemoryHouseholdRepository.js';

const defaultHeaders = {
  'x-user-id': 'user-2',
  'x-user-email': 'ben@example.com',
  'x-user-first-name': 'Ben',
  'x-user-last-name': 'Martin',
};

const withUser = (input: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}): Record<string, string> => ({
  'x-user-id': input.userId,
  'x-user-email': input.email,
  'x-user-first-name': input.firstName,
  'x-user-last-name': input.lastName,
});

const wait = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

describe('Household onboarding integration', () => {
  it('creator becomes caregiver automatically', async () => {
    const app = buildApp();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/households',
      headers: withUser({
        userId: 'user-creator-int',
        email: 'creator.int@example.com',
        firstName: 'Iris',
        lastName: 'Nova',
      }),
      payload: { name: 'Nova Home' },
    });

    expect(createResponse.statusCode).toBe(201);
    const createData = createResponse.json().data as { id: string };

    const overviewResponse = await app.inject({
      method: 'GET',
      url: `/v1/households/${createData.id}/overview`,
      headers: withUser({
        userId: 'user-creator-int',
        email: 'creator.int@example.com',
        firstName: 'Iris',
        lastName: 'Nova',
      }),
    });

    expect(overviewResponse.statusCode).toBe(200);
    expect(overviewResponse.json().data.caregiversCount).toBeGreaterThanOrEqual(1);

    await app.close();
  });

  it('bulk invite creates records, resolves deep-link role, accepts without token, and handles duplicate acceptance', async () => {
    const app = buildApp();

    const emailMetricsBefore = await app.inject({
      method: 'GET',
      url: '/v1/observability/invitations/email-metrics',
      headers: defaultHeaders,
    });
    const metricsBefore = emailMetricsBefore.json().data as { queued: number };

    const bulkResponse = await app.inject({
      method: 'POST',
      url: '/v1/households/household-1/invitations/bulk',
      headers: defaultHeaders,
      payload: {
        users: [
          {
            firstName: 'Nina',
            lastName: 'Quinn',
            email: 'nina.integration@example.com',
            role: 'senior',
          },
        ],
      },
    });

    expect(bulkResponse.statusCode).toBe(200);
    expect(bulkResponse.json().data.acceptedCount).toBe(1);

    await wait(20);

    const emailMetricsAfter = await app.inject({
      method: 'GET',
      url: '/v1/observability/invitations/email-metrics',
      headers: defaultHeaders,
    });
    const metricsAfter = emailMetricsAfter.json().data as { queued: number; sent: number };
    expect(metricsAfter.queued).toBeGreaterThan(metricsBefore.queued);
    expect(metricsAfter.sent).toBeGreaterThanOrEqual(1);

    const deepLinkUrl = bulkResponse.json().data.deliveries[0].deepLinkUrl as string;
    const token = new URL(deepLinkUrl).searchParams.get('token');
    expect(token).toBeTruthy();

    const resolveResponse = await app.inject({
      method: 'GET',
      url: `/v1/households/invitations/resolve?token=${encodeURIComponent(token ?? '')}`,
      headers: defaultHeaders,
    });

    expect(resolveResponse.statusCode).toBe(200);
    expect(resolveResponse.json().data.assignedRole).toBe('senior');

    const acceptWithoutToken = await app.inject({
      method: 'POST',
      url: '/v1/households/invitations/accept',
      headers: withUser({
        userId: 'user-nina-int',
        email: 'nina.integration@example.com',
        firstName: 'Nina',
        lastName: 'Quinn',
      }),
      payload: {},
    });

    expect(acceptWithoutToken.statusCode).toBe(200);
    expect(acceptWithoutToken.json().data.role).toBe('senior');

    const duplicateAccept = await app.inject({
      method: 'POST',
      url: '/v1/households/invitations/accept',
      headers: withUser({
        userId: 'user-nina-int',
        email: 'nina.integration@example.com',
        firstName: 'Nina',
        lastName: 'Quinn',
      }),
      payload: { token },
    });

    expect(duplicateAccept.statusCode).toBe(409);

    await app.close();
  });

  it('returns unauthorized when auth headers are missing', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/v1/households/household-1/overview',
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('handles expired token acceptance', async () => {
    const app = buildApp();

    const bulkResponse = await app.inject({
      method: 'POST',
      url: '/v1/households/household-1/invitations/bulk',
      headers: defaultHeaders,
      payload: {
        users: [
          {
            firstName: 'Expired',
            lastName: 'Token',
            email: 'expired.integration@example.com',
            role: 'senior',
          },
        ],
      },
    });

    expect(bulkResponse.statusCode).toBe(200);

    const invitationId = bulkResponse.json().data.deliveries[0].invitationId as string;
    forceExpireInvitationForTests(invitationId);

    const token = new URL(bulkResponse.json().data.deliveries[0].deepLinkUrl as string).searchParams.get('token');

    const acceptResponse = await app.inject({
      method: 'POST',
      url: '/v1/households/invitations/accept',
      headers: withUser({
        userId: 'user-expired-int',
        email: 'expired.integration@example.com',
        firstName: 'Expired',
        lastName: 'Token',
      }),
      payload: { token },
    });

    expect(acceptResponse.statusCode).toBe(409);

    await app.close();
  });
});
