import SQLite from 'react-native-sqlite-storage';
import { Task, TaskCompletion, Category } from '../types';

// Enable promise support for SQLite
SQLite.enablePromise(true);
SQLite.DEBUG(true); // Enable debug logging

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized: boolean = false;

  async init(): Promise<void> {
    try {
      console.log('Database: Starting initialization...');
      
      // Check if SQLite is available
      if (!SQLite) {
        throw new Error('SQLite module is not available');
      }
      
      console.log('Database: Opening database...');
      this.db = await SQLite.openDatabase({
        name: 'JackiesList.db',
        location: 'default',
        createFromLocation: undefined,
        readOnly: false,
      });
      
      console.log('Database: Database opened successfully');
      
      // Test basic database operation
      console.log('Database: Testing database connection...');
      await this.db.executeSql('SELECT 1');
      console.log('Database: Connection test passed');
      
      console.log('Database: Creating tables...');
      await this.createTables();
      console.log('Database: Tables created successfully');
      
      this.isInitialized = true;
      console.log('Database: Initialization completed successfully');
    } catch (error) {
      console.error('Database: Initialization failed');
      console.error('Database: Error details:', error);
      
      if (error instanceof Error) {
        console.error('Database: Error message:', error.message);
        console.error('Database: Error stack:', error.stack);
      }
      
      this.isInitialized = false;
      this.db = null;
      
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const queries = [
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        icon TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        due_date TEXT NOT NULL,
        due_time TEXT,
        is_recurring INTEGER NOT NULL DEFAULT 0,
        recurrence_pattern TEXT,
        recurrence_interval INTEGER,
        priority TEXT NOT NULL DEFAULT 'medium',
        category_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )`,
      `CREATE TABLE IF NOT EXISTS task_completions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      )`,
    ];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      try {
        console.log(`Creating table ${i + 1}/${queries.length}`);
        await this.db.executeSql(query);
        console.log(`Table ${i + 1}/${queries.length} created successfully`);
      } catch (error) {
        console.error(`Error creating table ${i + 1}:`, error);
        throw new Error(`Failed to create table ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log('Creating task:', task);
      
      const id = Date.now().toString();
      const now = new Date().toISOString();
      
      const query = `
        INSERT INTO tasks (
          id, title, description, type, due_date, due_time,
          is_recurring, recurrence_pattern, recurrence_interval,
          priority, category_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        task.title,
        task.description || null,
        task.type,
        task.dueDate,
        task.dueTime || null,
        task.isRecurring ? 1 : 0,
        task.recurrencePattern || null,
        task.recurrenceInterval || null,
        task.priority,
        task.categoryId || null,
        now,
        now,
      ];

      console.log('Executing create task query with params:', params);
      await this.db.executeSql(query, params);
      console.log('Task created successfully with id:', id);

      return {
        ...task,
        id,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTasks(date?: string): Promise<Task[]> {
    if (!this.db) {
      console.error('Database not initialized when trying to get tasks');
      throw new Error('Database not initialized');
    }

    let query = 'SELECT * FROM tasks';
    const params: any[] = [];

    try {
      console.log(`Getting tasks${date ? ` for date: ${date}` : ' (all tasks)'}`);
      

      if (date) {
        query += ' WHERE date(due_date) = date(?)';
        params.push(date);
      }

      query += ' ORDER BY due_date, due_time';

      console.log(`Executing query: ${query} with params:`, params);
      const [result] = await this.db.executeSql(query, params);
      console.log(`Query executed successfully, found ${result.rows.length} tasks`);
      
      const tasks: Task[] = [];

      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        tasks.push({
          id: row.id,
          title: row.title,
          description: row.description,
          type: row.type,
          dueDate: row.due_date,
          dueTime: row.due_time,
          isRecurring: row.is_recurring === 1,
          recurrencePattern: row.recurrence_pattern,
          recurrenceInterval: row.recurrence_interval,
          priority: row.priority,
          categoryId: row.category_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }

      console.log(`Successfully parsed ${tasks.length} tasks`);
      return tasks;
    } catch (error) {
      console.error('Error executing getTasks query:', error);
      console.error('Query was:', query);
      console.error('Params were:', params);
      throw new Error(`Failed to get tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log('Updating task:', id, 'with updates:', updates);
      
      const fields = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'createdAt')
        .map(key => {
          // Map camelCase to snake_case for database columns
          const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          return `${dbKey} = ?`;
        });

      if (fields.length === 0) {
        console.log('No fields to update');
        return;
      }

      const query = `UPDATE tasks SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`;
      const values = Object.values(updates).filter((_, index) => {
        const key = Object.keys(updates)[index];
        return key !== 'id' && key !== 'createdAt';
      });
      
      // Handle boolean values properly for SQLite
      const processedValues = values.map(value => {
        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }
        return value;
      });
      
      processedValues.push(new Date().toISOString(), id);
      
      console.log('Executing update query:', query, 'with values:', processedValues);
      await this.db.executeSql(query, processedValues);
      console.log('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteTask(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('DELETE FROM task_completions WHERE task_id = ?', [id]);
    await this.db.executeSql('DELETE FROM tasks WHERE id = ?', [id]);
  }

  async completeTask(taskId: string, notes?: string): Promise<TaskCompletion> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString();
    const completedAt = new Date().toISOString();

    const query = `
      INSERT INTO task_completions (id, task_id, completed_at, notes)
      VALUES (?, ?, ?, ?)
    `;

    await this.db.executeSql(query, [id, taskId, completedAt, notes || null]);

    return {
      id,
      taskId,
      completedAt,
      notes,
    };
  }

  async getCompletions(taskId?: string, date?: string): Promise<TaskCompletion[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM task_completions';
    const params: any[] = [];
    const conditions: string[] = [];

    if (taskId) {
      conditions.push('task_id = ?');
      params.push(taskId);
    }

    if (date) {
      conditions.push('date(completed_at) = date(?)');
      params.push(date);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const [result] = await this.db.executeSql(query, params);
    const completions: TaskCompletion[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      completions.push({
        id: row.id,
        taskId: row.task_id,
        completedAt: row.completed_at,
        notes: row.notes,
      });
    }

    return completions;
  }

  async isTaskCompletedToday(taskId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const today = new Date().toISOString().split('T')[0];
    const query = `
      SELECT COUNT(*) as count FROM task_completions 
      WHERE task_id = ? AND date(completed_at) = date(?)
    `;

    const [result] = await this.db.executeSql(query, [taskId, today]);
    const count = result.rows.item(0).count;
    
    return count > 0;
  }

  async getOverdueTasks(): Promise<Task[]> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Get just the date part
    const currentTime = now.toTimeString().substring(0, 5); // Get HH:MM format
    
    const query = `
      SELECT t.* FROM tasks t
      LEFT JOIN task_completions tc ON t.id = tc.task_id 
        AND date(tc.completed_at) = date(t.due_date)
      WHERE (
        (t.due_date < ? OR 
         (t.due_date = ? AND t.due_time IS NOT NULL AND t.due_time < ?))
        AND tc.id IS NULL
      )
      ORDER BY t.due_date, t.due_time
    `;

    const [result] = await this.db.executeSql(query, [today, today, currentTime]);
    const tasks: Task[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      tasks.push({
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.type,
        dueDate: row.due_date,
        dueTime: row.due_time,
        isRecurring: row.is_recurring === 1,
        recurrencePattern: row.recurrence_pattern,
        recurrenceInterval: row.recurrence_interval,
        priority: row.priority,
        categoryId: row.category_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }

    return tasks;
  }

  async createCategory(name: string, color: string, icon?: string): Promise<Category> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString();
    const query = 'INSERT INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?)';
    
    await this.db.executeSql(query, [id, name, color, icon || null]);

    return { id, name, color, icon };
  }

  async getCategories(): Promise<Category[]> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql('SELECT * FROM categories');
    const categories: Category[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      categories.push({
        id: row.id,
        name: row.name,
        color: row.color,
        icon: row.icon,
      });
    }

    return categories;
  }

  async getTaskWithCompletions(taskId: string): Promise<{ task: Task; completions: TaskCompletion[] } | null> {
    if (!this.db) throw new Error('Database not initialized');

    // Get the task by ID directly from database
    const [result] = await this.db.executeSql('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (result.rows.length === 0) return null;

    const row = result.rows.item(0);
    const task: Task = {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      dueDate: row.due_date,
      dueTime: row.due_time,
      isRecurring: row.is_recurring === 1,
      recurrencePattern: row.recurrence_pattern,
      recurrenceInterval: row.recurrence_interval,
      priority: row.priority,
      categoryId: row.category_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    const completions = await this.getCompletions(taskId);
    return { task, completions };
  }

  async getCompletionAnalyticsForDateRange(
    startDate: string, 
    endDate: string
  ): Promise<{ tasks: Task[]; completions: TaskCompletion[] }> {
    if (!this.db) throw new Error('Database not initialized');

    // Get all completions in the date range
    const completionsQuery = `
      SELECT * FROM task_completions 
      WHERE date(completed_at) BETWEEN date(?) AND date(?)
      ORDER BY completed_at DESC
    `;
    
    const [completionsResult] = await this.db.executeSql(completionsQuery, [startDate, endDate]);
    const completions: TaskCompletion[] = [];

    for (let i = 0; i < completionsResult.rows.length; i++) {
      const row = completionsResult.rows.item(i);
      completions.push({
        id: row.id,
        taskId: row.task_id,
        completedAt: row.completed_at,
        notes: row.notes,
      });
    }

    // Get all tasks that were completed in this date range
    const taskIds = [...new Set(completions.map(c => c.taskId))];
    const tasks: Task[] = [];

    for (const taskId of taskIds) {
      const [result] = await this.db.executeSql('SELECT * FROM tasks WHERE id = ?', [taskId]);
      if (result.rows.length > 0) {
        const row = result.rows.item(0);
        tasks.push({
          id: row.id,
          title: row.title,
          description: row.description,
          type: row.type,
          dueDate: row.due_date,
          dueTime: row.due_time,
          isRecurring: row.is_recurring === 1,
          recurrencePattern: row.recurrence_pattern,
          recurrenceInterval: row.recurrence_interval,
          priority: row.priority,
          categoryId: row.category_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
    }

    return { tasks, completions };
  }

  async getRecentCompletionTrends(days: number = 30): Promise<{
    tasks: Task[];
    completions: TaskCompletion[];
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getCompletionAnalyticsForDateRange(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
  }

  async resetDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log('Database: Starting database reset...');
      
      // Delete all data from tables in reverse order of dependencies
      await this.db.executeSql('DELETE FROM task_completions');
      console.log('Database: Cleared task_completions table');
      
      await this.db.executeSql('DELETE FROM tasks');
      console.log('Database: Cleared tasks table');
      
      await this.db.executeSql('DELETE FROM categories');
      console.log('Database: Cleared categories table');
      
      console.log('Database: Database reset completed successfully');
    } catch (error) {
      console.error('Database: Error resetting database:', error);
      throw new Error(`Failed to reset database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async dropAndRecreateDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log('Database: Starting complete database recreation...');
      
      // Drop all tables
      await this.db.executeSql('DROP TABLE IF EXISTS task_completions');
      await this.db.executeSql('DROP TABLE IF EXISTS tasks');
      await this.db.executeSql('DROP TABLE IF EXISTS categories');
      
      console.log('Database: All tables dropped');
      
      // Recreate tables
      await this.createTables();
      
      console.log('Database: Database recreation completed successfully');
    } catch (error) {
      console.error('Database: Error recreating database:', error);
      throw new Error(`Failed to recreate database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default new DatabaseService();