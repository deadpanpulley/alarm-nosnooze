import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermissions,
  setupNotificationListener,
  scheduleAllActiveAlarms,
  registerBackgroundTask
} from '../services/alarmService';

/**
 * Initialize app-wide functionality
 */
export const initializeApp = async (navigation: any) => {
  try {
    // Request notification permissions
    const hasPermissions = await requestNotificationPermissions();
    
    if (hasPermissions) {
      // Set up notification listener
      const listener = setupNotificationListener(navigation);
      
      // Register background task
      await registerBackgroundTask();
      
      // Schedule all active alarms
      await scheduleAllActiveAlarms();
      
      // Set a callback for background received notifications
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      
      return listener;
    }
  } catch (error) {
    console.error('Error initializing app:', error);
  }
  
  return null;
};