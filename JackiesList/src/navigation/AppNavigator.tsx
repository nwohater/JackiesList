import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import DashboardScreen from '../screens/DashboardScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import CalendarScreen from '../screens/CalendarScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const DashboardStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
    </Stack.Navigator>
  );
};

const CalendarStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName = 'home';

            if (route.name === 'Home') {
              iconName = 'home';
            } else if (route.name === 'Calendar') {
              iconName = 'calendar-today';
            } else if (route.name === 'Stats') {
              iconName = 'bar-chart';
            } else if (route.name === 'Settings') {
              iconName = 'settings';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={DashboardStack} />
        <Tab.Screen name="Calendar" component={CalendarStack} />
        <Tab.Screen name="Stats" component={ComingSoonScreen} />
        <Tab.Screen name="Settings" component={ComingSoonScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const ComingSoonScreen = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }} edges={['top']}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, color: '#666' }}>Coming Soon</Text>
      </View>
    </SafeAreaView>
  );
};

import { View, Text } from 'react-native';

export default AppNavigator;