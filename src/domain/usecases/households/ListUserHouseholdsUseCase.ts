import type { HouseholdRepository, UserHouseholdMembership } from '../../repositories/HouseholdRepository.js';
import type { AuthenticatedRequester } from '../../entities/Household.js';

export class ListUserHouseholdsUseCase {
  constructor(private readonly repository: HouseholdRepository) {}

  async execute(input: { requester: AuthenticatedRequester }): Promise<UserHouseholdMembership[]> {
    return this.repository.listUserHouseholds(input.requester.userId);
  }
}
