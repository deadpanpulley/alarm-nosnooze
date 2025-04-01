# Alarmy ⏰

A fun alarm app - where you need to find the right button to snooze. This alarm clock helps heavy sleepers like me wake up by requiring completion of brain-engaging math challenges before the alarm can be dismissed.

## Features

- Two wake-up challenges:
  - **Find Button Challenge**: Locate and tap the correct snooze button among several decoys
  - **Quiz Challenge**: Solve a math problem to dismiss the alarm
- Set alarms for one-time or recurring schedules
- Custom alarm labels

## Demo Video

> If you prefer a youtube demo - [check it out here](https://youtube.com/shorts/lOMVoYt6W-4)

![Alarmy Demo Video](./assets/alarmy-demo.gif)

## Technologies

- React Native / Expo
- TypeScript
- React Navigation
- AsyncStorage for persistence
- Expo Notifications for alarms

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

## Building the app for Android:
```bash
expo build:android   
```

## Known Issue 🚨

**Android Background Process Limitation**:  
The app currently has issues with alarm triggering when it's completely removed from recent apps/background. This is due to Android's aggressive battery optimization and background process limitations. 

I'm working on implementing the following fixes:

- Using Foreground Service to maintain reliability
- Requesting battery optimization exemption
- Properly implementing exact alarm permissions for Android 12+
- Enhancing the background task scheduling system

## Testing Alarms

You can access a hidden test screen by triple-tapping the header on the home screen, which allows you to:

- Test both challenge types without waiting for an alarm to trigger
- Force check for pending alarms
- Test with custom alarm times

## Permissions Required

- Notification permissions
- Alarm scheduling permissions
- Background task execution
- Wake lock (to wake device screen)

## Built with ❤️ by

[Pankaj Tanwar](https://twitter.com/the2ndfloorguy), and checkout his [other side-hustles](https://pankajtanwar.in/side-hustles)

## Contributing

I welcome contributions to the `alarmy` project! Whether it's a bug fix, a feature request, or improving documentation, your contributions are appreciated.

> Thanks to my friend, [Soren](https://x.com/soren_iverson/status/1832057675129163870) for the inspiration.