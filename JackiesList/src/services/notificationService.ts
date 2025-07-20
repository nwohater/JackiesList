import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import { Task } from '../types';
import { formatTime, isToday, isTomorrow } from '../utils/date';
import taskService from './taskService';

class NotificationService {
  constructor() {
    this.configure();
  }

  private configure() {
    PushNotification.configure({
      onRegister: function (token: { os: string; token: string }) {
        console.log('TOKEN:', token);
      },

      onNotification: function (notification: any) {
        console.log('NOTIFICATION:', notification);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: true,
    });

    PushNotification.createChannel(
      {
        channelId: 'jackies-list-channel',
        channelName: "Jackie's List Notifications",
        channelDescription: 'Notifications for tasks and reminders',
        importance: 4, // HIGH importance
        vibrate: true,
      },
      (created: boolean) => console.log(`createChannel returned '${created}'`)
    );
  }

  scheduleTaskNotification(task: Task) {
    if (!task.dueTime) return;

    const [hours, minutes] = task.dueTime.split(':');
    const notificationDate = new Date(task.dueDate);
    notificationDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));

    const notificationTime = notificationDate.getTime() - 15 * 60 * 1000;

    PushNotification.localNotificationSchedule({
      id: task.id,
      channelId: 'jackies-list-channel',
      title: `Upcoming ${task.type}: ${task.title}`,
      message: task.description || `Due at ${formatTime(task.dueTime)}`,
      date: new Date(notificationTime),
      allowWhileIdle: true,
      repeatType: task.isRecurring ? 'time' : undefined,
      repeatTime: task.isRecurring ? this.getRepeatTime(task) : undefined,
    });
  }

  private getRepeatTime(task: Task): number | undefined {
    if (!task.recurrencePattern) return undefined;

    const dayInMs = 24 * 60 * 60 * 1000;
    
    switch (task.recurrencePattern) {
      case 'daily':
        return dayInMs;
      case 'weekly':
        return 7 * dayInMs;
      case 'biweekly':
        return 14 * dayInMs;
      case 'monthly':
        return 30 * dayInMs;
      case 'quarterly':
        return 90 * dayInMs;
      case 'annually':
        return 365 * dayInMs;
      case 'custom':
        return task.recurrenceInterval ? task.recurrenceInterval * dayInMs : undefined;
      default:
        return undefined;
    }
  }

  cancelTaskNotification(taskId: string) {
    PushNotification.cancelLocalNotification(taskId);
  }

  async scheduleMorningNotification() {
    const todayTasks = await taskService.getTodayTasks();
    const taskCount = todayTasks.length;

    if (taskCount > 0) {
      const now = new Date();
      const morning = new Date();
      morning.setHours(8, 0, 0, 0);

      if (morning < now) {
        morning.setDate(morning.getDate() + 1);
      }

      PushNotification.localNotificationSchedule({
        channelId: 'jackies-list-channel',
        title: 'Good morning!',
        message: `You have ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} scheduled for today`,
        date: morning,
        repeatType: 'day',
        allowWhileIdle: true,
      });
    }
  }

  async scheduleEveningNotification() {
    const tomorrowTasks = await taskService.getUpcomingTasks(2).then(tasks => 
      tasks.filter(task => isTomorrow(task.dueDate))
    );
    const taskCount = tomorrowTasks.length;

    if (taskCount > 0) {
      const now = new Date();
      const evening = new Date();
      evening.setHours(20, 0, 0, 0);

      if (evening < now) {
        evening.setDate(evening.getDate() + 1);
      }

      PushNotification.localNotificationSchedule({
        channelId: 'jackies-list-channel',
        title: 'Tomorrow\'s tasks',
        message: `You have ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} scheduled for tomorrow`,
        date: evening,
        repeatType: 'day',
        allowWhileIdle: true,
      });
    }
  }

  async checkOverdueTasks() {
    const overdueTasks = await taskService.getOverdueTasks();
    
    if (overdueTasks.length > 0) {
      PushNotification.localNotification({
        channelId: 'jackies-list-channel',
        title: 'Overdue tasks',
        message: `You have ${overdueTasks.length} overdue ${overdueTasks.length === 1 ? 'task' : 'tasks'}`,
      });
    }
  }

  requestPermissions() {
    PushNotification.requestPermissions();
  }

}

export default new NotificationService();