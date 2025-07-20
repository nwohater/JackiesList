import { Task, RecurrencePattern } from '../types';

export function getNextRecurrenceDate(
  currentDate: Date,
  pattern: RecurrencePattern,
  interval?: number
): Date {
  const nextDate = new Date(currentDate);

  switch (pattern) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'annually':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case 'custom':
      if (interval) {
        nextDate.setDate(nextDate.getDate() + interval);
      }
      break;
  }

  return nextDate;
}

export function shouldCreateNextRecurrence(
  task: Task,
  completionDate: Date
): boolean {
  if (!task.isRecurring) return false;

  const taskDate = new Date(task.dueDate);
  const daysSinceTask = Math.floor(
    (completionDate.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceTask >= 0;
}

export function createRecurringTaskInstance(
  task: Task,
  nextDate: Date
): Omit<Task, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: task.title,
    description: task.description,
    type: task.type,
    dueDate: nextDate.toISOString().split('T')[0],
    dueTime: task.dueTime,
    isRecurring: task.isRecurring,
    recurrencePattern: task.recurrencePattern,
    recurrenceInterval: task.recurrenceInterval,
    priority: task.priority,
    categoryId: task.categoryId,
  };
}

export function formatRecurrenceText(pattern: RecurrencePattern, interval?: number): string {
  switch (pattern) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'biweekly':
      return 'Every 2 weeks';
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Every 3 months';
    case 'annually':
      return 'Yearly';
    case 'custom':
      return interval ? `Every ${interval} days` : 'Custom';
    default:
      return '';
  }
}