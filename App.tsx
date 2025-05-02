import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Platform, AppState, AppStateStatus, Alert } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import CreateAlarmScreen from './src/screens/CreateAlarmScreen';
import AlarmRingingScreen from './src/screens/AlarmRingingScreen';
import FindButtonChallengeScreen from './src/screens/FindButtonChallengeScreen';
import QuizChallengeScreen from './src/screens/QuizChallengeScreen';
import TestAlarmScreen from './src/screens/TestAlarmScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import AndroidSettingsScreen from './src/screens/AndroidSettingsScreen';
import QRCodeSetupScreen from './src/screens/QRCodeSetupScreen';
import QRCodeChallengeScreen from './src/screens/QRCodeChallengeScreen';
import { Alarm } from './src/types';
import { initializeApp } from './src/utils/initializeApp';
import { manualCheckForAlarms } from './src/services/alarmService';
import CaptchaChallengeScreen from './src/screens/CaptchaChallengeScreen';

// Configure notifications to make them appear even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// Define the stack navigator param list
export type RootStackParamList = {
  Home: undefined;
  CreateAlarm: undefined;
  AlarmRinging: { alarm: Alarm };
  FindButtonChallenge: { alarm: Alarm };
  QuizChallenge: { alarm: Alarm };
  CaptchaChallenge: { alarm: Alarm };
  QRCodeSetup: { alarmId?: string };
  QRCodeChallenge: { alarm: Alarm };
  TestAlarm: undefined;
  Analytics: undefined;
  AndroidSettings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

declare global {
  var navigation: any;
}

export default function App() {
  
  // Reference to the navigation object for notification handling
  const navigationRef = useRef<any>(null);

  // Keep track of the notification listener
  const notificationListenerRef = useRef<any>(null);

  // Track app state changes to check for alarms when app comes to foreground
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App has come to the foreground!');
      // Check for alarms when app comes to foreground
      setTimeout(() => {
        manualCheckForAlarms();
      }, 1000);
    }

    appState.current = nextAppState;
    setAppStateVisible(appState.current);
  };

  // Handle navigation when a notification is tapped
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    if (!navigationRef.current) return;

    console.log('Notification response received:', response.notification.request.content.data);
    const data = response.notification.request.content.data;

    if (data && data.alarm) {
      const { alarm } = data as { alarm: Alarm };
      navigationRef.current.navigate('AlarmRinging', { alarm });
    }
  };

  // Request notification permissions explicitly
  const requestPermissions = async () => {
    try {
      console.log('Requesting notification permissions...');

      // For Android 13+ we need to request notification permissions differently
      if (Platform.OS === 'android') {
        // Create the notification channel first
        await Notifications.setNotificationChannelAsync('alarms', {
          name: 'Alarm Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
        });
      }

      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('Existing notification permission status:', existingStatus);

      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('New notification permission status:', status);
      }

      if (finalStatus !== 'granted') {
        console.log('Permission not granted!');
        Alert.alert(
          'Permission Required',
          'This app needs notification permissions to function properly as an alarm clock.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // For Android, request additional permissions
      if (Platform.OS === 'android') {
        // Try to request exact alarm permissions if available
        try {
          if (Platform.Version >= 31) { // Android 12+
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(
                'Alarm Permission',
                'For reliable alarms, please enable "Alarms & Reminders" permission in app settings.',
                [{ text: 'OK' }]
              );
            }
          }
        } catch (error) {
          console.log('Error requesting exact alarm permission:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  // Initialize the app
  useEffect(() => {
    // Request permissions immediately on app start
    requestPermissions();

    // Listen for app state changes
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    const initApp = async () => {
      if (navigationRef.current) {
        // Initialize with notification handling
        notificationListenerRef.current = await initializeApp(navigationRef.current);
      }
    };

    initApp();

    // Clean up on unmount
    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
      }
      appStateSubscription.remove();
    };
  }, [navigationRef.current]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          // Store navigation reference globally when ready
          global.navigation = navigationRef.current;
        }}
      >
        <StatusBar style="auto" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#ffffff' }
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="CreateAlarm" component={CreateAlarmScreen} />
          <Stack.Screen name="TestAlarm" component={TestAlarmScreen} />
          <Stack.Screen
            name="AlarmRinging"
            component={AlarmRingingScreen}
            options={{
              gestureEnabled: false,
              cardStyle: { backgroundColor: '#121212' },
              presentation: 'modal', // Valid option instead of 'fullScreenModal'
              headerShown: false,
              cardOverlayEnabled: true,
              // Full screen style through other properties
              animation: 'slide_from_bottom', // Optional if your version supports it
            }}
          />
          <Stack.Screen
            name="FindButtonChallenge"
            component={FindButtonChallengeScreen}
            options={{
              gestureEnabled: false,
              cardStyle: { backgroundColor: '#121212' },
              presentation: 'modal', // Valid option
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="QuizChallenge"
            component={QuizChallengeScreen}
            options={{
              gestureEnabled: false,
              cardStyle: { backgroundColor: '#121212' },
              presentation: 'modal', // Valid option
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="CaptchaChallenge" 
            component={CaptchaChallengeScreen}
            options={{
              gestureEnabled: false,
              cardStyle: { backgroundColor: '#121212' },
              presentation: 'modal', // Make it full screen
            }}
          />
          <Stack.Screen 
            name="QRCodeSetup" 
            component={QRCodeSetupScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="QRCodeChallenge" 
            component={QRCodeChallengeScreen}
            options={{
              gestureEnabled: false,
              cardStyle: { backgroundColor: '#121212' },
              presentation: 'modal',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="Analytics" 
            component={AnalyticsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="AndroidSettings" 
            component={AndroidSettingsScreen}
            options={{
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}