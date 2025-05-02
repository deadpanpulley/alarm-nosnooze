// Alarm mode enum
export enum AlarmMode {
  STANDARD = 'STANDARD',
  TINY_BUTTON = 'TINY_BUTTON',
  QUIZ = 'QUIZ',
  CAPTCHA = 'CAPTCHA',
  QR_CODE = 'QR_CODE'
}

// Alarm interface
export interface Alarm {
  id: string;
  time: string;
  days: number[];
  isActive: boolean;
  label?: string;
  mode: AlarmMode;
  notificationId?: string;
  qrCodeId?: string; // ID of the associated QR code for QR_CODE mode
}

// QR Code interface
export interface QRCode {
  id: string;
  data: string;
  name: string;
  timestamp: number;
}

// Alarm statistics interface
export interface AlarmStatistics {
  [date: string]: {
    alarmsTriggered: number;
    alarmsDismissed: number;
    averageDismissTime: number;
    totalDismissTime: number;
    challengeAttempts: number;
  };
}
