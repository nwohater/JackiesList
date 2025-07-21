import database from './database';
import { Task, TaskCompletion, DashboardMetrics } from '../types';
import { 
  getNextRecurrenceDate, 
  shouldCreateNextRecurrence, 
  createRecurringTaskInstance 
} from '../utils/recurrence';
import { getDateString, isToday } from '../utils/date';
import { 
  analyzeTaskCompletion, 
  analyzeCompletionStats,
  getLateCompletionDescription,
  isSignificantlyLate,
  type TaskCompletionAnalytics,
  type CompletionStats
} from '../utils/completionAnalytics';
import { getSettings } from './settingsService';

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
      // If it's a recurring task, we'll create instances instead of a parent recurring task
      if (task.isRecurring && task.recurrencePattern) {
        return await this.createRecurringTaskWithInstances(task);
      } else {
        // For non-recurring tasks, create normally
        return await database.createTask(task);
      }
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

    // Note: We no longer create the next instance here because we pre-generate
    // all instances when the recurring task is created
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

  // Completion Analytics Functions

  async analyzeTaskCompletion(taskId: string, completionId: string): Promise<TaskCompletionAnalytics | null> {
    const result = await database.getTaskWithCompletions(taskId);
    if (!result) return null;

    const completion = result.completions.find(c => c.id === completionId);
    if (!completion) return null;

    return analyzeTaskCompletion(result.task, completion);
  }

  async getTaskCompletionHistory(taskId: string): Promise<{
    task: Task;
    completions: TaskCompletion[];
    analytics: TaskCompletionAnalytics[];
  } | null> {
    const result = await database.getTaskWithCompletions(taskId);
    if (!result) return null;

    const analytics = result.completions.map(completion => 
      analyzeTaskCompletion(result.task, completion)
    );

    return {
      task: result.task,
      completions: result.completions,
      analytics,
    };
  }

  async getCompletionStats(days: number = 30): Promise<CompletionStats> {
    const { tasks, completions } = await database.getRecentCompletionTrends(days);
    return analyzeCompletionStats(tasks, completions);
  }

  async getTasksCompletedLate(days: number = 30): Promise<{
    task: Task;
    completion: TaskCompletion;
    analytics: TaskCompletionAnalytics;
    description: string;
  }[]> {
    const { tasks, completions } = await database.getRecentCompletionTrends(days);
    
    const lateCompletions = completions.map(completion => {
      const task = tasks.find(t => t.id === completion.taskId);
      if (!task) return null;

      const analytics = analyzeTaskCompletion(task, completion);
      if (!analytics.wasCompletedLate) return null;

      return {
        task,
        completion,
        analytics,
        description: getLateCompletionDescription(analytics),
      };
    }).filter(Boolean) as {
      task: Task;
      completion: TaskCompletion;
      analytics: TaskCompletionAnalytics;
      description: string;
    }[];

    return lateCompletions.sort((a, b) => 
      (b.analytics.hoursLate || 0) - (a.analytics.hoursLate || 0)
    );
  }

  async getSignificantlyLateTasks(days: number = 30): Promise<{
    task: Task;
    completion: TaskCompletion;
    analytics: TaskCompletionAnalytics;
    description: string;
  }[]> {
    const lateTasks = await this.getTasksCompletedLate(days);
    return lateTasks.filter(item => isSignificantlyLate(item.task, item.analytics));
  }

  getLateCompletionDescription(analytics: TaskCompletionAnalytics): string {
    return getLateCompletionDescription(analytics);
  }

  private async createRecurringTaskWithInstances(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    try {
      // Get user settings for how many days to generate
      const settings = await getSettings();
      const daysToGenerate = settings.recurringTaskGenerationDays;
      
      console.log(`Creating recurring task instances for ${daysToGenerate} days: ${task.title}`);
      
      // Start from the task's due date
      let currentDate = new Date(task.dueDate);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysToGenerate);
      
      const instancesToCreate: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = [];
      let instanceCount = 0;
      const maxInstances = 365; // Safety limit
      let firstCreatedTask: Task | null = null;
      
      // Generate instances until we reach the end date or hit the safety limit
      while (currentDate <= endDate && instanceCount < maxInstances) {
        // Create a non-recurring instance for this date
        const instance: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
          title: task.title,
          description: task.description,
          type: task.type,
          dueDate: getDateString(currentDate),
          dueTime: task.dueTime,
          isRecurring: false, // Instances are not recurring themselves
          recurrencePattern: undefined,
          recurrenceInterval: undefined,
          priority: task.priority,
          categoryId: task.categoryId,
        };
        
        try {
          const createdInstance = await database.createTask(instance);
          if (!firstCreatedTask) {
            firstCreatedTask = createdInstance; // Return the first instance as the "created task"
          }
          instanceCount++;
          console.log(`Created instance ${instanceCount} for ${getDateString(currentDate)}`);
        } catch (error) {
          console.error(`Error creating instance for ${getDateString(currentDate)}:`, error);
          // Continue with other instances even if one fails
        }
        
        // Get the next recurrence date
        currentDate = getNextRecurrenceDate(
          currentDate,
          task.recurrencePattern!,
          task.recurrenceInterval
        );
      }
      
      console.log(`Successfully created ${instanceCount} recurring instances`);
      
      if (!firstCreatedTask) {
        throw new Error('Failed to create any recurring task instances');
      }
      
      return firstCreatedTask;
    } catch (error) {
      console.error('Error creating recurring task with instances:', error);
      throw error;
    }
  }

  private async generateFutureRecurringInstances(parentTask: Task): Promise<void> {
    try {
      // Get user settings for how many days to generate
      const settings = await getSettings();
      const daysToGenerate = settings.recurringTaskGenerationDays;
      
      console.log(`Generating recurring instances for ${daysToGenerate} days for task: ${parentTask.title}`);
      console.log(`Parent task due date: ${parentTask.dueDate}`);
      console.log(`Recurrence pattern: ${parentTask.recurrencePattern}`);
      
      // Start from the task's due date
      let currentDate = new Date(parentTask.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysToGenerate);
      
      console.log(`Generation range: ${today.toISOString()} to ${endDate.toISOString()}`);
      
      const instancesToCreate: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = [];
      let instanceCount = 0;
      const maxInstances = 365; // Safety limit
      
      // Always start from the NEXT occurrence after the parent task's date
      // This prevents creating a duplicate for the parent task's date
      currentDate = getNextRecurrenceDate(
        currentDate,
        parentTask.recurrencePattern!,
        parentTask.recurrenceInterval
      );
      
      console.log(`First instance will be created for: ${currentDate.toISOString()}`);
      
      // If the next occurrence is in the past (shouldn't happen for new tasks),
      // skip ahead to after today
      while (currentDate <= today && instanceCount < maxInstances) {
        currentDate = getNextRecurrenceDate(
          currentDate,
          parentTask.recurrencePattern!,
          parentTask.recurrenceInterval
        );
        instanceCount++;
      }
      
      // Reset counter for actual instance creation
      instanceCount = 0;
      
      // Generate instances until we reach the end date or hit the safety limit
      while (currentDate <= endDate && instanceCount < maxInstances) {
        // Create a non-recurring instance
        const instance: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
          title: parentTask.title,
          description: parentTask.description,
          type: parentTask.type,
          dueDate: getDateString(currentDate),
          dueTime: parentTask.dueTime,
          isRecurring: false, // Instances are not recurring themselves
          recurrencePattern: undefined,
          recurrenceInterval: undefined,
          priority: parentTask.priority,
          categoryId: parentTask.categoryId,
        };
        
        instancesToCreate.push(instance);
        instanceCount++;
        
        // Get the next recurrence date
        currentDate = getNextRecurrenceDate(
          currentDate,
          parentTask.recurrencePattern!,
          parentTask.recurrenceInterval
        );
      }
      
      // Batch create all instances
      console.log(`Creating ${instancesToCreate.length} recurring instances`);
      for (const instance of instancesToCreate) {
        try {
          await database.createTask(instance);
        } catch (error) {
          console.error('Error creating individual instance:', error);
          // Continue with other instances even if one fails
        }
      }
      
      console.log(`Successfully created ${instancesToCreate.length} recurring instances`);
    } catch (error) {
      console.error('Error generating future recurring instances:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      // Don't throw - we don't want to fail the parent task creation
    }
  }

  async regenerateRecurringInstances(taskId: string): Promise<void> {
    // This method can be used to regenerate instances for an existing recurring task
    const task = await this.getTaskById(taskId);
    if (!task || !task.isRecurring) {
      throw new Error('Task not found or is not recurring');
    }
    
    // First, delete any future instances of this task
    // (We'd need to add a parent_task_id field to properly track this)
    
    // Then regenerate
    await this.generateFutureRecurringInstances(task);
  }

  async generateMissingRecurringInstances(): Promise<void> {
    // This method finds all recurring tasks and generates their future instances
    // Useful for existing recurring tasks created before this feature was added
    try {
      console.log('Checking for recurring tasks missing future instances...');
      
      const allTasks = await database.getTasks();
      const recurringTasks = allTasks.filter(task => task.isRecurring);
      
      for (const recurringTask of recurringTasks) {
        // Check if this recurring task already has future instances
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        
        const futureTasks = await database.getTasks(getDateString(futureDate));
        const hasFutureInstance = futureTasks.some(t => 
          t.title === recurringTask.title && 
          t.type === recurringTask.type &&
          !t.isRecurring
        );
        
        if (!hasFutureInstance) {
          console.log(`Generating missing instances for recurring task: ${recurringTask.title}`);
          await this.generateFutureRecurringInstances(recurringTask);
        }
      }
      
      console.log('Finished checking for missing recurring instances');
    } catch (error) {
      console.error('Error generating missing recurring instances:', error);
    }
  }
}

export default new TaskService();