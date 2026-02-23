import { describe, expect, it, vi } from 'vitest';
import { InMemoryHouseholdRepository } from '../../data/repositories/InMemoryHouseholdRepository.js';
import { AcceptInvitationUseCase } from './AcceptInvitationUseCase.js';
import { CancelInvitationUseCase } from './CancelInvitationUseCase.js';
import { CreateBulkInvitationsUseCase } from './CreateBulkInvitationsUseCase.js';
import { ResolveInvitationUseCase } from './ResolveInvitationUseCase.js';

const getTokenFromDeepLink = (deepLinkUrl: string): string => {
  const url = new URL(deepLinkUrl);
  return url.searchParams.get('token') ?? '';
};

describe('Invitation lifecycle domain rules', () => {
  it('resolves and accepts invitation then rejects duplicate acceptance', async () => {
    const repository = new InMemoryHouseholdRepository();
    const createBulkInvitations = new CreateBulkInvitationsUseCase(repository);
    const resolveInvitation = new ResolveInvitationUseCase(repository);
    const acceptInvitation = new AcceptInvitationUseCase(repository);

    const invitationResult = await createBulkInvitations.execute({
      householdId: 'household-1',
      requester: {
        userId: 'user-2',
        email: 'ben@example.com',
        firstName: 'Ben',
        lastName: 'Martin',
      },
      users: [
        {
          firstName: 'Maya',
          lastName: 'Lopez',
          email: 'maya.lifecycle@example.com',
          role: 'senior',
        },
      ],
    });

    const token = getTokenFromDeepLink(invitationResult.deliveries[0]?.deepLinkUrl ?? '');
    expect(token.length).toBeGreaterThan(10);

    const resolved = await resolveInvitation.execute({ token });
    expect(resolved.assignedRole).toBe('senior');

    const accepted = await acceptInvitation.execute({
      requester: {
        userId: 'user-maya-lifecycle',
        email: 'maya.lifecycle@example.com',
        firstName: 'Maya',
        lastName: 'Lopez',
      },
      token,
    });

    expect(accepted.role).toBe('senior');

    await expect(
      acceptInvitation.execute({
        requester: {
          userId: 'user-maya-lifecycle',
          email: 'maya.lifecycle@example.com',
          firstName: 'Maya',
          lastName: 'Lopez',
        },
        token,
      }),
    ).rejects.toThrow('Invitation is not pending.');
  });

  it('rejects invitation acceptance after expiration', async () => {
    const repository = new InMemoryHouseholdRepository();
    const createBulkInvitations = new CreateBulkInvitationsUseCase(repository);
    const acceptInvitation = new AcceptInvitationUseCase(repository);

    vi.useFakeTimers();
    const baseTime = new Date('2026-01-01T00:00:00.000Z');
    vi.setSystemTime(baseTime);

    const invitationResult = await createBulkInvitations.execute({
      householdId: 'household-1',
      requester: {
        userId: 'user-2',
        email: 'ben@example.com',
        firstName: 'Ben',
        lastName: 'Martin',
      },
      users: [
        {
          firstName: 'Eli',
          lastName: 'West',
          email: 'eli.expired@example.com',
          role: 'caregiver',
        },
      ],
    });

    const token = getTokenFromDeepLink(invitationResult.deliveries[0]?.deepLinkUrl ?? '');
    vi.setSystemTime(new Date(baseTime.getTime() + 73 * 60 * 60 * 1000));

    await expect(
      acceptInvitation.execute({
        requester: {
          userId: 'user-eli-expired',
          email: 'eli.expired@example.com',
          firstName: 'Eli',
          lastName: 'West',
        },
        token,
      }),
    ).rejects.toThrow('Invitation expired. Please request a new invitation.');

    vi.useRealTimers();
  });

  it('allows caregiver cancellation and blocks non-caregiver cancellation', async () => {
    const repository = new InMemoryHouseholdRepository();
    const createBulkInvitations = new CreateBulkInvitationsUseCase(repository);
    const cancelInvitation = new CancelInvitationUseCase(repository);

    const invitationResult = await createBulkInvitations.execute({
      householdId: 'household-1',
      requester: {
        userId: 'user-2',
        email: 'ben@example.com',
        firstName: 'Ben',
        lastName: 'Martin',
      },
      users: [
        {
          firstName: 'Lena',
          lastName: 'Cole',
          email: 'lena.cancel@example.com',
          role: 'senior',
        },
      ],
    });

    const invitationId = invitationResult.deliveries[0]?.invitationId ?? '';

    await cancelInvitation.execute({
      householdId: 'household-1',
      invitationId,
      requester: {
        userId: 'user-2',
        email: 'ben@example.com',
        firstName: 'Ben',
        lastName: 'Martin',
      },
    });

    await expect(
      cancelInvitation.execute({
        householdId: 'household-1',
        invitationId,
        requester: {
          userId: 'user-1',
          email: 'alice@example.com',
          firstName: 'Alice',
          lastName: 'Martin',
        },
      }),
    ).rejects.toThrow('Only caregivers can cancel invitations.');
  });
});
