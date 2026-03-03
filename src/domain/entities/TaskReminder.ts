// Domain entity for task reminders
// Supports two formats:
// 1. Legacy: day-of-week scheduling (time + daysOfWeek)
// 2. New: appointment-style (triggerBefore task due date/time)

export interface TaskReminder {
  id: string;
  taskId: string;
  
  // Legacy format (for recurring tasks without due date/time)
  time: string | null; // HH:MM format (e.g., "08:00")
  daysOfWeek: number[] | null; // 0=Sunday, 1=Monday, ..., 6=Saturday
  
  // New format (for tasks with due date/time)
  triggerBefore: number | null; // Minutes before task due date/time (e.g., 60 for 1 hour before)
  customMessage: string | null; // Optional custom reminder message
  
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskReminderInput {
  taskId: string;
  
  // Legacy format (mutually exclusive with new format)
  time?: string;
  daysOfWeek?: number[];
  
  // New format (mutually exclusive with legacy format)
  triggerBefore?: number;
  customMessage?: string;
  
  enabled?: boolean;
}

export interface UpdateTaskReminderInput {
  // Legacy format
  time?: string | null;
  daysOfWeek?: number[] | null;
  
  // New format
  triggerBefore?: number | null;
  customMessage?: string | null;
  
  enabled?: boolean;
}
