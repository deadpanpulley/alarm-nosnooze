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
  
  // Optional properties for notifications and scheduling
  notificationId?: string;
  
  // Added properties for exact timing
  exactHours?: number;
  exactMinutes?: number;
  scheduledTime?: number;
  lastTriggered?: number;
}