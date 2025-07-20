import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSettings {
  recurringTaskGenerationDays: number;
  theme: 'light' | 'dark' | 'system';
  // Add more settings here as needed
}

const DEFAULT_SETTINGS: UserSettings = {
  recurringTaskGenerationDays: 30, // Default to 30 days
  theme: 'system', // Default to system theme
};

const SETTINGS_KEY = '@jackieslist_settings';

export const getSettings = async (): Promise<UserSettings> => {
  try {
    const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      // Merge with defaults to ensure all fields exist
      return { ...DEFAULT_SETTINGS, ...settings };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const updateSettings = async (updates: Partial<UserSettings>): Promise<void> => {
  try {
    const currentSettings = await getSettings();
    const newSettings = { ...currentSettings, ...updates };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

export const resetSettings = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  } catch (error) {
    console.error('Error resetting settings:', error);
    throw error;
  }
};