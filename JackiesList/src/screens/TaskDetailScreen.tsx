import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Task } from '../types';
import taskService from '../services/taskService';
import { formatTime, formatDate, isPastDue } from '../utils/date';
import { formatRecurrenceText } from '../utils/recurrence';
import { useTheme } from '../contexts/ThemeContext';

interface TaskDetailScreenProps {
  navigation: any;
  route: {
    params: {
      taskId: string;
    };
  };
}

const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTask();
    }, [])
  );

  const loadTask = async () => {
    try {
      const taskData = await taskService.getTaskById(route.params.taskId);
      setTask(taskData);
      
      if (taskData) {
        const completionStatus = await taskService.isTaskCompletedToday(taskData.id);
        setIsCompleted(completionStatus);
      }
    } catch (error) {
      console.error('Error loading task:', error);
      Alert.alert('Error', 'Failed to load task details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!task) return;

    try {
      await taskService.completeTask(task.id);
      setIsCompleted(true);
      Alert.alert('Success', 'Task completed!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error completing task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete task';
      
      if (errorMessage.includes('already completed')) {
        Alert.alert('Already Completed', 'This task has already been completed today.');
        setIsCompleted(true);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const handleEditTask = () => {
    if (!task) return;
    navigation.navigate('CreateTask', { editTaskId: task.id });
  };

  const handleDeleteTask = () => {
    if (!task) return;

    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskService.deleteTask(task.id);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.headerBackground, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Task Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={{ color: theme.text }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.headerBackground, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Task Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={{ color: theme.text }}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOverdue = isPastDue(task.dueDate, task.dueTime);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.headerBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Task Details</Text>
        <TouchableOpacity onPress={handleEditTask}>
          <Icon name="edit" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.content, { backgroundColor: theme.background }]}>
        <View style={[styles.taskCard, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.taskHeader}>
            <Icon
              name={getTaskIcon(task.type)}
              size={32}
              color={getPriorityColor(task.priority)}
            />
            <View style={styles.taskTitleContainer}>
              <Text style={[
                styles.taskTitle, 
                { color: theme.text },
                isOverdue && { color: theme.error }
              ]}>
                {task.title}
              </Text>
              <Text style={[styles.taskType, { color: theme.textSecondary }]}>
                {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
              </Text>
            </View>
          </View>

          {task.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Description</Text>
              <Text style={[styles.description, { color: theme.textSecondary }]}>{task.description}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Due Date</Text>
            <Text style={[
              styles.dateText, 
              { color: theme.text },
              isOverdue && { color: theme.error }
            ]}>
              {formatDate(task.dueDate)}
              {task.dueTime && ` at ${formatTime(task.dueTime)}`}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Priority</Text>
            <View style={styles.priorityContainer}>
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: getPriorityColor(task.priority) },
                ]}
              />
              <Text style={[styles.priorityText, { color: theme.text }]}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Text>
            </View>
          </View>

          {task.isRecurring && task.recurrencePattern && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recurrence</Text>
              <Text style={[styles.recurrenceText, { color: theme.text }]}>
                {formatRecurrenceText(task.recurrencePattern, task.recurrenceInterval)}
              </Text>
            </View>
          )}

          {isOverdue && (
            <View style={[styles.overdueWarning, { backgroundColor: theme.error + '20' }]}>
              <Icon name="warning" size={20} color={theme.error} />
              <Text style={[styles.overdueWarningText, { color: theme.error }]}>This task is overdue</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.completeButton,
              { backgroundColor: theme.success },
              isCompleted && { backgroundColor: theme.success + '80', opacity: 0.7 }
            ]}
            onPress={handleCompleteTask}
            disabled={isCompleted}
          >
            <Icon 
              name={isCompleted ? "check-circle" : "check"} 
              size={20} 
              color={theme.surface} 
            />
            <Text style={[styles.completeButtonText, { color: theme.surface }]}>
              {isCompleted ? 'Completed Today' : 'Complete Task'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: theme.error }]}
            onPress={handleDeleteTask}
          >
            <Icon name="delete" size={20} color={theme.surface} />
            <Text style={[styles.deleteButtonText, { color: theme.surface }]}>Delete Task</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  taskTitleContainer: {
    marginLeft: 15,
    flex: 1,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskType: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
  },
  dateText: {
    fontSize: 16,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  priorityText: {
    fontSize: 16,
  },
  recurrenceText: {
    fontSize: 16,
  },
  overdueWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  overdueWarningText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  actions: {
    gap: 15,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default TaskDetailScreen;