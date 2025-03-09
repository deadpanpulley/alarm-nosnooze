import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  BackHandler,
  Vibration,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import * as Notifications from 'expo-notifications';

type FindButtonChallengeRouteProp = RouteProp<RootStackParamList, 'FindButtonChallenge'>;
type FindButtonChallengeNavigationProp = StackNavigationProp<RootStackParamList, 'FindButtonChallenge'>;

const { width, height } = Dimensions.get('window');

// Medium difficulty settings
const MEDIUM_DIFFICULTY = {
  buttonSize: 40,
  fakeButtons: 5,
};

interface Position {
  top: number;
  left: number;
}

const FindButtonChallengeScreen = () => {
  const route = useRoute<FindButtonChallengeRouteProp>();
  const navigation = useNavigation<FindButtonChallengeNavigationProp>();
  const { alarm } = route.params;
  
  // Sound object for alarm
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Current time displayed
  const [currentTime, setCurrentTime] = useState('');
  
  // Always use medium difficulty
  const difficulty = MEDIUM_DIFFICULTY;
  
  // Button positions
  const [realButtonPosition, setRealButtonPosition] = useState<Position>({ top: 0, left: 0 });
  const [fakeButtonPositions, setFakeButtonPositions] = useState<Position[]>([]);
  
  // If button is found
  const [buttonFound, setButtonFound] = useState(false);

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

  // Generate random position for buttons ensuring they don't go off screen
  const generateRandomPosition = (buttonWidth: number, buttonHeight: number): Position => {
    // Calculate the safe area to ensure buttons are fully visible
    const safeAreaTop = 150; // Keep below the alarm info and instructions
    const safeAreaBottom = height - buttonHeight - 20;
    const safeAreaLeft = 20;
    const safeAreaRight = width - buttonWidth - 20;
    
    // Generate random positions within safe boundaries
    const randomTop = Math.random() * (safeAreaBottom - safeAreaTop) + safeAreaTop;
    const randomLeft = Math.random() * (safeAreaRight - safeAreaLeft) + safeAreaLeft;
    
    return { top: randomTop, left: randomLeft };
  };

  // Generate positions for all buttons
  const generateButtonPositions = () => {
    // Fixed button dimensions
    const buttonWidth = 90;
    const buttonHeight = 40;
    
    // Generate real button position
    const realPosition = generateRandomPosition(buttonWidth, buttonHeight);
    setRealButtonPosition(realPosition);
    
    // Generate fake button positions
    const fakePositions: Position[] = [];
    for (let i = 0; i < difficulty.fakeButtons; i++) {
      fakePositions.push(generateRandomPosition(buttonWidth, buttonHeight));
    }
    setFakeButtonPositions(fakePositions);
  };

  // Handle successful dismiss
  const handleDismiss = () => {
    // Make sure to stop sound completely
    if (sound) {
      sound.stopAsync().then(() => {
        sound.unloadAsync();
      }).catch(error => {
        console.error('Error stopping sound:', error);
      });
    }
    
    // Cancel any ongoing vibrations
    Vibration.cancel();
    
    // Set state to show success message
    setButtonFound(true);
    
    // Important: Cancel the alarm notification that triggered this screen
    if (alarm && alarm.notificationId) {
      Notifications.dismissNotificationAsync(alarm.notificationId)
        .catch(error => console.error('Error dismissing notification:', error));
    }
    
    // Wait a moment to show success message before navigating back
    setTimeout(() => {
      navigation.navigate('Home');
    }, 1000);
  };

  // Handle fake button press - regenerate positions
  const handleFakeButtonPress = () => {
    generateButtonPositions();
    Vibration.vibrate(200);
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
      // Android can use complex patterns (wait, vibrate, wait, vibrate, etc.)
      Vibration.vibrate([500, 1000, 500, 1000], true);
    } else {
      // iOS needs a simpler approach
      const vibrateInterval = setInterval(() => {
        Vibration.vibrate();
      }, 1500);
      
      return () => clearInterval(vibrateInterval);
    }
    
    // Generate initial button positions
    generateButtonPositions();
    
    // Update current time
    const timeInterval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);
    
    // Prevent back button from closing the screen
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    
    // Update initial time
    setCurrentTime(getCurrentTime());
    
    // Cleanup function
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      Vibration.cancel();
      clearInterval(timeInterval);
      backHandler.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Alarm Information */}
      <View style={styles.alarmInfo}>
        <Text style={styles.timeText}>{currentTime}</Text>
        <Text style={styles.alarmLabel}>{alarm?.label || 'Alarm'}</Text>
      </View>
      
      {/* Challenge Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Find and tap the correct snooze button
        </Text>
      </View>
      
      {/* Success Message - only shown when button is found */}
      {buttonFound && (
        <View style={styles.successContainer}>
          <Feather name="check-circle" size={48} color="#2E7D87" />
          <Text style={styles.successText}>Alarm dismissed!</Text>
        </View>
      )}
      
      {/* Buttons Area - only shown if button not found yet */}
      {!buttonFound && (
        <View style={styles.buttonsContainer}>
          {/* Real snooze button */}
          <TouchableOpacity
            style={[
              styles.snoozeButton,
              { 
                top: realButtonPosition.top,
                left: realButtonPosition.left,
              }
            ]}
            onPress={handleDismiss}
          >
            <Text style={styles.snoozeText}>SNOOZE</Text>
          </TouchableOpacity>
          
          {/* Fake buttons */}
          {fakeButtonPositions.map((position, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.snoozeButton,
                { 
                  top: position.top,
                  left: position.left,
                }
              ]}
              onPress={handleFakeButtonPress}
            >
              <Text style={styles.snoozeText}>SNOOZE</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  alarmInfo: {
    alignItems: 'center',
    marginTop: 60,
  },
  timeText: {
    fontSize: 60,
    fontWeight: '300',
    color: '#fff',
  },
  alarmLabel: {
    fontSize: 24,
    color: '#aaa',
    marginTop: 8,
  },
  instructionsContainer: {
    marginTop: 40,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  buttonsContainer: {
    flex: 1,
    position: 'relative',
  },
  snoozeButton: {
    position: 'absolute',
    width: 90,
    height: 40,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  snoozeText: {
    color: '#e0e0e0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    fontSize: 24,
    color: '#fff',
    marginTop: 16,
  },
});

export default FindButtonChallengeScreen;