import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alarm, AlarmMode } from '../types';

// Define background task name
const BACKGROUND_ALARM_TASK = 'background-alarm-check';

// Configure notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Setup background task
TaskManager.defineTask(BACKGROUND_ALARM_TASK, async () => {
  try {
    await checkForAlarms();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Error in background task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register background task
export const registerBackgroundTask = async () => {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_ALARM_TASK, {
      minimumInterval: 60, // 1 minute minimum - better for testing
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('Background task registered');
  } catch (err) {
    console.error('Background task registration failed:', err);
  }
};

// Request permissions
export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'android') {
    console.log('Requesting Android permissions...');
    await Notifications.setNotificationChannelAsync('alarms', {
      name: 'Alarm Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get notification permissions!');
      return false;
    }
    
    return true;
  } else {
    console.log('Must use physical device for notifications');
    return false;
  }
};

// Add notification listener to handle alarm triggers
let notificationListener: any = null;

export const setupNotificationListener = (navigation: any) => {
  // Remove any existing listeners
  if (notificationListener) {
    notificationListener.remove();
  }

  // Setup new listener
  notificationListener = Notifications.addNotificationResponseReceivedListener(response => {
    const { alarm } = response.notification.request.content.data as { alarm: Alarm };
    
    // Navigate based on the alarm mode
    if (alarm.mode === AlarmMode.TINY_BUTTON) {
      navigation.navigate('AlarmRinging', { alarm });
    } else if (alarm.mode === AlarmMode.QUIZ) {
      navigation.navigate('AlarmRinging', { alarm });
    }
  });

  return notificationListener;
};

// Check for alarms that should be triggered
const checkForAlarms = async () => {
  try {
    const alarmsJson = await AsyncStorage.getItem('alarms');
    if (!alarmsJson) return;
    
    const alarms: Alarm[] = JSON.parse(alarmsJson);
    const activeAlarms = alarms.filter(alarm => alarm.isActive);
    
    const now = new Date();
    
    for (const alarm of activeAlarms) {
      // Parse the alarm time
      const [time, period] = alarm.time.split(' ');
      const [hoursStr, minutesStr] = time.split(':');
      
      let hours = parseInt(hoursStr);
      const minutes = parseInt(minutesStr);
      
      // Convert to 24-hour format
      if (period === 'PM' && hours < 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      // Check if this alarm should trigger now
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      
      console.log('Current time:', currentHours, currentMinutes);
      // If the time matches (within a 1-minute window)
      if (hours === currentHours && Math.abs(minutes - currentMinutes) <= 1) {
        // Check if it's scheduled for today
        const today = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        
        // If no days are selected (one-time alarm) or today is in the selected days
        if (alarm.days.length === 0 || alarm.days.includes(today)) {
          // Trigger the notification
          await triggerAlarmNotification(alarm);
        }
      }
    }
  } catch (error) {
    console.error('Error checking alarms:', error);
  }
};

// Trigger an immediate notification for the alarm
const triggerAlarmNotification = async (alarm: Alarm) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: alarm.label || 'Alarm',
      body: 'Your alarm is ringing!',
      data: { alarm },
      sound: true,
    },
    trigger: null, // Immediate notification
  });
};

// Schedule an alarm notification
export const scheduleAlarmNotification = async (alarm: Alarm) => {
  // Parse the time string
  const [time, period] = alarm.time.split(' ');
  const [hoursStr, minutesStr] = time.split(':');
  
  let hours = parseInt(hoursStr);
  const minutes = parseInt(minutesStr);
  
  // Convert to 24-hour format
  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  // Create a Date object for the alarm time
  const now = new Date();
  const alarmDate = new Date();
  alarmDate.setHours(hours);
  alarmDate.setMinutes(minutes);
  alarmDate.setSeconds(0);
  
  // If the alarm time is in the past, schedule it for tomorrow
  if (alarmDate <= now) {
    alarmDate.setDate(alarmDate.getDate() + 1);
  }
  
  // Check if this is a recurring alarm
  if (alarm.days && alarm.days.length > 0) {
    // For recurring alarms, schedule only if the day is in the days array
    const today = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    if (!alarm.days.includes(today)) {
      // Find the next day to schedule
      let nextDayIndex = -1;
      for (let i = 1; i <= 7; i++) {
        const nextDay = (today + i) % 7;
        if (alarm.days.includes(nextDay)) {
          nextDayIndex = i;
          break;
        }
      }
      
      if (nextDayIndex > 0) {
        alarmDate.setDate(alarmDate.getDate() + nextDayIndex);
      }
    }
  }
  
  // Cancel any existing notification for this alarm
  if (alarm.notificationId) {
    await Notifications.cancelScheduledNotificationAsync(alarm.notificationId);
  }
  
  // Schedule the notification
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: alarm.label || 'Alarm',
      body: 'Your alarm is ringing!',
      data: { alarm },
      sound: true,
    },
    trigger: {
      date: alarmDate,
      repeats: false, // We'll handle repeating manually
    },
  });
  
  // Save the notification ID with the alarm
  const updatedAlarm = {
    ...alarm,
    notificationId,
  };
  
  // Update the alarm in storage
  await updateAlarmInStorage(updatedAlarm);
  
  return updatedAlarm;
};

// Cancel an alarm notification
export const cancelAlarmNotification = async (alarm: Alarm) => {
  if (alarm.notificationId) {
    await Notifications.cancelScheduledNotificationAsync(alarm.notificationId);
    
    // Update the alarm in storage without notification ID
    const updatedAlarm = {
      ...alarm,
      notificationId: undefined,
    };
    
    await updateAlarmInStorage(updatedAlarm);
  }
};

// Update an alarm in storage
const updateAlarmInStorage = async (updatedAlarm: Alarm) => {
  try {
    // Get all alarms
    const alarmsJson = await AsyncStorage.getItem('alarms');
    const alarms = alarmsJson ? JSON.parse(alarmsJson) : [];
    
    // Find and update the specific alarm
    const updatedAlarms = alarms.map((alarm: Alarm) => 
      alarm.id === updatedAlarm.id ? updatedAlarm : alarm
    );
    
    // Save back to storage
    await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
  } catch (error) {
    console.error('Error updating alarm in storage:', error);
  }
};

// Schedule all active alarms (to be called on app startup)
export const scheduleAllActiveAlarms = async () => {
  try {
    // Get all alarms
    const alarmsJson = await AsyncStorage.getItem('alarms');
    const alarms = alarmsJson ? JSON.parse(alarmsJson) : [];
    
    // Schedule only active alarms
    const activeAlarms = alarms.filter((alarm: Alarm) => alarm.isActive);
    
    for (const alarm of activeAlarms) {
      await scheduleAlarmNotification(alarm);
    }
  } catch (error) {
    console.error('Error scheduling active alarms:', error);
  }
};