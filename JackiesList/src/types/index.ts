export type TaskType = 'appointment' | 'chore' | 'task';
export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually' | 'custom';
export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  dueDate: string;
  dueTime?: string;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceInterval?: number;
  priority: Priority;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  completedAt: string;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface DashboardMetrics {
  todayTasks: number;
  completedToday: number;
  overdueTasks: number;
  completionRate: number;
  currentStreak: number;
}