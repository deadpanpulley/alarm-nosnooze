import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import {
  requestNotificationPermissions,
  setupNotificationListener,
  scheduleAllActiveAlarms,
  registerBackgroundTask,
  manualCheckForAlarms
} from '../services/alarmService';

/**
 * Initialize app-wide functionality
 */
export const initializeApp = async (navigation: any) => {
  try {
    console.log('Initializing alarm app...');
    
    // Set notification categories/actions for iOS
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('alarm', [
        {
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);
    }
    
    // Request notification permissions first
    const hasPermissions = await requestNotificationPermissions();
    
    if (hasPermissions) {
      console.log('Notification permissions granted');
      
      // Set up notification listener for handling alarm triggers
      const listener = setupNotificationListener(navigation);
      
      // Register background task for checking alarms
      await registerBackgroundTask();
      
      // Schedule all active alarms
      await scheduleAllActiveAlarms();
      
      // Do an immediate check for alarms in case we missed any
      setTimeout(async () => {
        await manualCheckForAlarms();
      }, 5000);
      
      console.log('App initialization complete');
      return listener;
    } else {
      console.warn('Notification permissions denied - app cannot function properly');
    }
  } catch (error) {
    console.error('Error initializing app:', error);
  }
  
  return null;
};