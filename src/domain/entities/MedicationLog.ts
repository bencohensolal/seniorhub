export interface MedicationLog {
  id: string;
  medicationId: string;
  householdId: string;
  scheduledDate: string;   // "YYYY-MM-DD"
  scheduledTime?: string;  // "HH:MM"
  takenAt: string;         // ISO
  takenByUserId?: string;
  note?: string;
  createdAt: string;
}

export interface CreateMedicationLogInput {
  medicationId: string;
  householdId: string;
  scheduledDate: string;
  scheduledTime?: string;
  takenAt: string;
  takenByUserId?: string;
  note?: string;
}
