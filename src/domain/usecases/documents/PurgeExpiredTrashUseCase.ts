import type { AuthenticatedRequester } from '../../entities/Household.js';
import type { HouseholdRepository } from '../../repositories/HouseholdRepository.js';
import { HouseholdAccessValidator } from '../shared/index.js';

const TRASH_RETENTION_DAYS = 30;

/**
 * Permanently deletes items that have been in trash for more than 30 days.
 */
export class PurgeExpiredTrashUseCase {
  private readonly accessValidator: HouseholdAccessValidator;

  constructor(private readonly repository: HouseholdRepository) {
    this.accessValidator = new HouseholdAccessValidator(repository);
  }

  async execute(input: {
    householdId: string;
    requester: AuthenticatedRequester;
  }): Promise<{ purgedFolders: number; purgedDocuments: number }> {
    await this.accessValidator.ensureMember(input.requester.userId, input.householdId);
    await this.accessValidator.ensurePermission(
      input.requester.userId,
      input.householdId,
      'manageDocuments',
    );

    const result = await this.repository.purgeExpiredTrashItems(
      input.householdId,
      TRASH_RETENTION_DAYS,
    );

    return { purgedFolders: result.folders, purgedDocuments: result.documents };
  }
}
