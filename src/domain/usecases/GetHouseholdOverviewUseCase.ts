import type { HouseholdOverview } from '../entities/Household.js';
import type { HouseholdRepository } from '../repositories/HouseholdRepository.js';

export class GetHouseholdOverviewUseCase {
  constructor(private readonly repository: HouseholdRepository) {}

  async execute(input: { householdId: string; requesterUserId: string }): Promise<HouseholdOverview> {
    console.log('[GetHouseholdOverview] Checking access:', {
      requesterUserId: input.requesterUserId,
      householdId: input.householdId,
    });

    const member = await this.repository.findActiveMemberByUserInHousehold(
      input.requesterUserId,
      input.householdId,
    );

    console.log('[GetHouseholdOverview] Member found:', member ? 'YES' : 'NO', member);

    if (!member) {
      throw new Error('Access denied to this household.');
    }

    const overview = await this.repository.getOverviewById(input.householdId);

    if (!overview) {
      throw new Error('Household not found.');
    }

    return overview;
  }
}
