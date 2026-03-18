import type { AuthenticatedRequester } from '../../entities/Household.js';
import type { HouseholdRepository } from '../../repositories/HouseholdRepository.js';
import type { DocumentFolderWithCounts } from '../../entities/DocumentFolder.js';
import type { Document } from '../../entities/Document.js';
import { HouseholdAccessValidator } from '../shared/index.js';

/**
 * Lists all documents and subfolders within a specific folder.
 */
export class ListFolderContentUseCase {
  private readonly accessValidator: HouseholdAccessValidator;

  constructor(private readonly repository: HouseholdRepository) {
    this.accessValidator = new HouseholdAccessValidator(repository);
  }

  /**
   * @param input - Folder identifier with requester info
   * @returns Object containing folders and documents within the specified folder
   * @throws {ForbiddenError} If requester is not a member of the household or lacks viewDocuments permission
   */
  async execute(input: {
    householdId: string;
    folderId: string | null;
    requester: AuthenticatedRequester;
    limit?: number;
    offset?: number;
  }): Promise<{
    folders: DocumentFolderWithCounts[];
    documents: Document[];
    hasMore: boolean;
  }> {
    await this.accessValidator.ensureMember(input.requester.userId, input.householdId);
    await this.accessValidator.ensurePermission(input.requester.userId, input.householdId, 'viewDocuments');

    const folders = await this.repository.listDocumentFoldersByParent(input.householdId, input.folderId);

    if (!input.folderId) {
      return { folders, documents: [], hasMore: false };
    }

    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    const { documents, hasMore } = await this.repository.listDocumentsByFolderPaginated(
      input.householdId, input.folderId, limit, offset,
    );

    return { folders, documents, hasMore };
  }
}
