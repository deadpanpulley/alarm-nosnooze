import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alarm, AlarmMode } from '../types';
import Constants from 'expo-constants';

// Define background task names
const BACKGROUND_ALARM_TASK = 'background-alarm-check';
const ALARM_NOTIFICATION_CHANNEL = 'alarms';

// Configure notifications behavior - make it high priority
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
    // This is critical - makes notification show as a full-screen intent
    shouldPresentAlert: true,
    // These make the notification more intrusive
    presentationOptions: ['alert', 'sound'],
  }),
});

// Setup background task with more frequent checks
TaskManager.defineTask(BACKGROUND_ALARM_TASK, async () => {
  try {
    const result = await checkForAlarms();
    if (result) {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Error in background task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register background task with more frequent checks
export const registerBackgroundTask = async () => {
  try {
    // First check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_ALARM_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_ALARM_TASK, {
        minimumInterval: 15, // 15 seconds for testing, can increase later
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('Background task registered');
    } else {
      console.log('Background task already registered');
    }
  } catch (err) {
    console.error('Background task registration failed:', err);
  }
};

// Request more aggressive permissions for Android alarms
export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'android') {
    console.log('Setting up Android alarm channel...');
    
    // Create a high-priority alarm channel
    await Notifications.setNotificationChannelAsync(ALARM_NOTIFICATION_CHANNEL, {
      name: 'Alarm Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250, 250, 250],
      lightColor: '#FF231F7C',
      // Make sure sound is enabled
      sound: 'default',
      enableVibrate: true,
      // These make the notification wake the device screen
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true, // Important for alarms to bypass do not disturb
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        android: {
          // Request precise alarm permission
          allowAnnouncements: true,
        }
      });
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

  // Setup listener for notifications received in foreground
  Notifications.addNotificationReceivedListener(notification => {
    const data = notification.request.content.data;
    if (data && data.isAlarm) {
      console.log('Alarm notification received in foreground!');
      // Force navigation to alarm screen for foreground notifications too
      const { alarm } = data as { alarm: Alarm };
      navigation.navigate('AlarmRinging', { alarm });
    }
  });

  // Setup new listener for notification interaction
  notificationListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response received:', response.notification.request.content.data);
    const data = response.notification.request.content.data;
    if (data && data.isAlarm) {
      const { alarm } = data as { alarm: Alarm };
      // Always navigate to the AlarmRinging screen first
      navigation.navigate('AlarmRinging', { alarm });
    }
  });

  return notificationListener;
};

// Check for alarms that should be triggered - improved version
const checkForAlarms = async (): Promise<boolean> => {
  try {
    const alarmsJson = await AsyncStorage.getItem('alarms');
    if (!alarmsJson) return false;
    
    const alarms: Alarm[] = JSON.parse(alarmsJson);
    const activeAlarms = alarms.filter(alarm => alarm.isActive);
    
    const now = new Date();
    let alarmTriggered = false;
    
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
      
      console.log(`Checking alarm ${alarm.label} set for ${hours}:${minutes} against current time ${currentHours}:${currentMinutes}`);
      
      // If the time matches (within a 1-minute window)
      if (hours === currentHours && Math.abs(minutes - currentMinutes) <= 1) {
        // Check if it's scheduled for today
        const today = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        
        // If no days are selected (one-time alarm) or today is in the selected days
        if (alarm.days.length === 0 || alarm.days.includes(today)) {
          console.log(`Triggering alarm: ${alarm.label}`);
          // Trigger the notification
          await triggerAlarmNotification(alarm);
          alarmTriggered = true;
          
          // For one-time alarms, deactivate after triggering
          if (alarm.days.length === 0) {
            await deactivateOneTimeAlarm(alarm);
          }
        }
      }
    }
    
    return alarmTriggered;
  } catch (error) {
    console.error('Error checking alarms:', error);
    return false;
  }
};

// Deactivate a one-time alarm after it has fired
const deactivateOneTimeAlarm = async (alarm: Alarm) => {
  try {
    const alarmsJson = await AsyncStorage.getItem('alarms');
    if (!alarmsJson) return;
    
    const alarms: Alarm[] = JSON.parse(alarmsJson);
    
    const updatedAlarms = alarms.map(a => {
      if (a.id === alarm.id && a.days.length === 0) {
        return { ...a, isActive: false };
      }
      return a;
    });
    
    await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
    console.log(`One-time alarm ${alarm.label} deactivated after firing`);
  } catch (error) {
    console.error('Error deactivating one-time alarm:', error);
  }
};

