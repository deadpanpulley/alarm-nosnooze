import { Platform } from 'react-native';
import { Alarm } from '../types';

/**
 * Web compatibility layer for alarm functionality
 * Provides mock implementations for native features not available on web
 */

// Add type declarations for web-specific APIs
declare global {
  interface Window {
    setTimeout: (callback: Function, timeout: number) => number;
    clearTimeout: (id: number) => void;
    Notification?: {
      requestPermission: () => Promise<string>;
      permission: string;
      new (title: string, options: any): any;
    };
    Audio?: {
      new (src: string): HTMLAudioElement;
    };
  }
}

// Check if running on web platform
export const isWeb = Platform.OS === 'web';

// Helper to safely check for window object
const hasWindow = (): boolean => {
  return typeof global !== 'undefined' && !!(global as any).window;
};

// Safe reference to window object
const getWindow = (): Window | undefined => {
  if (hasWindow()) {
    return (global as any).window;
  }
  return undefined;
};

// Mock notification permissions for web
export const requestWebNotificationPermissions = async (): Promise<boolean> => {
  if (!isWeb) return false;
  
  const win = getWindow();
  // Web notifications API check
  if (win && win.Notification) {
    const permission = await win.Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Mock notification for web
export const showWebNotification = (title: string, options: any) => {
  if (!isWeb) return null;
  
  const win = getWindow();
  if (win && win.Notification && win.Notification.permission === 'granted') {
    return new win.Notification(title, options);
  }
  
  return null;
};

// Web alarm trigger function (uses browser audio API)
export const triggerWebAlarm = (alarm: Alarm) => {
  if (!isWeb) return null;
  
  const win = getWindow();
  if (!win || !win.Audio) return null;
  
  // Create audio element for alarm sound
  const audio = new win.Audio('/assets/alarm.mp3');
  audio.loop = true;
  
  // Play the alarm sound
  const playPromise = audio.play();
  
  if (playPromise !== undefined) {
    playPromise.catch((error: Error) => {
      console.error('Web audio playback failed:', error);
    });
  }
  
  // Return audio element so it can be stopped later
  return audio;
};

// Web alarm scheduler (uses setTimeout instead of native notifications)
export const scheduleWebAlarm = (alarm: Alarm, callback: (alarm: Alarm) => void): number => {
  if (!isWeb) return -1;
  
  const win = getWindow();
  if (!win) return -1;
  
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
  
  // Calculate time until alarm
  const now = new Date();
  const alarmTime = new Date();
  alarmTime.setHours(hours, minutes, 0, 0);
  
  // If alarm time is in the past, schedule for tomorrow
  if (alarmTime <= now) {
    alarmTime.setDate(alarmTime.getDate() + 1);
  }
  
  // Check if alarm should run on this day
  if (alarm.days.length > 0) {
    const dayOfWeek = alarmTime.getDay();
    if (!alarm.days.includes(dayOfWeek)) {
      // Find the next valid day
      let daysToAdd = 1;
      let nextDay = (dayOfWeek + daysToAdd) % 7;
      
      while (!alarm.days.includes(nextDay) && daysToAdd < 7) {
        daysToAdd++;
        nextDay = (dayOfWeek + daysToAdd) % 7;
      }
      
      alarmTime.setDate(alarmTime.getDate() + daysToAdd);
    }
  }
  
  const timeUntilAlarm = alarmTime.getTime() - now.getTime();
  
  // Schedule the alarm using setTimeout
  return win.setTimeout(() => {
    callback(alarm);
  }, timeUntilAlarm);
};

// Store for web alarm timeouts
export const webAlarmTimeouts: Record<string, number> = {};

// Cancel a web alarm
export const cancelWebAlarm = (alarmId: string): boolean => {
  if (!isWeb) return false;
  
  const win = getWindow();
  if (!win) return false;
  
  if (webAlarmTimeouts[alarmId]) {
    win.clearTimeout(webAlarmTimeouts[alarmId]);
    delete webAlarmTimeouts[alarmId];
    return true;
  }
  
  return false;
};
