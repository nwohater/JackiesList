import React from 'react';
import { StatusBar } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const ThemedStatusBar = () => {
  const { theme, isDark } = useTheme();
  
  return (
    <StatusBar 
      barStyle={isDark ? 'light-content' : 'dark-content'} 
      backgroundColor={theme.headerBackground}
    />
  );
};

export default ThemedStatusBar;