import type { HouseholdRepository } from '../repositories/HouseholdRepository.js';
import type { AuthenticatedRequester } from '../entities/Household.js';

export interface LeaveHouseholdInput {
  householdId: string;
  requester: AuthenticatedRequester;
}

export class LeaveHouseholdUseCase {
  constructor(private readonly repository: HouseholdRepository) {}

  async execute(input: LeaveHouseholdInput): Promise<void> {
    // Verify requester has access to household
    const requesterMembership = await this.repository.findActiveMemberByUserInHousehold(
      input.requester.userId,
      input.householdId,
    );

    if (!requesterMembership) {
      throw new Error('Access denied to this household.');
    }

    const allMembers = await this.repository.listHouseholdMembers(input.householdId);

    // Cannot leave if last member
    if (allMembers.length <= 1) {
      throw new Error('Cannot leave household. You are the last member.');
    }

    // Cannot leave if last caregiver
    if (requesterMembership.role === 'caregiver') {
      const caregiverCount = allMembers.filter((m) => m.role === 'caregiver').length;
      if (caregiverCount <= 1) {
        throw new Error('Cannot leave household. You are the last caregiver.');
      }
    }

    // Remove the member
    await this.repository.removeMember(requesterMembership.id);
  }
}
