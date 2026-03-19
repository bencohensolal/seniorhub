import type { HouseholdRepository } from '../../repositories/HouseholdRepository.js';
import type { MedicationLog, CreateMedicationLogInput } from '../../entities/MedicationLog.js';
import { HouseholdAccessValidator } from '../shared/index.js';
import type { AuthenticatedRequester } from '../../entities/Household.js';
import { NotFoundError } from '../../errors/index.js';

export class LogMedicationIntakeUseCase {
  private readonly accessValidator: HouseholdAccessValidator;

  constructor(private readonly repository: HouseholdRepository) {
    this.accessValidator = new HouseholdAccessValidator(repository);
  }

  async execute(input: {
    householdId: string;
    medicationId: string;
    scheduledDate: string;
    scheduledTime?: string;
    takenAt?: string;
    takenByUserId?: string;
    note?: string;
    requester: AuthenticatedRequester;
  }): Promise<MedicationLog> {
    await this.accessValidator.ensureMember(input.requester.userId, input.householdId);

    const medications = await this.repository.listHouseholdMedications(input.householdId);
    const medication = medications.find((m) => m.id === input.medicationId);
    if (!medication) {
      throw new NotFoundError(`Medication ${input.medicationId} not found in household ${input.householdId}`);
    }

    const logInput: CreateMedicationLogInput = {
      medicationId: input.medicationId,
      householdId: input.householdId,
      scheduledDate: input.scheduledDate,
      takenAt: input.takenAt ?? new Date().toISOString(),
      ...(input.scheduledTime !== undefined && { scheduledTime: input.scheduledTime }),
      ...(input.takenByUserId !== undefined && { takenByUserId: input.takenByUserId }),
      ...(input.note !== undefined && { note: input.note }),
    };

    return this.repository.createMedicationLog(logInput);
  }
}
