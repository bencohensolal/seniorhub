import type { HouseholdOverview } from '../entities/Household.js';
import type { HouseholdRepository } from '../repositories/HouseholdRepository.js';
import { HouseholdAccessValidator } from './shared/HouseholdAccessValidator.js';
import { NotFoundError } from '../errors/DomainErrors.js';

export class GetHouseholdOverviewUseCase {
  private readonly accessValidator: HouseholdAccessValidator;

  constructor(private readonly repository: HouseholdRepository) {
    this.accessValidator = new HouseholdAccessValidator(repository);
  }

  async execute(input: { householdId: string; requesterUserId: string }): Promise<HouseholdOverview> {
    await this.accessValidator.ensureMember(input.householdId, input.requesterUserId);

    const overview = await this.repository.getOverviewById(input.householdId);

    if (!overview) {
      throw new NotFoundError('Household not found.');
    }

    return overview;
  }
}