// Trigger an immediate notification for the alarm - make it full screen intent
const triggerAlarmNotification = async (alarm: Alarm) => {
  // For Android, we need to create a full screen intent notification
  const notificationContent = {
    title: alarm.label || 'Alarm',
    body: 'Wake up! Your alarm is ringing!', // More descriptive
    data: { 
      alarm,
      isAlarm: true, // Flag to identify this as an alarm notification
      fullScreen: true, // Flag for full screen intent
    },
    // Critical for Android
    sound: true,
    priority: 'max',
    vibrate: [0, 250, 250, 250, 250, 250],
    sticky: true, // Make notification persistent
  };

  // Use a specific notification channel for alarms
  if (Platform.OS === 'android') {
    // @ts-ignore - Add android-specific properties
    notificationContent.channelId = ALARM_NOTIFICATION_CHANNEL;
    // @ts-ignore
    notificationContent.android = {
      priority: 'max',
      // This makes it show as a full-screen activity
      presentAsFullScreenIntent: true,
      // Critical - makes it show even when app is in background
      showWhen: true,
      // Make it not dismissible by swipe
      ongoing: true,
      // Custom sound and vibration
      vibrationPattern: [0, 250, 250, 250, 250, 250],
      color: '#FF231F7C',
    };
  }

  // Schedule the notification immediately
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: notificationContent,
    trigger: null, // Immediate notification
  });
  
  console.log(`Alarm notification triggered with ID: ${notificationId}`);
  return notificationId;
};

// Schedule all pending alarms every 15 minutes
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
  
  // Instead of scheduling a specific notification time, we'll
  // simply store the alarm information and rely on the background
  // task to check and trigger it at the appropriate time
  
  // Update the alarm in storage
  const updatedAlarm = {
    ...alarm,
    scheduledHours: hours,
    scheduledMinutes: minutes,
  };
  
  // Update the alarm in storage
  await updateAlarmInStorage(updatedAlarm);
  
  console.log(`Alarm "${alarm.label}" scheduled for ${hours}:${minutes} ${period}`);
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

// Schedule all active alarms
export const scheduleAllActiveAlarms = async () => {
  try {
    // Get all alarms
    const alarmsJson = await AsyncStorage.getItem('alarms');
    const alarms = alarmsJson ? JSON.parse(alarmsJson) : [];
    
    // Schedule only active alarms
    const activeAlarms = alarms.filter((alarm: Alarm) => alarm.isActive);
    
    console.log(`Scheduling ${activeAlarms.length} active alarms`);
    
    for (const alarm of activeAlarms) {
      await scheduleAlarmNotification(alarm);
    }
  } catch (error) {
    console.error('Error scheduling active alarms:', error);
  }
};

// Manual check for alarms - can be called from the UI for testing
export const manualCheckForAlarms = async () => {
  console.log('Manual check for alarms...');
  return await checkForAlarms();
};

// Add this function to alarmService.ts

/**
 * Triggers an immediate full-screen alarm notification for testing
 * @param alarm The alarm object to trigger
 */
export const triggerImmediateAlarm = async (alarm: Alarm) => {
  console.log('Triggering immediate full-screen alarm for testing');
  
  // Prepare notification content for full-screen alarm
  const notificationContent = {
    title: alarm.label || 'Alarm',
    body: 'Wake up! Your alarm is ringing!',
    data: { 
      alarm,
      isAlarm: true,
      fullScreen: true,
      isTest: true, // Flag to indicate this is a test
    },
    sound: true,
    priority: 'max',
    vibrate: [0, 250, 250, 250, 250, 250],
    sticky: true,
  };

  // Add Android specific properties
  if (Platform.OS === 'android') {
    // @ts-ignore - Add android-specific properties
    notificationContent.channelId = ALARM_NOTIFICATION_CHANNEL;
    // @ts-ignore
    notificationContent.android = {
      priority: 'max',
      // This is critical - makes it show as a full-screen activity
      presentAsFullScreenIntent: true,
      // Critical - makes it show even when app is in background
      showWhen: true,
      // Make it not dismissible by swipe
      ongoing: true,
      // Custom sound and vibration
      vibrationPattern: [0, 250, 250, 250, 250, 250],
      color: '#FF231F7C',
    };
  }

  try {
    // First ensure the notification channel exists
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ALARM_NOTIFICATION_CHANNEL, {
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
    
    // Schedule the notification immediately
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // Immediate notification
    });
    
    console.log(`Test alarm notification triggered with ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('Error triggering test alarm:', error);
    return null;
  }
};