// Define the alarm challenge modes
export enum AlarmMode {
  TINY_BUTTON = 'TINY_BUTTON',
  QUIZ = 'QUIZ',
}

// Alarm interface
export interface Alarm {
  id: string;
  time: string;
  label: string;
  isActive: boolean;
  mode: AlarmMode;
  days: number[]; // 0-6 representing Sunday-Saturday
  sound: string;
  notificationId?: string; // ID for scheduled notification
}