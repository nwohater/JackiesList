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
import { useTheme } from '../contexts/ThemeContext';

const CreateTaskScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const { theme } = useTheme();
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBackground }]} edges={['top']}>
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.headerBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{editTaskId ? 'Edit Task' : 'Create Task'}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.saveButton, { color: theme.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter task title"
            placeholderTextColor={theme.textLight}
          />
        </View>


        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter task description (optional)"
            placeholderTextColor={theme.textLight}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Type</Text>
          <View style={[styles.segmentedControl, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
            {taskTypes.map((taskType) => (
              <TouchableOpacity
                key={taskType.value}
                style={[
                  styles.segmentButton,
                  type === taskType.value && { backgroundColor: theme.primary },
                ]}
                onPress={() => setType(taskType.value)}
              >
                <Icon
                  name={taskType.icon}
                  size={20}
                  color={type === taskType.value ? theme.surface : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.segmentButtonText,
                    { color: theme.textSecondary },
                    type === taskType.value && { color: theme.surface },
                  ]}
                >
                  {taskType.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Priority</Text>
          <View style={[styles.segmentedControl, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
            {priorities.map((pri) => (
              <TouchableOpacity
                key={pri.value}
                style={[
                  styles.segmentButton,
                  priority === pri.value && { backgroundColor: pri.color },
                ]}
                onPress={() => setPriority(pri.value)}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    { color: theme.textSecondary },
                    priority === pri.value && { color: theme.surface },
                  ]}
                >
                  {pri.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Due Date</Text>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: theme.inputBackground, borderColor: theme.primary }]}
            onPress={() => {
              console.log('Opening date picker...');
              setShowDatePicker(true);
            }}
            activeOpacity={0.7}
          >
            <Icon name="calendar-today" size={20} color={theme.textSecondary} />
            <Text style={[styles.dateButtonText, { color: theme.text }]}>
              {dueDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Due Time (Optional)</Text>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: theme.inputBackground, borderColor: theme.primary }]}
            onPress={() => {
              console.log('Opening time picker...');
              setShowTimePicker(true);
            }}
            activeOpacity={0.7}
          >
            <Icon name="access-time" size={20} color={theme.textSecondary} />
            <Text style={[styles.dateButtonText, { color: theme.text }]}>
              {dueTime ? dueTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Select time'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.switchGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Recurring Task</Text>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: theme.border, true: theme.success + '80' }}
            thumbColor={isRecurring ? theme.success : theme.surface}
          />
        </View>

        {isRecurring && (
          <>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Recurrence Pattern</Text>
              <View style={styles.recurrenceOptions}>
                {recurrenceOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.recurrenceButton,
                      { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
                      recurrencePattern === option.value && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}
                    onPress={() => setRecurrencePattern(option.value)}
                  >
                    <Text
                      style={[
                        styles.recurrenceButtonText,
                        { color: theme.textSecondary },
                        recurrencePattern === option.value && { color: theme.surface },
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
                <Text style={[styles.label, { color: theme.text }]}>Every X Days</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text }]}
                  value={customInterval}
                  onChangeText={setCustomInterval}
                  placeholder="Enter number of days"
                  placeholderTextColor={theme.textLight}
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
  },
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
  saveButton: {
    fontSize: 16,
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
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  segmentButtonText: {
    fontSize: 14,
    marginLeft: 5,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    minHeight: 50,
  },
  dateButtonText: {
    fontSize: 16,
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
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  recurrenceButtonText: {
    fontSize: 14,
  },
});

export default CreateTaskScreen;