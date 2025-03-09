import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import HomeScreen from './src/screens/HomeScreen';
import CreateAlarmScreen from './src/screens/CreateAlarmScreen';
import AlarmRingingScreen from './src/screens/AlarmRingingScreen';
import FindButtonChallengeScreen from './src/screens/FindButtonChallengeScreen';
import QuizChallengeScreen from './src/screens/QuizChallengeScreen';
import TestAlarmScreen from './src/screens/TestAlarmScreen';
import { Alarm } from './src/types';
import { initializeApp } from './src/utils/initializeApp';

// Define the stack navigator param list
export type RootStackParamList = {
  Home: undefined;
  CreateAlarm: undefined;
  AlarmRinging: { alarm: Alarm };
  FindButtonChallenge: { alarm: Alarm };
  QuizChallenge: { alarm: Alarm };
  TestAlarm: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  // Reference to the navigation object for notification handling
  const navigationRef = useRef<any>(null);
  
  // Keep track of the notification listener
  const notificationListenerRef = useRef<any>(null);
  
  // Handle navigation when a notification is tapped
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    if (!navigationRef.current) return;
    
    const { alarm } = response.notification.request.content.data as { alarm: Alarm };
    navigationRef.current.navigate('AlarmRinging', { alarm });
  };

  // Initialize the app
  useEffect(() => {
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
    };
  }, [navigationRef.current]);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
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
              cardStyle: { backgroundColor: '#121212' }
            }}
          />
          <Stack.Screen 
            name="FindButtonChallenge" 
            component={FindButtonChallengeScreen}
            options={{
              gestureEnabled: false,
              cardStyle: { backgroundColor: '#121212' }
            }}
          />
          <Stack.Screen 
            name="QuizChallenge" 
            component={QuizChallengeScreen}
            options={{
              gestureEnabled: false,
              cardStyle: { backgroundColor: '#121212' }
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}