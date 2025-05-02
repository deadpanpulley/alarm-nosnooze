// Define alarm modes
export enum AlarmMode {
  STANDARD = 'STANDARD',
  TINY_BUTTON = 'TINY_BUTTON',
  QUIZ = 'QUIZ',
  CAPTCHA = 'CAPTCHA',
  QR_CODE = 'QR_CODE'
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
  qrCodeId?: string; // ID of the associated QR code for QR_CODE mode
  
  // Added properties for exact timing
  exactHours?: number;
  exactMinutes?: number;
  scheduledTime?: number;
  lastTriggered?: number;
}