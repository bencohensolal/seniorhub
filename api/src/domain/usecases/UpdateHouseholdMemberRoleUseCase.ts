import type { HouseholdRepository } from '../repositories/HouseholdRepository.js';
import type { AuthenticatedRequester } from '../entities/Household.js';
import type { HouseholdRole, Member } from '../entities/Member.js';

export interface UpdateHouseholdMemberRoleInput {
  householdId: string;
  memberId: string;
  newRole: HouseholdRole;
  requester: AuthenticatedRequester;
}

export class UpdateHouseholdMemberRoleUseCase {
  constructor(private readonly repository: HouseholdRepository) {}

  async execute(input: UpdateHouseholdMemberRoleInput): Promise<Member> {
    // Verify requester has access to household
    const requesterMembership = await this.repository.findActiveMemberByUserInHousehold(
      input.requester.userId,
      input.householdId,
    );

    if (!requesterMembership) {
      throw new Error('Access denied to this household.');
    }

    // Only caregivers can update roles
    if (requesterMembership.role !== 'caregiver') {
      throw new Error('Only caregivers can update household member roles.');
    }

    // Verify target member exists
    const targetMember = await this.repository.findMemberById(input.memberId);
    if (!targetMember || targetMember.householdId !== input.householdId) {
      throw new Error('Member not found in this household.');
    }

    // If demoting self from caregiver, check if there's at least one other caregiver
    if (
      targetMember.userId === input.requester.userId &&
      requesterMembership.role === 'caregiver' &&
      input.newRole !== 'caregiver'
    ) {
      const allMembers = await this.repository.listHouseholdMembers(input.householdId);
      const caregiverCount = allMembers.filter((m) => m.role === 'caregiver').length;

      if (caregiverCount <= 1) {
        throw new Error('Cannot demote yourself. The household must have at least one caregiver.');
      }
    }

    // Update the role
    const updatedMember = await this.repository.updateMemberRole(input.memberId, input.newRole);
    return updatedMember;
  }
}
