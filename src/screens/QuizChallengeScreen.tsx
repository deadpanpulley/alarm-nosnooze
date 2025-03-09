import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
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

type QuizChallengeRouteProp = RouteProp<RootStackParamList, 'QuizChallenge'>;
type QuizChallengeNavigationProp = StackNavigationProp<RootStackParamList, 'QuizChallenge'>;

// Define a quiz question interface
interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct answer
}

// Pool of math questions with varying difficulty
const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: 'What is 8 × 7?',
    options: ['54', '56', '49', '63'],
    correctAnswer: 1
  },
  {
    question: 'If x + 8 = 15, what is x?',
    options: ['5', '6', '7', '8'],
    correctAnswer: 2
  },
  {
    question: 'What is 13 × 9?',
    options: ['117', '108', '126', '99'],
    correctAnswer: 0
  },
  {
    question: 'What is 72 ÷ 9?',
    options: ['6', '7', '8', '9'],
    correctAnswer: 2
  },
  {
    question: 'What is 15² - 10?',
    options: ['215', '225', '235', '245'],
    correctAnswer: 0
  },
  {
    question: 'Solve: 3x - 7 = 14',
    options: ['x = 7', 'x = 9', 'x = 8', 'x = 6'],
    correctAnswer: 0
  },
  {
    question: 'What is 17 + 35?',
    options: ['42', '52', '62', '72'],
    correctAnswer: 1
  },
  {
    question: 'What is the square root of 144?',
    options: ['10', '12', '14', '16'],
    correctAnswer: 1
  },
  {
    question: 'What is 99 - 45?',
    options: ['44', '45', '54', '55'],
    correctAnswer: 2
  },
  {
    question: 'What is 6 × 12?',
    options: ['62', '68', '72', '78'],
    correctAnswer: 2
  },
  {
    question: 'What is 4³?',
    options: ['16', '32', '48', '64'],
    correctAnswer: 3
  },
  {
    question: 'What is 28 ÷ 4 + 9?',
    options: ['16', '16.5', '14', '15'],
    correctAnswer: 0
  }
];

const QuizChallengeScreen = () => {
  const route = useRoute<QuizChallengeRouteProp>();
  const navigation = useNavigation<QuizChallengeNavigationProp>();
  const { alarm } = route.params;

  // Sound object for alarm
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Current time displayed
  const [currentTime, setCurrentTime] = useState('');

  // Quiz state
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);

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

  // Get a random question from the pool
  const getRandomQuestion = (): QuizQuestion => {
    const randomIndex = Math.floor(Math.random() * QUIZ_QUESTIONS.length);
    return QUIZ_QUESTIONS[randomIndex];
  };

  // Handle option selection
  // Update the handleOptionSelect function in QuizChallengeScreen.tsx

  // Handle option selection 
  const handleOptionSelect = (optionIndex: number) => {
    if (answered) return;

    setSelectedOption(optionIndex);
    setAnswered(true);

    const isAnswerCorrect = optionIndex === currentQuestion?.correctAnswer;
    setIsCorrect(isAnswerCorrect);

    if (isAnswerCorrect) {
      // Correct answer - completely stop and unload sound
      if (sound) {
        sound.stopAsync().then(() => {
          sound.unloadAsync();
        }).catch(error => {
          console.error('Error stopping sound:', error);
        });
      }

      // Cancel vibration
      Vibration.cancel();

      // Important: Cancel the alarm notification that triggered this screen
      if (alarm && alarm.notificationId) {
        Notifications.dismissNotificationAsync(alarm.notificationId)
          .catch(error => console.error('Error dismissing notification:', error));
      }

      // Wait a moment to show the result before dismissing
      setTimeout(() => {
        navigation.navigate('Home');
      }, 1500);
    } else {
      // Wrong answer - vibrate to indicate error
      Vibration.vibrate(500);

      // Wait a moment and then reset for a new question
      setTimeout(() => {
        setAnswered(false);
        setSelectedOption(null);
        setCurrentQuestion(getRandomQuestion());
      }, 1500);
    }
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

    // Set initial question
    setCurrentQuestion(getRandomQuestion());

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

      {/* Quiz Container */}
      <View style={styles.quizContainer}>
        {/* Quiz Question */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{currentQuestion?.question}</Text>
        </View>

        {/* Quiz Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion?.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedOption === index &&
                (index === currentQuestion.correctAnswer ?
                  styles.correctOption : styles.wrongOption)
              ]}
              onPress={() => handleOptionSelect(index)}
              disabled={answered}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Feedback Message */}
        {answered && (
          <View style={styles.feedbackContainer}>
            <Text style={[
              styles.feedbackText,
              isCorrect ? styles.correctFeedback : styles.wrongFeedback
            ]}>
              {isCorrect ? 'Correct! Alarm dismissed.' : 'Incorrect! Try again...'}
            </Text>
          </View>
        )}
      </View>
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
    marginBottom: 40,
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
  quizContainer: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  questionContainer: {
    marginBottom: 36,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    alignItems: 'center',
  },
  questionText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctOption: {
    backgroundColor: '#2E7D87',
  },
  wrongOption: {
    backgroundColor: '#87392E',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
  },
  feedbackContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  correctFeedback: {
    color: '#4CAF50',
  },
  wrongFeedback: {
    color: '#F44336',
  }
});

export default QuizChallengeScreen;