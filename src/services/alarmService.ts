import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alarm, AlarmMode } from '../types';
import Constants from 'expo-constants';
import { 
  isWeb, 
  requestWebNotificationPermissions, 
  showWebNotification, 
  triggerWebAlarm, 
  scheduleWebAlarm,
  webAlarmTimeouts,
  cancelWebAlarm
} from './webCompatibility';

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
    console.log('Background task running - checking for alarms');
    const result = await checkForAlarms();
    return result 
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Error in background alarm task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register background task with more frequent checks
export const registerBackgroundTask = async () => {
  try {
    // Unregister any existing task first to avoid duplicates
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_ALARM_TASK);
    if (isRegistered) {
      await TaskManager.unregisterTaskAsync(BACKGROUND_ALARM_TASK);
    }
    
    // Register a new task with more frequent checks
    await BackgroundFetch.registerTaskAsync(BACKGROUND_ALARM_TASK, {
      minimumInterval: 60, // One minute in seconds (minimum allowed)
      stopOnTerminate: false, // Continue running when app is terminated
      startOnBoot: true, // Start the task when device is restarted
    });
    
    console.log('Background alarm task registered successfully');
    return true;
  } catch (err) {
    console.error('Background task registration failed:', err);
    return false;
  }
};

// Request more aggressive permissions for Android alarms
export const requestNotificationPermissions = async () => {
  // For web platform, use web notifications API
  if (isWeb) {
    return await requestWebNotificationPermissions();
  }

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
// For web, we'll store active audio elements
let webAudioElement: HTMLAudioElement | null = null;

export const setupNotificationListener = (navigation: any) => {
  // For web platform, we don't use the same notification system
  if (isWeb) {
    console.log('Setting up web notification listener');
    // Return a dummy object with remove method for API compatibility
    return {
      remove: () => console.log('Web notification listener removed')
    };
  }

  // Remove any existing listeners
  if (notificationListener) {
    notificationListener.remove();
  }

  // Setup listener for notifications received in foreground
  Notifications.addNotificationReceivedListener(notification => {
    const data = notification.request.content.data;
    if (data && data.isAlarm) {
      console.log('Alarm notification received in foreground!');
      // Navigate directly to the challenge screen based on alarm mode
      const { alarm } = data as { alarm: Alarm };
      
      if (alarm.mode === AlarmMode.TINY_BUTTON) {
        navigation.navigate('FindButtonChallenge', { alarm });
      } else if (alarm.mode === AlarmMode.QUIZ) {
        navigation.navigate('QuizChallenge', { alarm });
      } else if (alarm.mode === 'QR_CODE' as AlarmMode) {
        navigation.navigate('QRCodeChallenge', { alarm });
      } else {
        // Fallback to AlarmRinging screen if mode is unknown
        navigation.navigate('AlarmRinging', { alarm });
      }
    }
  });

  // Setup new listener for notification interaction
  notificationListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response received:', response.notification.request.content.data);
    const data = response.notification.request.content.data;
    if (data && data.isAlarm) {
      const { alarm } = data as { alarm: Alarm };
      
      // Navigate directly to the challenge screen based on alarm mode
      if (alarm.mode === AlarmMode.TINY_BUTTON) {
        navigation.navigate('FindButtonChallenge', { alarm });
      } else if (alarm.mode === AlarmMode.QUIZ) {
        navigation.navigate('QuizChallenge', { alarm });
      } else if (alarm.mode === 'QR_CODE' as AlarmMode) {
        navigation.navigate('QRCodeChallenge', { alarm });
      } else {
        // Fallback to AlarmRinging screen if mode is unknown
        navigation.navigate('AlarmRinging', { alarm });
      }
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
      
      // Check if this alarm should trigger now - EXACT MATCH
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      
      console.log(`Checking alarm ${alarm.label} set for ${hours}:${minutes} against current time ${currentHours}:${currentMinutes}`);
      
      // If the time matches exactly (no ±1 minute window)
      if (hours === currentHours && minutes === currentMinutes) {
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
export const triggerAlarmNotification = async (alarm: Alarm) => {
  // For web platform, use web notifications and audio
  if (isWeb) {
    console.log('Triggering web alarm notification');
    
    // Show a web notification
    showWebNotification('Alarm', {
      body: alarm.label || 'Time to wake up!',
      icon: '/assets/icon.png',
      requireInteraction: true
    });
    
    // Play alarm sound
    webAudioElement = triggerWebAlarm(alarm);
    
    // If we have global navigation, navigate to the alarm screen
    if (global.navigation) {
      if (alarm.mode === AlarmMode.TINY_BUTTON) {
        global.navigation.navigate('FindButtonChallenge', { alarm });
      } else if (alarm.mode === AlarmMode.QUIZ) {
        global.navigation.navigate('QuizChallenge', { alarm });
      } else if (alarm.mode === 'QR_CODE' as AlarmMode) {
        global.navigation.navigate('QRCodeChallenge', { alarm });
      } else {
        global.navigation.navigate('AlarmRinging', { alarm });
      }
    }
    
    return true;
  }

  try {
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
  } catch (error) {
    console.error('Error triggering alarm notification:', error);
    return null;
  }
};

// Triggers an immediate alarm (for testing)
export const triggerImmediateAlarm = async (alarm: Alarm) => {
  console.log('Triggering immediate alarm for testing:', alarm.label);
  
  try {
    // For tests, directly navigate to the challenge screen instead of showing a notification
    if (global.navigation) {
      // Go directly to the challenge screen based on the alarm mode
      if (alarm.mode === AlarmMode.TINY_BUTTON) {
        global.navigation.navigate('FindButtonChallenge', { alarm });
      } else if (alarm.mode === AlarmMode.QUIZ) {
        global.navigation.navigate('QuizChallenge', { alarm });
      } else if (alarm.mode === 'QR_CODE' as AlarmMode) {
        global.navigation.navigate('QRCodeChallenge', { alarm });
      } else {
        global.navigation.navigate('AlarmRinging', { alarm });
      }
      return 'direct-navigation';
    }
    
    // Fallback to notification if global navigation isn't available
    const notificationId = await triggerAlarmNotification(alarm);
    return notificationId;
  } catch (error) {
    console.error('Error triggering test alarm:', error);
    return null;
  }
};

// Schedule all pending alarms with exact timing
export const scheduleAlarmNotification = async (alarm: Alarm) => {
  // For web platform, use setTimeout instead of notifications
  if (isWeb) {
    console.log(`Scheduling web alarm: ${alarm.label} (${alarm.id})`);
    
    // Cancel any existing timeout for this alarm
    cancelWebAlarm(alarm.id);
    
    // Schedule new timeout
    const timeoutId = scheduleWebAlarm(alarm, (scheduledAlarm) => {
      triggerAlarmNotification(scheduledAlarm);
    });
    
    // Store the timeout ID
    webAlarmTimeouts[alarm.id] = timeoutId;
    
    return true;
  }

  try {
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
    
    // Create a Date object for the next occurrence of this alarm
    const now = new Date();
    const alarmDate = new Date();
    alarmDate.setHours(hours);
    alarmDate.setMinutes(minutes);
    alarmDate.setSeconds(0);
    alarmDate.setMilliseconds(0);
    
    // If the alarm time is in the past, schedule it for tomorrow
    if (alarmDate <= now) {
      alarmDate.setDate(alarmDate.getDate() + 1);
    }
    
    // For recurring alarms, find the next occurrence
    if (alarm.days && alarm.days.length > 0) {
      const currentDay = now.getDay(); // 0-6, where 0 is Sunday
      
      // If today is not in the selected days or the time has passed
      if (!alarm.days.includes(currentDay) || alarmDate <= now) {
        // Find the next day that matches the pattern
        let nextDayOffset = -1;
        for (let i = 1; i <= 7; i++) {
          const nextDay = (currentDay + i) % 7;
          if (alarm.days.includes(nextDay)) {
            nextDayOffset = i;
            break;
          }
        }
        
        if (nextDayOffset > 0) {
          // Set to the next matching day
          alarmDate.setDate(now.getDate() + nextDayOffset);
        }
      }
    }
    
    console.log(`Scheduling alarm for ${alarmDate.toLocaleString()}`);
    
    // Cancel any existing notification for this alarm
    if (alarm.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(alarm.notificationId);
    }
    
    // Store exact timing information for the background task
    const updatedAlarm = {
      ...alarm,
      exactHours: hours,
      exactMinutes: minutes,
      scheduledTime: alarmDate.getTime(),
    };
    
    // Update the alarm in storage
    await updateAlarmInStorage(updatedAlarm);
    
    console.log(`Alarm "${alarm.label}" scheduled for ${hours}:${minutes} ${period} on date ${alarmDate.toLocaleDateString()}`);
    return updatedAlarm;
  } catch (error) {
    console.error('Error scheduling alarm:', error);
    return alarm;
  }
};

// Cancel an alarm notification
export const cancelAlarmNotification = async (alarm: Alarm) => {
  // For web platform, clear the timeout
  if (isWeb) {
    return cancelWebAlarm(alarm.id);
  }

  try {
    if (alarm.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(alarm.notificationId);
      
      // Update the alarm in storage without notification ID
      const updatedAlarm = {
        ...alarm,
        notificationId: undefined,
      };
      
      await updateAlarmInStorage(updatedAlarm);
    }
  } catch (error) {
    console.error('Error canceling alarm notification:', error);
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