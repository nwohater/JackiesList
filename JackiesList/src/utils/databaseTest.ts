import SQLite from 'react-native-sqlite-storage';

export async function testSQLiteConnection(): Promise<string> {
  try {
    console.log('Testing SQLite connection...');
    
    // Enable debug logging
    SQLite.DEBUG(true);
    SQLite.enablePromise(true);
    
    // Try to open a simple test database
    const db = await SQLite.openDatabase({
      name: 'test.db',
      location: 'default',
    });
    
    console.log('Test database opened successfully');
    
    // Try a simple query
    const result = await db.executeSql('SELECT 1 as test');
    console.log('Test query executed successfully:', result);
    
    // Close the test database
    await db.close();
    console.log('Test database closed successfully');
    
    return 'SQLite connection test passed';
  } catch (error) {
    console.error('SQLite connection test failed:', error);
    if (error instanceof Error) {
      return `SQLite test failed: ${error.message}`;
    }
    return 'SQLite test failed: Unknown error';
  }
}