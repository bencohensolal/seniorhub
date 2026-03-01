import type { HouseholdInvitation } from '../../entities/Invitation.js';
import type { HouseholdRepository } from '../../repositories/HouseholdRepository.js';
import { HouseholdAccessValidator } from '../shared/HouseholdAccessValidator.js';

export class ListHouseholdInvitationsUseCase {
  private readonly accessValidator: HouseholdAccessValidator;

  constructor(private readonly repository: HouseholdRepository) {
    this.accessValidator = new HouseholdAccessValidator(repository);
  }

  async execute(input: { householdId: string; requesterUserId: string }): Promise<HouseholdInvitation[]> {
    // Verify requester is a member of the household
    await this.accessValidator.ensureMember(input.householdId, input.requesterUserId);

    return this.repository.listHouseholdInvitations(input.householdId);
  }
}
