import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Vibration,
  Platform,
  Animated,
  Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { AlarmMode } from '../types';

type AlarmRingingRouteProp = RouteProp<RootStackParamList, 'AlarmRinging'>;
type AlarmRingingNavigationProp = StackNavigationProp<RootStackParamList, 'AlarmRinging'>;

const AlarmRingingScreen = () => {
  const route = useRoute<AlarmRingingRouteProp>();
  const navigation = useNavigation<AlarmRingingNavigationProp>();
  const { alarm } = route.params;
  
  // Sound object for alarm
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Animation values
  const pulseAnim = new Animated.Value(1);
  const slideAnim = new Animated.Value(0);
  
  // Format current time
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };
  
  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  // Start the challenge
  const startChallenge = () => {
    // Stop sound and vibration temporarily
    if (sound) {
      sound.pauseAsync();
    }
    Vibration.cancel();
    
    // Navigate to the appropriate challenge screen
    if (alarm.mode === AlarmMode.TINY_BUTTON) {
      navigation.navigate('FindButtonChallenge', { alarm });
    } else if (alarm.mode === AlarmMode.QUIZ) {
      navigation.navigate('QuizChallenge', { alarm });
    }
  };

  // Snooze the alarm
  const snoozeAlarm = () => {
    if (sound) {
      sound.stopAsync();
    }
    Vibration.cancel();
    
    // In a real app, you would reschedule the alarm for X minutes later
    // For now, we'll just navigate back
    navigation.navigate('Home');
  };

  // Run animations
  const runAnimations = () => {
    // Pulsing animation for clock
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
    
    // Sliding animation for buttons
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 500,
      delay: 200,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease)
    }).start();
  };

  // Load and play alarm sound
  const playAlarmSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/alarm-sound.mp3'),
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      setSound(sound);
    } catch (error) {
      console.error('Error playing alarm sound:', error);
    }
  };

  // Initialize alarm on component mount
  useEffect(() => {
    // Setup audio
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    });
    
    // Play sound
    playAlarmSound();
    
    // Start vibration pattern
    if (Platform.OS === 'android') {
      Vibration.vibrate([500, 1000, 500, 1000], true);
    } else {
      const vibrateInterval = setInterval(() => {
        Vibration.vibrate();
      }, 1500);
      
      return () => clearInterval(vibrateInterval);
    }
    
    // Run animations
    runAnimations();
    
    // Update current time
    const timeInterval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);
    
    // Cleanup function
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      Vibration.cancel();
      clearInterval(timeInterval);
    };
  }, []);

  // Get the challenge name based on mode
  const getChallengeName = () => {
    switch (alarm?.mode) {
      case AlarmMode.TINY_BUTTON:
        return 'Find Button';
      case AlarmMode.QUIZ:
        return 'Solve Quiz';
      default:
        return 'Challenge';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Clock display */}
      <Animated.View 
        style={[
          styles.clockContainer, 
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <Text style={styles.timeText}>{currentTime}</Text>
        <Text style={styles.alarmLabel}>{alarm?.label || 'Alarm'}</Text>
      </Animated.View>
      
      {/* Alarm icon */}
      <View style={styles.iconContainer}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <Feather name="bell" size={100} color="#fff" />
        </Animated.View>
      </View>
      
      {/* Action buttons */}
      <Animated.View 
        style={[
          styles.buttonsContainer,
          { transform: [{ translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          })}],
          opacity: slideAnim }
        ]}
      >
        <TouchableOpacity 
          style={styles.button} 
          onPress={snoozeAlarm}
        >
          <Text style={styles.buttonText}>Snooze</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={startChallenge}
        >
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            {getChallengeName()}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  clockContainer: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 70,
    fontWeight: '200',
    color: '#fff',
    letterSpacing: -1,
  },
  alarmLabel: {
    fontSize: 24,
    color: '#aaa',
    marginTop: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 120,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2E7D87',
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  primaryButtonText: {
    color: '#fff',
  }
});

export default AlarmRingingScreen;