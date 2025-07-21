import { Task, TaskCompletion } from '../types';

export interface TaskCompletionAnalytics {
  wasCompletedLate: boolean;
  hoursLate?: number;
  daysLate?: number;
  completionDateTime: Date;
  dueDateTime: Date;
}

export interface CompletionStats {
  totalCompletions: number;
  onTimeCompletions: number;
  lateCompletions: number;
  averageHoursLate: number;
  onTimePercentage: number;
  mostCommonLateHours: number[];
}

/**
 * Analyzes if a task was completed late and by how much
 */
export const analyzeTaskCompletion = (
  task: Task, 
  completion: TaskCompletion
): TaskCompletionAnalytics => {
  const completionDateTime = new Date(completion.completedAt);
  
  // Construct the due date/time
  const dueDateTime = new Date(task.dueDate);
  if (task.dueTime) {
    const [hours, minutes] = task.dueTime.split(':').map(Number);
    dueDateTime.setHours(hours, minutes, 0, 0);
  } else {
    // If no specific time, consider due at end of day (11:59 PM)
    dueDateTime.setHours(23, 59, 59, 999);
  }

  const wasCompletedLate = completionDateTime > dueDateTime;
  
  let hoursLate: number | undefined;
  let daysLate: number | undefined;

  if (wasCompletedLate) {
    const lateDurationMs = completionDateTime.getTime() - dueDateTime.getTime();
    hoursLate = lateDurationMs / (1000 * 60 * 60); // Convert to hours
    daysLate = Math.floor(hoursLate / 24);
  }

  return {
    wasCompletedLate,
    hoursLate,
    daysLate,
    completionDateTime,
    dueDateTime,
  };
};

/**
 * Analyzes completion patterns for multiple task completions
 */
export const analyzeCompletionStats = (
  tasks: Task[],
  completions: TaskCompletion[]
): CompletionStats => {
  const analytics = completions.map(completion => {
    const task = tasks.find(t => t.id === completion.taskId);
    if (!task) return null;
    return analyzeTaskCompletion(task, completion);
  }).filter(Boolean) as TaskCompletionAnalytics[];

  const totalCompletions = analytics.length;
  const lateCompletions = analytics.filter(a => a.wasCompletedLate).length;
  const onTimeCompletions = totalCompletions - lateCompletions;

  const lateHours = analytics
    .filter(a => a.wasCompletedLate && a.hoursLate)
    .map(a => a.hoursLate!);

  const averageHoursLate = lateHours.length > 0 
    ? lateHours.reduce((sum, hours) => sum + hours, 0) / lateHours.length 
    : 0;

  const onTimePercentage = totalCompletions > 0 
    ? (onTimeCompletions / totalCompletions) * 100 
    : 0;

  // Find most common late hours (rounded to nearest hour)
  const roundedLateHours = lateHours.map(h => Math.round(h));
  const hourCounts = roundedLateHours.reduce((acc, hour) => {
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const mostCommonLateHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => Number(hour));

  return {
    totalCompletions,
    onTimeCompletions,
    lateCompletions,
    averageHoursLate,
    onTimePercentage,
    mostCommonLateHours,
  };
};

/**
 * Gets a human-readable description of how late a task was completed
 */
export const getLateCompletionDescription = (analytics: TaskCompletionAnalytics): string => {
  if (!analytics.wasCompletedLate) {
    return 'Completed on time';
  }

  const { hoursLate, daysLate } = analytics;
  
  if (!hoursLate) return 'Completed late';

  if (daysLate && daysLate >= 1) {
    if (daysLate === 1) {
      const remainingHours = Math.round(hoursLate - 24);
      return remainingHours > 0 ? `1 day and ${remainingHours} hours late` : '1 day late';
    }
    return `${Math.floor(daysLate)} days late`;
  }

  if (hoursLate >= 1) {
    return `${Math.round(hoursLate)} hours late`;
  }

  const minutesLate = Math.round(hoursLate * 60);
  return `${minutesLate} minutes late`;
};

/**
 * Determines if a task completion should be considered "significantly late"
 * (more than 2 hours for timed tasks, more than 1 day for all-day tasks)
 */
export const isSignificantlyLate = (task: Task, analytics: TaskCompletionAnalytics): boolean => {
  if (!analytics.wasCompletedLate || !analytics.hoursLate) return false;

  if (task.dueTime) {
    // For timed tasks, consider 2+ hours as significantly late
    return analytics.hoursLate >= 2;
  } else {
    // For all-day tasks, consider 1+ day as significantly late
    return analytics.hoursLate >= 24;
  }
};