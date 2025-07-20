declare module 'react-native-sqlite-storage' {
  export interface Database {
    executeSql(
      statement: string,
      params?: any[],
      successCallback?: (tx: any, results: any) => void,
      errorCallback?: (error: any) => void
    ): Promise<[any]>;
    close(successCallback?: () => void, errorCallback?: (error: any) => void): void;
  }

  export interface SQLitePlugin {
    DEBUG: (debug: boolean) => void;
    enablePromise: (enable: boolean) => void;
    openDatabase(
      config: {
        name: string;
        location?: string;
        createFromLocation?: string;
        readOnly?: boolean;
      },
      successCallback?: (database: Database) => void,
      errorCallback?: (error: any) => void
    ): Database;
  }

  namespace SQLite {
    const DEBUG: (debug: boolean) => void;
    const enablePromise: (enable: boolean) => void;
    const openDatabase: (config: {
      name: string;
      location?: string;
      createFromLocation?: string;
      readOnly?: boolean;
    }) => Database;
    type SQLiteDatabase = Database;
  }

  const SQLite: SQLitePlugin;
  export default SQLite;
}

declare module 'react-native-push-notification' {
  interface PushNotificationConfig {
    onRegister?: (token: { os: string; token: string }) => void;
    onNotification?: (notification: any) => void;
    senderID?: string;
    permissions?: {
      alert?: boolean;
      badge?: boolean;
      sound?: boolean;
    };
    popInitialNotification?: boolean;
    requestPermissions?: boolean;
  }

  interface LocalNotification {
    id?: string;
    channelId?: string;
    title?: string;
    message: string;
    date?: Date;
    repeatType?: 'day' | 'week' | 'month' | 'year' | 'time';
    repeatTime?: number;
    allowWhileIdle?: boolean;
  }

  interface ChannelConfig {
    channelId: string;
    channelName: string;
    channelDescription?: string;
    importance?: number;
    vibrate?: boolean;
  }

  interface PushNotification {
    configure(config: PushNotificationConfig): void;
    createChannel(config: ChannelConfig, callback?: (created: boolean) => void): void;
    localNotificationSchedule(notification: LocalNotification): void;
    localNotification(notification: LocalNotification): void;
    requestPermissions(): Promise<any>;
    checkPermissions(callback: (permissions: any) => void): void;
    cancelAllLocalNotifications(): void;
    cancelLocalNotification(id: string): void;
    getApplicationIconBadgeNumber(callback: (badgeNumber: number) => void): void;
    setApplicationIconBadgeNumber(badgeNumber: number): void;
  }

  const PushNotification: PushNotification;
  export default PushNotification;
}