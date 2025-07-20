import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, DateData } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Task } from '../types';
import taskService from '../services/taskService';
import { formatTime, isPastDue, getDateString } from '../utils/date';
import { useTheme } from '../contexts/ThemeContext';

const CalendarScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const [selectedDate, setSelectedDate] = useState(getDateString(new Date()));
  const [tasksForDate, setTasksForDate] = useState<Task[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const loadCalendarData = async () => {
    try {
      console.log('CalendarScreen: Loading calendar data...');
      
      // Load tasks for the next 30 days to mark calendar dates
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      
      const allTasks: Task[] = [];
      const marks: any = {};
      
      // Get tasks for each day in the range
      for (let d = new Date(); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = getDateString(d);
        const dayTasks = await taskService.getTasks(dateStr);
        allTasks.push(...dayTasks);
        
        if (dayTasks.length > 0) {
          // Check completion status
          let completedCount = 0;
          let overdueCount = 0;
          const today = getDateString(new Date());
          
          for (const task of dayTasks) {
            const isCompleted = await taskService.isTaskCompletedToday(task.id);
            if (isCompleted) {
              completedCount++;
            } else {
              // Simple overdue logic: task is overdue if its date is before today
              // OR if it's today and has a time that has passed
              let isTaskOverdue = false;
              
              if (dateStr < today) {
                // Past date - definitely overdue
                isTaskOverdue = true;
              } else if (dateStr === today && task.dueTime) {
                // Today with specific time - check if time has passed
                const now = new Date();
                const taskDateTime = new Date(task.dueDate);
                const [hours, minutes] = task.dueTime.split(':');
                taskDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                isTaskOverdue = taskDateTime < now;
              }
              // Future dates (dateStr > today) are never overdue
              
              if (isTaskOverdue) {
                overdueCount++;
              }
            }
          }
          
          // Determine mark color based on task status
          let dotColor = theme.primary; // Default blue for pending tasks
          if (completedCount === dayTasks.length) {
            dotColor = theme.success; // Green for all completed
          } else if (overdueCount > 0) {
            dotColor = theme.error; // Red for any overdue
          }
          
          marks[dateStr] = {
            marked: true,
            dotColor,
            selectedColor: selectedDate === dateStr ? theme.primary : undefined,
            selected: selectedDate === dateStr,
          };
        }
      }
      
      // Add selection for current date even if no tasks
      if (!marks[selectedDate]) {
        marks[selectedDate] = {
          selected: true,
          selectedColor: theme.primary,
        };
      }
      
      setMarkedDates(marks);
      
      // Load tasks for currently selected date
      await loadTasksForDate(selectedDate);
      
      console.log('CalendarScreen: Calendar data loaded successfully');
    } catch (error) {
      console.error('CalendarScreen: Error loading calendar data:', error);
      Alert.alert('Error', 'Failed to load calendar data');
    }
  };

  const loadTasksForDate = async (dateStr: string) => {
    try {
      const tasks = await taskService.getTasks(dateStr);
      setTasksForDate(tasks);
      
      // Load completion status for tasks
      const completedTaskIds = new Set<string>();
      for (const task of tasks) {
        const isCompleted = await taskService.isTaskCompletedToday(task.id);
        if (isCompleted) {
          completedTaskIds.add(task.id);
        }
      }
      setCompletedTasks(completedTaskIds);
    } catch (error) {
      console.error('Error loading tasks for date:', error);
      Alert.alert('Error', 'Failed to load tasks for selected date');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCalendarData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCalendarData();
    setRefreshing(false);
  };

  const onDayPress = (day: DateData) => {
    const newDate = day.dateString;
    setSelectedDate(newDate);
    
    // Update marked dates to show new selection
    const newMarkedDates = { ...markedDates };
    
    // Remove selection from all dates
    Object.keys(newMarkedDates).forEach(date => {
      if (newMarkedDates[date]) {
        newMarkedDates[date] = {
          ...newMarkedDates[date],
          selected: date === newDate,
          selectedColor: date === newDate ? theme.primary : undefined,
        };
      }
    });
    
    // Add selection for new date if it doesn't exist
    if (!newMarkedDates[newDate]) {
      newMarkedDates[newDate] = {
        selected: true,
        selectedColor: theme.primary,
      };
    }
    
    setMarkedDates(newMarkedDates);
    loadTasksForDate(newDate);
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      await taskService.completeTask(task.id);
      setCompletedTasks(prev => new Set([...prev, task.id]));
      
      // Reload calendar data to update markers
      await loadCalendarData();
    } catch (error) {
      console.error('Error completing task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete task';
      
      if (errorMessage.includes('already completed')) {
        Alert.alert('Already Completed', 'This task has already been completed today.');
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const getTaskIcon = (type: Task['type']) => {
    switch (type) {
      case 'appointment':
        return 'event';
      case 'chore':
        return 'cleaning-services';
      case 'task':
        return 'check-circle-outline';
      default:
        return 'radio-button-unchecked';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return '#FF5252';
      case 'medium':
        return '#FFC107';
      case 'low':
        return '#4CAF50';
      default:
        return '#757575';
    }
  };

  const renderTask = (task: Task) => {
    const isOverdue = isPastDue(task.dueDate, task.dueTime);
    const isCompleted = completedTasks.has(task.id);
    
    return (
      <TouchableOpacity
        key={task.id}
        style={[
          styles.taskItem, 
          { backgroundColor: theme.cardBackground },
          isOverdue && { backgroundColor: theme.error + '20' },
          isCompleted && { backgroundColor: theme.success + '20', opacity: 0.7 }
        ]}
        onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
      >
        <View style={styles.taskLeft}>
          <Icon
            name={getTaskIcon(task.type)}
            size={24}
            color={getPriorityColor(task.priority)}
          />
          <View style={styles.taskInfo}>
            <Text style={[
              styles.taskTitle, 
              { color: theme.text },
              isOverdue && { color: theme.error }
            ]}>
              {task.title}
            </Text>
            {task.dueTime && (
              <Text style={[styles.taskTime, { color: theme.textSecondary }]}>{formatTime(task.dueTime)}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            if (!isCompleted) {
              handleCompleteTask(task);
            }
          }}
          style={[
            styles.completeButton,
            isCompleted && styles.completedButton
          ]}
          disabled={isCompleted}
        >
          <Icon 
            name={isCompleted ? "check-circle" : "check"} 
            size={24} 
            color={isCompleted ? theme.success : theme.success} 
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const formatSelectedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dateStr === getDateString(today)) {
      return 'Today';
    } else if (dateStr === getDateString(tomorrow)) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.primary }]} edges={['top']}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <Text style={[styles.title, { color: theme.surface }]}>Calendar</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateTask')}
            style={styles.addButton}
          >
            <Icon name="add" size={28} color={theme.surface} />
          </TouchableOpacity>
        </View>

        <View style={[styles.calendarContainer, { backgroundColor: theme.cardBackground }]}>
          <Calendar
            onDayPress={onDayPress}
            markedDates={markedDates}
            theme={{
              backgroundColor: theme.cardBackground,
              calendarBackground: theme.cardBackground,
              textSectionTitleColor: theme.textLight,
              selectedDayBackgroundColor: theme.primary,
              selectedDayTextColor: theme.surface,
              todayTextColor: theme.primary,
              dayTextColor: theme.text,
              textDisabledColor: theme.textLight,
              dotColor: theme.primary,
              selectedDotColor: theme.surface,
              arrowColor: theme.primary,
              disabledArrowColor: theme.textLight,
              monthTextColor: theme.text,
              indicatorColor: theme.primary,
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '500',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13
            }}
          />
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>All Complete</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.error }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Has Overdue</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Has Pending</Text>
          </View>
        </View>

        <View style={styles.tasksSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {formatSelectedDate(selectedDate)}
          </Text>
          {tasksForDate.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No tasks for this date!</Text>
          ) : (
            tasksForDate.map(renderTask)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    margin: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
  },
  tasksSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskInfo: {
    marginLeft: 15,
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  taskTime: {
    fontSize: 14,
    marginTop: 2,
  },
  completeButton: {
    padding: 5,
  },
  completedButton: {
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default CalendarScreen;