import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getSettings, updateSettings, UserSettings } from '../services/settingsService';
import { useTheme } from '../contexts/ThemeContext';
import database from '../services/database';

const SettingsScreen = () => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [recurringDays, setRecurringDays] = useState('30');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userSettings = await getSettings();
      setSettings(userSettings);
      setRecurringDays(userSettings.recurringTaskGenerationDays.toString());
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRecurringDays = async () => {
    const days = parseInt(recurringDays, 10);
    
    if (isNaN(days) || days < 1 || days > 365) {
      Alert.alert('Invalid Input', 'Please enter a number between 1 and 365');
      return;
    }

    try {
      await updateSettings({ recurringTaskGenerationDays: days });
      setSettings(prev => prev ? { ...prev, recurringTaskGenerationDays: days } : null);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleResetDatabase = () => {
    Alert.alert(
      'Reset Database',
      'This will delete all your tasks, categories, and completion history. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.resetDatabase();
              Alert.alert(
                'Success', 
                'Database has been reset. Please close and restart the app for changes to take effect.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Note: To auto-restart, you could install react-native-restart package
                      // For now, user needs to manually restart the app
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Error resetting database:', error);
              Alert.alert('Error', 'Failed to reset database');
            }
          }
        }
      ]
    );
  };

  if (isLoading || !settings) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.text }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.headerBackground, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Theme</Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                Choose your preferred color scheme
              </Text>
            </View>
            
            <View style={styles.themeOptions}>
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.themeOption,
                    { borderColor: theme.border },
                    themeMode === mode && { borderColor: theme.primary, backgroundColor: theme.primary + '20' }
                  ]}
                  onPress={() => setThemeMode(mode)}
                >
                  <Icon 
                    name={mode === 'light' ? 'light-mode' : mode === 'dark' ? 'dark-mode' : 'settings-brightness'} 
                    size={24} 
                    color={themeMode === mode ? theme.primary : theme.textSecondary} 
                  />
                  <Text style={[
                    styles.themeOptionText, 
                    { color: themeMode === mode ? theme.primary : theme.textSecondary }
                  ]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recurring Tasks</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Generate recurring tasks for</Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                How many days in advance should recurring tasks be generated?
              </Text>
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { borderColor: theme.inputBorder, backgroundColor: theme.inputBackground, color: theme.text }]}
                value={recurringDays}
                onChangeText={setRecurringDays}
                keyboardType="number-pad"
                maxLength={3}
                placeholderTextColor={theme.textSecondary}
              />
              <Text style={[styles.inputSuffix, { color: theme.textSecondary }]}>days</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }]}
            onPress={handleSaveRecurringDays}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Data Management</Text>
          
          <TouchableOpacity
            style={[styles.dangerButton, { borderColor: theme.error }]}
            onPress={handleResetDatabase}
          >
            <Icon name="delete-forever" size={24} color={theme.error} />
            <View style={styles.dangerButtonContent}>
              <Text style={[styles.dangerButtonText, { color: theme.error }]}>Reset Database</Text>
              <Text style={[styles.dangerButtonDescription, { color: theme.textSecondary }]}>
                Delete all tasks and start fresh
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
          <View style={styles.aboutItem}>
            <Icon name="info-outline" size={24} color={theme.textSecondary} />
            <Text style={[styles.aboutText, { color: theme.textSecondary }]}>Jackie's List v1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingInfo: {
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    width: 80,
    textAlign: 'center',
  },
  inputSuffix: {
    marginLeft: 8,
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aboutText: {
    marginLeft: 12,
    fontSize: 16,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 8,
    gap: 4,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 8,
    marginTop: 8,
  },
  dangerButtonContent: {
    marginLeft: 12,
    flex: 1,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  dangerButtonDescription: {
    fontSize: 12,
  },
});

export default SettingsScreen;