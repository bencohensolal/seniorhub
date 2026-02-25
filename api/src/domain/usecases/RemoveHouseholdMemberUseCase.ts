import type { HouseholdRepository } from '../repositories/HouseholdRepository.js';
import type { AuthenticatedRequester } from '../entities/Household.js';

export interface RemoveHouseholdMemberInput {
  householdId: string;
  memberId: string;
  requester: AuthenticatedRequester;
}

export class RemoveHouseholdMemberUseCase {
  constructor(private readonly repository: HouseholdRepository) {}

  async execute(input: RemoveHouseholdMemberInput): Promise<void> {
    // Verify requester has access to household
    const requesterMembership = await this.repository.findActiveMemberByUserInHousehold(
      input.requester.userId,
      input.householdId,
    );

    if (!requesterMembership) {
      throw new Error('Access denied to this household.');
    }

    // Only caregivers can remove members
    if (requesterMembership.role !== 'caregiver') {
      throw new Error('Only caregivers can remove household members.');
    }

    // Verify target member exists
    const targetMember = await this.repository.findMemberById(input.memberId);
    if (!targetMember || targetMember.householdId !== input.householdId) {
      throw new Error('Member not found in this household.');
    }

    // Cannot remove self using this endpoint
    if (targetMember.userId === input.requester.userId) {
      throw new Error('Cannot remove yourself using this endpoint. Use leave household instead.');
    }

    // Check if target is the last member
    const allMembers = await this.repository.listHouseholdMembers(input.householdId);
    if (allMembers.length <= 1) {
      throw new Error('Cannot remove the last member of the household.');
    }

    // Remove the member
    await this.repository.removeMember(input.memberId);
  }
}
