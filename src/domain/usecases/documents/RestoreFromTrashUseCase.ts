import type { AuthenticatedRequester } from '../../entities/Household.js';
import type { HouseholdRepository } from '../../repositories/HouseholdRepository.js';
import { HouseholdAccessValidator } from '../shared/index.js';
import { ForbiddenError, NotFoundError } from '../../errors/index.js';

/**
 * Restores a document or folder from the trash to its original location.
 */
export class RestoreFromTrashUseCase {
  private readonly accessValidator: HouseholdAccessValidator;

  constructor(private readonly repository: HouseholdRepository) {
    this.accessValidator = new HouseholdAccessValidator(repository);
  }

  async execute(input: {
    householdId: string;
    itemId: string;
    itemType: 'folder' | 'document';
    requester: AuthenticatedRequester;
  }): Promise<void> {
    await this.accessValidator.ensureMember(input.requester.userId, input.householdId);
    await this.accessValidator.ensurePermission(
      input.requester.userId,
      input.householdId,
      'manageDocuments',
    );

    if (input.itemType === 'folder') {
      const folder = await this.repository.getDocumentFolderById(input.itemId, input.householdId);
      if (!folder) {
        throw new NotFoundError('Folder not found or does not belong to this household.');
      }
      if (folder.trashedAt === null) {
        throw new ForbiddenError('Folder is not in trash.');
      }
      await this.repository.restoreDocumentFolderFromTrash(input.itemId, input.householdId);
    } else {
      const document = await this.repository.getDocumentById(input.itemId, input.householdId);
      if (!document) {
        throw new NotFoundError('Document not found or does not belong to this household.');
      }
      if (document.trashedAt === null) {
        throw new ForbiddenError('Document is not in trash.');
      }
      await this.repository.restoreDocumentFromTrash(input.itemId, input.householdId);
    }
  }
}
