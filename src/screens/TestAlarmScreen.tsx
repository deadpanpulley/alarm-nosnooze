import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { AlarmMode } from '../types';

type TestAlarmScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

// This screen is for testing purposes only
// It allows you to trigger the alarm challenges without waiting for an actual alarm

const TestAlarmScreen = () => {
  const navigation = useNavigation<TestAlarmScreenNavigationProp>();
  
  // Test Find Button challenge
  const testFindButtonChallenge = () => {
    const testAlarm = {
      id: 'test-alarm-1',
      time: '7:30 AM',
      label: 'Find Button Test',
      isActive: true,
      mode: AlarmMode.TINY_BUTTON,
      days: [],
      sound: 'default'
    };
    
    navigation.navigate('FindButtonChallenge', { alarm: testAlarm });
  };
  
  // Test Quiz challenge
  const testQuizChallenge = () => {
    const testAlarm = {
      id: 'test-alarm-2',
      time: '8:45 AM',
      label: 'Quiz Challenge Test',
      isActive: true,
      mode: AlarmMode.QUIZ,
      days: [],
      sound: 'default'
    };
    
    navigation.navigate('QuizChallenge', { alarm: testAlarm });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Test Challenges</Text>
      <Text style={styles.subtitle}>Select a challenge mode to test</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={testFindButtonChallenge}
        >
          <Text style={styles.buttonText}>Test Find Button Challenge</Text>
          <Text style={styles.buttonDescription}>Find the real snooze button among the fakes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={testQuizChallenge}
        >
          <Text style={styles.buttonText}>Test Quiz Challenge</Text>
          <Text style={styles.buttonDescription}>Solve a math problem to dismiss</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    marginBottom: 30,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#777',
  },
  backButton: {
    marginTop: 40,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2E7D87',
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  }
});

export default TestAlarmScreen;