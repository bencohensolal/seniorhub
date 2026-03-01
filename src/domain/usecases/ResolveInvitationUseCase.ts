import type { HouseholdInvitation } from '../entities/Invitation.js';
import type { HouseholdRepository } from '../repositories/HouseholdRepository.js';
import { NotFoundError } from '../errors/DomainErrors.js';

export class ResolveInvitationUseCase {
  constructor(private readonly repository: HouseholdRepository) {}

  async execute(input: { token: string }): Promise<HouseholdInvitation> {
    const invitation = await this.repository.resolveInvitationByToken(input.token);
    if (!invitation) {
      throw new NotFoundError('Invitation not found.');
    }

    return invitation;
  }
}
