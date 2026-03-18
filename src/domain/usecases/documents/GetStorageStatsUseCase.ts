import type { HouseholdRepository } from '../../repositories/HouseholdRepository.js';
import { HouseholdAccessValidator } from '../shared/index.js';

export class GetStorageStatsUseCase {
  private readonly accessValidator: HouseholdAccessValidator;

  constructor(private readonly repository: HouseholdRepository) {
    this.accessValidator = new HouseholdAccessValidator(repository);
  }

  async execute(input: {
    householdId: string;
    requester: { userId: string };
  }): Promise<{ usedBytes: number; quotaBytes: number; usedPercent: number }> {
    await this.accessValidator.ensureMember(input.requester.userId, input.householdId);

    const { usedBytes, quotaBytes } = await this.repository.getStorageStats(input.householdId);
    return {
      usedBytes,
      quotaBytes,
      usedPercent: quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 0,
    };
  }
}
