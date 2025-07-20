import database from './database';
import { Task, TaskCompletion, DashboardMetrics } from '../types';
import { 
  getNextRecurrenceDate, 
  shouldCreateNextRecurrence, 
  createRecurringTaskInstance 
} from '../utils/recurrence';
import { getDateString, isToday } from '../utils/date';

class TaskService {
  private async ensureDatabaseReady(): Promise<void> {
    if (!database.isReady()) {
      console.log('Database not ready, waiting for initialization...');
      // Wait a bit and check again
      let attempts = 0;
      const maxAttempts = 10;
      while (!database.isReady() && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (!database.isReady()) {
        throw new Error('Database is not ready after waiting. Please restart the app.');
      }
    }
  }

  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    await this.ensureDatabaseReady();
    try {
      return await database.createTask(task);
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTodayTasks(): Promise<Task[]> {
    await this.ensureDatabaseReady();
    try {
      const today = getDateString(new Date());
      console.log('Getting today tasks for date:', today);
      return await database.getTasks(today);
    } catch (error) {
      console.error('Error getting today tasks:', error);
      throw new Error(`Failed to get today's tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTasks(date?: string): Promise<Task[]> {
    await this.ensureDatabaseReady();
    try {
      return await database.getTasks(date);
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw new Error(`Failed to get tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUpcomingTasks(days: number = 7): Promise<Task[]> {
    const tasks: Task[] = [];
    const startDate = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateTasks = await database.getTasks(getDateString(date));
      tasks.push(...dateTasks);
    }
    
    return tasks;
  }

  async completeTask(taskId: string, notes?: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');

    // Check if task is already completed today
    const isAlreadyCompleted = await database.isTaskCompletedToday(taskId);
    if (isAlreadyCompleted) {
      throw new Error('Task is already completed today');
    }

    await database.completeTask(taskId, notes);

    if (task.isRecurring && task.recurrencePattern) {
      const nextDate = getNextRecurrenceDate(
        new Date(task.dueDate),
        task.recurrencePattern,
        task.recurrenceInterval
      );

      const nextTask = createRecurringTaskInstance(task, nextDate);
      await database.createTask(nextTask);
    }
  }

  async isTaskCompletedToday(taskId: string): Promise<boolean> {
    return database.isTaskCompletedToday(taskId);
  }

  async getTaskById(id: string): Promise<Task | null> {
    const tasks = await database.getTasks();
    return tasks.find(task => task.id === id) || null;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    await database.updateTask(id, updates);
  }

  async deleteTask(id: string): Promise<void> {
    await database.deleteTask(id);
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    await this.ensureDatabaseReady();
    try {
      const today = getDateString(new Date());
      console.log('Getting dashboard metrics for date:', today);
      
      const todayTasks = await database.getTasks(today);
      const todayCompletions = await database.getCompletions(undefined, today);
      const overdueTasks = await database.getOverdueTasks();

      const completedToday = todayCompletions.length;
      const totalToday = todayTasks.length;
      const completionRate = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

      const currentStreak = await this.calculateStreak();

      console.log('Dashboard metrics calculated:', {
        todayTasks: totalToday,
        completedToday,
        overdueTasks: overdueTasks.length,
        completionRate: Math.round(completionRate),
        currentStreak,
      });

      return {
        todayTasks: totalToday,
        completedToday,
        overdueTasks: overdueTasks.length,
        completionRate: Math.round(completionRate),
        currentStreak,
      };
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      throw new Error(`Failed to get dashboard metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async calculateStreak(): Promise<number> {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = getDateString(date);
      
      const tasks = await database.getTasks(dateStr);
      const completions = await database.getCompletions(undefined, dateStr);
      
      if (tasks.length === 0) continue;
      
      if (completions.length === tasks.length) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  async getTaskCompletions(taskId: string): Promise<TaskCompletion[]> {
    return database.getCompletions(taskId);
  }

  async getOverdueTasks(): Promise<Task[]> {
    return database.getOverdueTasks();
  }
}

export default new TaskService();