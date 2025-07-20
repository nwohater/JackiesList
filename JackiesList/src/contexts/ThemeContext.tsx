import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, Theme } from '../theme/colors';
import { getSettings, updateSettings, UserSettings } from '../services/settingsService';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>('system');
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    loadThemeSettings();
  }, []);

  const loadThemeSettings = async () => {
    try {
      const userSettings = await getSettings();
      setSettings(userSettings);
      setThemeModeState(userSettings.theme);
    } catch (error) {
      console.error('Error loading theme settings:', error);
    }
  };

  const setThemeMode = async (mode: 'light' | 'dark' | 'system') => {
    try {
      await updateSettings({ theme: mode });
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme settings:', error);
      throw error;
    }
  };

  const getCurrentTheme = (): { theme: Theme; isDark: boolean } => {
    let isDark = false;
    
    if (themeMode === 'system') {
      isDark = systemColorScheme === 'dark';
    } else {
      isDark = themeMode === 'dark';
    }

    return {
      theme: isDark ? darkTheme : lightTheme,
      isDark,
    };
  };

  const { theme, isDark } = getCurrentTheme();

  return (
    <ThemeContext.Provider value={{ theme, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};