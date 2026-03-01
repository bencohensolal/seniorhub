import type { HouseholdRepository } from '../../repositories/HouseholdRepository.js';
import type { AuthenticatedRequester } from '../../entities/Household.js';
import type { Member } from '../../entities/Member.js';
import { HouseholdAccessValidator } from '../shared/HouseholdAccessValidator.js';

export class ListHouseholdMembersUseCase {
  private readonly accessValidator: HouseholdAccessValidator;

  constructor(private readonly repository: HouseholdRepository) {
    this.accessValidator = new HouseholdAccessValidator(repository);
  }

  async execute(input: { householdId: string; requester: AuthenticatedRequester }): Promise<Member[]> {
    // Verify requester is a member of this household
    await this.accessValidator.ensureMember(input.householdId, input.requester.userId);

    // Get all active members of the household
    const members = await this.repository.listHouseholdMembers(input.householdId);

    return members;
  }
}
