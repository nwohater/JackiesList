import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Task, TaskType, RecurrencePattern, Priority } from '../types';
import taskService from '../services/taskService';
import notificationService from '../services/notificationService';
import { getDateString, getTimeString } from '../utils/date';

const CreateTaskScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const editTaskId = route?.params?.editTaskId;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('task');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
    return today;
  });
  const [dueTime, setDueTime] = useState<Date | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('daily');
  const [customInterval, setCustomInterval] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Load existing task data if editing
  useEffect(() => {
    const loadTaskData = async () => {
      if (editTaskId) {
        try {
          const task = await taskService.getTaskById(editTaskId);
          if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setType(task.type);
            setPriority(task.priority);
            setDueDate(new Date(task.dueDate + 'T12:00:00'));
            
            if (task.dueTime) {
              const [hours, minutes] = task.dueTime.split(':');
              const timeDate = new Date();
              timeDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
              setDueTime(timeDate);
            }
            
            setIsRecurring(task.isRecurring || false);
            if (task.recurrencePattern) {
              setRecurrencePattern(task.recurrencePattern);
            }
            if (task.recurrenceInterval) {
              setCustomInterval(task.recurrenceInterval.toString());
            }
          }
        } catch (error) {
          console.error('Error loading task for editing:', error);
          Alert.alert('Error', 'Failed to load task data');
        }
      }
    };

    loadTaskData();
  }, [editTaskId]);

  const taskTypes: { value: TaskType; label: string; icon: string }[] = [
    { value: 'task', label: 'Task', icon: 'check-circle-outline' },
    { value: 'chore', label: 'Chore', icon: 'cleaning-services' },
    { value: 'appointment', label: 'Appt', icon: 'event' },
  ];

  const priorities: { value: Priority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: '#4CAF50' },
    { value: 'medium', label: 'Medium', color: '#FFC107' },
    { value: 'high', label: 'High', color: '#FF5252' },
  ];

  const recurrenceOptions: { value: RecurrencePattern; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 weeks' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Every 3 months' },
    { value: 'annually', label: 'Yearly' },
    { value: 'custom', label: 'Custom days' },
  ];

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        dueDate: getDateString(dueDate),
        dueTime: dueTime ? getTimeString(dueTime) : undefined,
        isRecurring,
        recurrencePattern: isRecurring ? recurrencePattern : undefined,
        recurrenceInterval: recurrencePattern === 'custom' ? parseInt(customInterval, 10) : undefined,
      };

      if (editTaskId) {
        // Update existing task
        await taskService.updateTask(editTaskId, taskData);
        
        // Get the updated task for notifications
        if (dueTime) {
          const updatedTask = await taskService.getTaskById(editTaskId);
          if (updatedTask) {
            notificationService.scheduleTaskNotification(updatedTask);
          }
        }
      } else {
        // Create new task
        const createdTask = await taskService.createTask(taskData);
        
        if (dueTime) {
          notificationService.scheduleTaskNotification(createdTask);
        }
      }

      navigation.goBack();
    } catch (error) {
      console.error(`Error ${editTaskId ? 'updating' : 'creating'} task:`, error);
      Alert.alert('Error', `Failed to ${editTaskId ? 'update' : 'create'} task`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editTaskId ? 'Edit Task' : 'Create Task'}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter task title"
            placeholderTextColor="#999"
          />
        </View>


        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter task description (optional)"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.segmentedControl}>
            {taskTypes.map((taskType) => (
              <TouchableOpacity
                key={taskType.value}
                style={[
                  styles.segmentButton,
                  type === taskType.value && styles.segmentButtonActive,
                ]}
                onPress={() => setType(taskType.value)}
              >
                <Icon
                  name={taskType.icon}
                  size={20}
                  color={type === taskType.value ? '#FFFFFF' : '#666'}
                />
                <Text
                  style={[
                    styles.segmentButtonText,
                    type === taskType.value && styles.segmentButtonTextActive,
                  ]}
                >
                  {taskType.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.segmentedControl}>
            {priorities.map((pri) => (
              <TouchableOpacity
                key={pri.value}
                style={[
                  styles.segmentButton,
                  priority === pri.value && styles.segmentButtonActive,
                  priority === pri.value && { backgroundColor: pri.color },
                ]}
                onPress={() => setPriority(pri.value)}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    priority === pri.value && styles.segmentButtonTextActive,
                  ]}
                >
                  {pri.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Due Date</Text>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: '#E3F2FD' }]} // Add visible background
            onPress={() => {
              console.log('Opening date picker...');
              setShowDatePicker(true);
            }}
            activeOpacity={0.7}
          >
            <Icon name="calendar-today" size={20} color="#666" />
            <Text style={styles.dateButtonText}>
              {dueDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Due Time (Optional)</Text>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: '#FFF3E0' }]} // Add visible background
            onPress={() => {
              console.log('Opening time picker...');
              setShowTimePicker(true);
            }}
            activeOpacity={0.7}
          >
            <Icon name="access-time" size={20} color="#666" />
            <Text style={styles.dateButtonText}>
              {dueTime ? dueTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Select time'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.switchGroup}>
          <Text style={styles.label}>Recurring Task</Text>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: '#E0E0E0', true: '#81C784' }}
            thumbColor={isRecurring ? '#4CAF50' : '#f4f3f4'}
          />
        </View>

        {isRecurring && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Recurrence Pattern</Text>
              <View style={styles.recurrenceOptions}>
                {recurrenceOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.recurrenceButton,
                      recurrencePattern === option.value && styles.recurrenceButtonActive,
                    ]}
                    onPress={() => setRecurrencePattern(option.value)}
                  >
                    <Text
                      style={[
                        styles.recurrenceButtonText,
                        recurrencePattern === option.value && styles.recurrenceButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {recurrencePattern === 'custom' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Every X Days</Text>
                <TextInput
                  style={styles.input}
                  value={customInterval}
                  onChangeText={setCustomInterval}
                  placeholder="Enter number of days"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
            )}
          </>
        )}
      </View>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        minimumDate={new Date()}
        onConfirm={(selectedDate) => {
          console.log('Date picker onConfirm:', selectedDate);
          setShowDatePicker(false);
          setDueDate(selectedDate);
          console.log('Date updated to:', selectedDate);
        }}
        onCancel={() => {
          console.log('Date picker cancelled');
          setShowDatePicker(false);
        }}
      />

      <DateTimePickerModal
        isVisible={showTimePicker}
        mode="time"
        onConfirm={(selectedTime) => {
          console.log('Time picker onConfirm:', selectedTime);
          setShowTimePicker(false);
          setDueTime(selectedTime);
          console.log('Time updated to:', selectedTime);
        }}
        onCancel={() => {
          console.log('Time picker cancelled');
          setShowTimePicker(false);
        }}
      />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Match header color for status bar area
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  segmentButtonActive: {
    backgroundColor: '#2196F3',
  },
  segmentButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2, // Increased border width
    borderColor: '#2196F3', // Blue border to make it visible
    minHeight: 50, // Ensure minimum touch area
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  recurrenceOptions: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    marginTop: 8,
  },
  recurrenceButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  recurrenceButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  recurrenceButtonText: {
    fontSize: 14,
    color: '#666',
  },
  recurrenceButtonTextActive: {
    color: '#FFFFFF',
  },
});

export default CreateTaskScreen;