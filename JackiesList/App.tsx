import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import CustomSplashScreen from './src/components/CustomSplashScreen';
import database from './src/services/database';
import notificationService from './src/services/notificationService';
import taskService from './src/services/taskService';
import { ThemeProvider } from './src/contexts/ThemeContext';
import ThemedStatusBar from './src/components/ThemedStatusBar';

function App(): React.JSX.Element {
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('App: Starting app initialization...');
        await database.init();
        console.log('App: Database initialized successfully');
        
        notificationService.requestPermissions();
        notificationService.scheduleMorningNotification();
        notificationService.scheduleEveningNotification();
        console.log('App: Notification services initialized');
        
        // Generate any missing recurring task instances
        await taskService.generateMissingRecurringInstances();
        console.log('App: Recurring task instances checked');
        
        console.log('App: App initialization completed successfully');
        setAppReady(true);
      } catch (error) {
        console.error('App: Failed to initialize app:', error);
        console.error('App: Error details:', JSON.stringify(error, null, 2));
        if (error instanceof Error) {
          console.error('App: Error message:', error.message);
          console.error('App: Error stack:', error.stack);
        }
        setAppReady(true); // Still show app even if initialization fails
      }
    };

    initializeApp();
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  if (showSplash || !appReady) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <CustomSplashScreen onFinish={handleSplashFinish} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
