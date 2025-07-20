export const lightTheme = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  primary: '#2196F3',
  primaryDark: '#1976D2',
  secondary: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E0E0E0',
  divider: '#E0E0E0',
  success: '#4CAF50',
  info: '#2196F3',
  
  // Component specific
  headerBackground: '#FFFFFF',
  cardBackground: '#FFFFFF',
  inputBackground: '#FFFFFF',
  inputBorder: '#DDDDDD',
  tabBarBackground: '#FFFFFF',
  tabBarActiveTint: '#2196F3',
  tabBarInactiveTint: '#999999',
};

export const darkTheme = {
  background: '#121212',
  surface: '#1E1E1E',
  primary: '#2196F3',
  primaryDark: '#1976D2',
  secondary: '#4CAF50',
  error: '#CF6679',
  warning: '#FFB74D',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textLight: '#808080',
  border: '#333333',
  divider: '#333333',
  success: '#81C784',
  info: '#64B5F6',
  
  // Component specific
  headerBackground: '#1E1E1E',
  cardBackground: '#2C2C2C',
  inputBackground: '#2C2C2C',
  inputBorder: '#444444',
  tabBarBackground: '#1E1E1E',
  tabBarActiveTint: '#2196F3',
  tabBarInactiveTint: '#808080',
};

export type Theme = typeof lightTheme;