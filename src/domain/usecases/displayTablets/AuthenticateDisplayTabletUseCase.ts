import type { HouseholdRepository } from '../../repositories/HouseholdRepository.js';
import type { DisplayTabletAuthResult } from '../../entities/DisplayTablet.js';
import { isValidDisplayTabletTokenFormat } from '../../security/displayTabletToken.js';
import { generateTabletSessionToken } from '../../security/displayTabletSession.js';
import { ForbiddenError } from '../../errors/index.js';

export class AuthenticateDisplayTabletUseCase {
  constructor(private readonly repository: HouseholdRepository) {}

  async execute(input: {
    tabletId: string;
    token: string;
  }): Promise<DisplayTabletAuthResult> {
    // Validate token format
    if (!isValidDisplayTabletTokenFormat(input.token)) {
      throw new ForbiddenError('Invalid tablet token format.');
    }

    // Authenticate the tablet (returns basic info without session token)
    const basicResult = await this.repository.authenticateDisplayTablet(input.tabletId, input.token);

    if (!basicResult) {
      throw new ForbiddenError('Invalid tablet credentials or tablet is not active.');
    }

    // Generate a session token (valid for 8 hours)
    const sessionToken = generateTabletSessionToken(input.tabletId, basicResult.householdId);
    
    // Calculate expiration time (8 hours from now)
    const expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();

    return {
      ...basicResult,
      sessionToken,
      expiresAt,
    };
  }
}
