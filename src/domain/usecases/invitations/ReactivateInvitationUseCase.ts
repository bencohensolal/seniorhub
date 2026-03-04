import type { AuthenticatedRequester } from '../../entities/Household.js';
import type { HouseholdRole } from '../../entities/Member.js';
import type { HouseholdRepository } from '../../repositories/HouseholdRepository.js';

/**
 * Reactivates an expired invitation with a new token and expiration date.
 * Only caregivers can reactivate invitations.
 * Limits reactivations to a maximum count (e.g., 3 times).
 * Repository handles access validation and business rules.
 */
export class ReactivateInvitationUseCase {
  constructor(private readonly repository: HouseholdRepository) {}

  /**
   * @param input - Invitation reactivation data with requester info
   * @returns Reactivated invitation metadata with new token
   * @throws {ForbiddenError} If requester is not a caregiver (thrown by repository)
   * @throws {NotFoundError} If invitation doesn't exist (thrown by repository)
   * @throws {ConflictError} If invitation cannot be reactivated (thrown by repository)
   */
  async execute(input: {
    householdId: string;
    invitationId: string;
    requester: AuthenticatedRequester;
  }): Promise<{
    id: string;
    inviteeFirstName: string;
    inviteeLastName: string;
    inviteeEmail: string;
    status: 'pending';
    assignedRole: HouseholdRole;
    newToken: string;
    expiresAt: string;
    acceptLinkUrl: string;
    deepLinkUrl: string;
    fallbackUrl: string | null;
  }> {
    const result = await this.repository.reactivateInvitation({
      householdId: input.householdId,
      invitationId: input.invitationId,
      requesterUserId: input.requester.userId,
    });

    return {
      id: result.id,
      inviteeFirstName: result.inviteeFirstName,
      inviteeLastName: result.inviteeLastName,
      inviteeEmail: result.inviteeEmail,
      status: 'pending',
      assignedRole: result.assignedRole,
      newToken: result.newToken,
      expiresAt: result.newExpiresAt,
      acceptLinkUrl: result.acceptLinkUrl,
      deepLinkUrl: result.deepLinkUrl,
      fallbackUrl: result.fallbackUrl,
    };
  }
}
