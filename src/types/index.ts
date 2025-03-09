// Define alarm modes
export enum AlarmMode {
  TINY_BUTTON = 'TINY_BUTTON',
  QUIZ = 'QUIZ',
}

// Define alarm interface with expanded properties
export interface Alarm {
  id: string;
  time: string;
  label: string;
  isActive: boolean;
  mode: AlarmMode;
  days: number[];
  sound: string;
  
  // Added properties for better alarm handling
  notificationId?: string;
  scheduledHours?: number;
  scheduledMinutes?: number;
  lastTriggered?: number;
}