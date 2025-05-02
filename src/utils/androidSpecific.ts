import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

/**
 * Android-specific utilities to improve alarm functionality
 */

// Check if running on Android
export const isAndroid = Platform.OS === 'android';

// Get Android API level
export const getAndroidApiLevel = (): number => {
  if (!isAndroid) return 0;
  return Platform.Version as number;
};

// Check if device is running Android 12 or higher (API level 31+)
export const isAndroid12OrHigher = (): boolean => {
  return isAndroid && getAndroidApiLevel() >= 31;
};

// Request exact alarm permission for Android 12+
export const requestExactAlarmPermission = async (): Promise<boolean> => {
  if (!isAndroid || !isAndroid12OrHigher()) return true;
  
  try {
    // For Android 12+, we need to request SCHEDULE_EXACT_ALARM permission
    // This is handled through the notification permissions in Expo
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync({
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
          allowDisplayInForeground: true,
        }
      });
      return newStatus === 'granted';
    }
    return true;
  } catch (error) {
    console.error('Error requesting exact alarm permission:', error);
    return false;
  }
};

// Configure high-priority notification channel for alarms
export const setupAlarmNotificationChannel = async (): Promise<void> => {
  if (!isAndroid) return;
  
  try {
    await Notifications.setNotificationChannelAsync('alarms', {
      name: 'Alarm Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true, // Important for alarms to bypass do not disturb
    });
    
    console.log('Android alarm notification channel configured');
  } catch (error) {
    console.error('Error setting up Android notification channel:', error);
  }
};

// Configure full-screen intent for alarm notifications (wakes device screen)
export const getFullScreenIntentOptions = () => {
  if (!isAndroid) return {};
  
  return {
    priority: 'max',
    sticky: true,
    android: {
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
    }
  };
};

// Check if device supports reliable alarms
export const deviceSupportsReliableAlarms = async (): Promise<boolean> => {
  // Check if this is a physical device (not an emulator)
  const isPhysicalDevice = await Device.isDevice;
  
  // Check manufacturer - some brands like Xiaomi, Huawei, etc. have aggressive battery optimizations
  const manufacturer = Device.manufacturer?.toLowerCase() || '';
  const unreliableManufacturers = ['xiaomi', 'huawei', 'oppo', 'vivo', 'oneplus'];
  
  const hasUnreliableManufacturer = unreliableManufacturers.some(m => manufacturer.includes(m));
  
  return isPhysicalDevice && !hasUnreliableManufacturer;
};

// Get device-specific recommendations for reliable alarms
export const getDeviceSpecificRecommendations = async (): Promise<string[]> => {
  if (!isAndroid) return [];
  
  const recommendations: string[] = [];
  const manufacturer = Device.manufacturer?.toLowerCase() || '';
  
  // General recommendation for all Android devices
  recommendations.push('Disable battery optimization for this app in system settings');
  
  // Manufacturer-specific recommendations
  if (manufacturer.includes('xiaomi')) {
    recommendations.push('Enable "Autostart" for this app in security settings');
    recommendations.push('Set "No restrictions" in battery saver settings');
  } else if (manufacturer.includes('huawei')) {
    recommendations.push('Add this app to "Protected apps" list');
    recommendations.push('Disable "Power saving" mode for this app');
  } else if (manufacturer.includes('samsung')) {
    recommendations.push('Disable "Sleeping apps" for this app');
    recommendations.push('Add this app to "Unmonitored apps" in battery settings');
  } else if (manufacturer.includes('oppo')) {
    recommendations.push('Enable "Auto-start" for this app');
    recommendations.push('Add this app to "Allow background activity"');
  }
  
  // Android 12+ specific recommendations
  if (isAndroid12OrHigher()) {
    recommendations.push('Grant "Alarms & Reminders" permission in app settings');
  }
  
  return recommendations;
};
