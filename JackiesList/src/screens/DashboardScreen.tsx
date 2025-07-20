import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Task, DashboardMetrics } from '../types';
import taskService from '../services/taskService';
import { formatTime, isPastDue } from '../utils/date';
import { testSQLiteConnection } from '../utils/databaseTest';
import { useTheme } from '../contexts/ThemeContext';

type FilterType = 'all' | 'completed' | 'overdue' | 'pending';

const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    todayTasks: 0,
    completedToday: 0,
    overdueTasks: 0,
    completionRate: 0,
    currentStreak: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      console.log('DashboardScreen: Starting data loading...');
      
      // First test SQLite connection
      console.log('DashboardScreen: Testing SQLite connection...');
      const testResult = await testSQLiteConnection();
      console.log('DashboardScreen: SQLite test result:', testResult);
      
      console.log('DashboardScreen: Loading today tasks...');
      const tasks = await taskService.getTodayTasks();
      console.log('DashboardScreen: Today tasks loaded:', tasks.length);
      
      console.log('DashboardScreen: Loading dashboard metrics...');
      const dashboardMetrics = await taskService.getDashboardMetrics();
      console.log('DashboardScreen: Dashboard metrics loaded:', dashboardMetrics);
      
      // Load completion status for today's tasks
      console.log('DashboardScreen: Loading completion status...');
      const completedTaskIds = new Set<string>();
      for (const task of tasks) {
        const isCompleted = await taskService.isTaskCompletedToday(task.id);
        if (isCompleted) {
          completedTaskIds.add(task.id);
        }
      }
      
      setAllTasks(tasks);
      setTodayTasks(tasks);
      setCompletedTasks(completedTaskIds);
      setMetrics(dashboardMetrics);
      console.log('DashboardScreen: Data loading completed successfully');
    } catch (error) {
      console.error('DashboardScreen: Error loading dashboard data:', error);
      if (error instanceof Error) {
        console.error('DashboardScreen: Error message:', error.message);
        console.error('DashboardScreen: Error stack:', error.stack);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Error Loading Tasks', 
        `Failed to load tasks: ${errorMessage}\n\nPlease check the console for more details.`,
        [
          { text: 'OK' },
          { text: 'Retry', onPress: loadData }
        ]
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const applyFilter = (filter: FilterType) => {
    setActiveFilter(filter);
    
    let filteredTasks = [...allTasks];
    
    switch (filter) {
      case 'completed':
        filteredTasks = allTasks.filter(task => completedTasks.has(task.id));
        break;
      case 'overdue':
        filteredTasks = allTasks.filter(task => 
          !completedTasks.has(task.id) && isPastDue(task.dueDate, task.dueTime)
        );
        break;
      case 'pending':
        filteredTasks = allTasks.filter(task => 
          !completedTasks.has(task.id) && !isPastDue(task.dueDate, task.dueTime)
        );
        break;
      case 'all':
      default:
        filteredTasks = allTasks;
        break;
    }
    
    setTodayTasks(filteredTasks);
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      await taskService.completeTask(task.id);
      
      // Update local state immediately for better UX
      setCompletedTasks(prev => new Set([...prev, task.id]));
      
      // Reload data to get updated metrics
      await loadData();
      
      // Reapply current filter
      setTimeout(() => applyFilter(activeFilter), 100);
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.primary }]} edges={['top']}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={[styles.title, { color: theme.surface }]}>Jackie's List</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateTask')}
          style={styles.addButton}
        >
          <Icon name="add" size={28} color={theme.surface} />
        </TouchableOpacity>
      </View>

      <View style={styles.metricsContainer}>
        <TouchableOpacity 
          style={[
            styles.metricCard, 
            { backgroundColor: theme.cardBackground },
            activeFilter === 'all' && { backgroundColor: theme.primary + '20', borderColor: theme.primary }
          ]}
          onPress={() => applyFilter('all')}
        >
          <Text style={[styles.metricValue, { color: theme.text }]}>{metrics.todayTasks}</Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.metricCard, 
            { backgroundColor: theme.cardBackground },
            activeFilter === 'completed' && { backgroundColor: theme.primary + '20', borderColor: theme.primary }
          ]}
          onPress={() => applyFilter('completed')}
        >
          <Text style={[styles.metricValue, { color: theme.success }]}>
            {metrics.completedToday}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.metricCard, 
            { backgroundColor: theme.cardBackground },
            activeFilter === 'overdue' && { backgroundColor: theme.primary + '20', borderColor: theme.primary }
          ]}
          onPress={() => applyFilter('overdue')}
        >
          <Text style={[styles.metricValue, { color: theme.error }]}>
            {metrics.overdueTasks}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Late</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.metricCard, 
            { backgroundColor: theme.cardBackground },
            activeFilter === 'pending' && { backgroundColor: theme.primary + '20', borderColor: theme.primary }
          ]}
          onPress={() => applyFilter('pending')}
        >
          <Text style={[styles.metricValue, { color: theme.primary }]}>
            {allTasks.length - completedTasks.size - metrics.overdueTasks}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>ToDo</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.completionRate, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.completionRateLabel, { color: theme.text }]}>Today's Completion</Text>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${metrics.completionRate}%`, backgroundColor: theme.success },
            ]}
          />
        </View>
        <Text style={[styles.completionRateText, { color: theme.textSecondary }]}>
          {metrics.completionRate}%
        </Text>
      </View>

      <View style={styles.tasksSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {activeFilter === 'all' ? "Today" :
           activeFilter === 'completed' ? 'Completed Tasks' :
           activeFilter === 'overdue' ? 'Overdue Tasks' :
           'Pending Tasks'}
        </Text>
        {todayTasks.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {activeFilter === 'all' ? 'No tasks for today!' :
             activeFilter === 'completed' ? 'No completed tasks!' :
             activeFilter === 'overdue' ? 'No overdue tasks!' :
             'No pending tasks!'}
          </Text>
        ) : (
          todayTasks.map(renderTask)
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
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  metricCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 4,
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
    minHeight: 16,
  },
  completionRate: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  completionRateLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  completionRateText: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'right',
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

export default DashboardScreen;