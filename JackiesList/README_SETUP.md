# Jackie's List - Setup Instructions

A reminder/todo app for iOS and Android that helps users manage appointments, chores, and tasks with local notifications and progress tracking.

## Features

- Create one-time or recurring tasks (daily, weekly, bi-weekly, monthly, quarterly, annually, or custom intervals)
- Three task types: Appointments, Chores, Tasks
- Priority levels (Low, Medium, High)
- Local push notifications for reminders
- Dashboard with metrics:
  - Today's tasks
  - Completion rate
  - Overdue tasks counter
  - Streak tracking
- Offline-first with SQLite storage

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- For iOS: Mac with Xcode 14+
- For Android: Android Studio with Android SDK

## Installation

1. Install dependencies:
```bash
cd JackiesList
npm install
```

2. iOS Setup (Mac only):
```bash
cd ios
pod install
cd ..
```

3. Android Setup:
Ensure you have Android SDK installed and ANDROID_HOME environment variable set.

## Running the App

### iOS (Mac only)
```bash
npx react-native run-ios
```

Or open `ios/JackiesList.xcworkspace` in Xcode and run from there.

**Note**: If you encounter issues with vector icons on iOS, add this to your Info.plist:
```xml
<key>UIAppFonts</key>
<array>
  <string>MaterialIcons.ttf</string>
</array>
```

### Android
```bash
npx react-native run-android
```

Make sure you have an Android emulator running or a device connected.

## Building for Production

### iOS
1. Open `ios/JackiesList.xcworkspace` in Xcode
2. Select your team in Signing & Capabilities
3. Choose "Any iOS Device" as the target
4. Product → Archive
5. Follow the upload process to App Store Connect

### Android
```bash
cd android
./gradlew assembleRelease
```

The APK will be available at `android/app/build/outputs/apk/release/app-release.apk`

## Troubleshooting

### iOS Issues
- If pod install fails, try:
  ```bash
  cd ios
  pod deintegrate
  pod install
  ```

### Android Issues
- Clear gradle cache:
  ```bash
  cd android
  ./gradlew clean
  ```

### General Issues
- Clear metro cache:
  ```bash
  npx react-native start --reset-cache
  ```

## Project Structure

```
JackiesList/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/        # Screen components
│   ├── services/       # Business logic and data services
│   ├── navigation/     # Navigation configuration
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── ios/                # iOS native code
├── android/            # Android native code
└── App.tsx            # Main app component
```

## Key Technologies

- React Native 0.80.1
- TypeScript
- SQLite for local storage
- React Navigation for routing
- React Native Push Notification for local notifications
- React Native Vector Icons for UI icons

## Notes

- All data is stored locally on the device
- Notifications require user permission
- The app works completely offline