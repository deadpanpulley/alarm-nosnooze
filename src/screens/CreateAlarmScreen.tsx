import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Platform,
  TextInput,
  Alert
} from 'react-native';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlarmMode } from '../types';
import { scheduleAlarmNotification } from '../services/alarmService';

type CreateAlarmScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateAlarm'>;

// Days of the week selection
const DAYS = [
  { id: 0, short: 'S', long: 'Sun' },
  { id: 1, short: 'M', long: 'Mon' },
  { id: 2, short: 'T', long: 'Tue' },
  { id: 3, short: 'W', long: 'Wed' },
  { id: 4, short: 'T', long: 'Thu' },
  { id: 5, short: 'F', long: 'Fri' },
  { id: 6, short: 'S', long: 'Sat' },
];

// Available challenge modes
const CHALLENGE_MODES = [
  { 
    id: AlarmMode.TINY_BUTTON, 
    label: 'Find Button', 
    description: 'Find and press the correct snooze button',
    icon: 'target'
  },
  { 
    id: AlarmMode.QUIZ, 
    label: 'Solve Quiz', 
    description: 'Answer a math question correctly to dismiss',
    icon: 'help-circle'
  },
  {
    id: AlarmMode.CAPTCHA,
    label: 'Solve Captcha',
    description: 'Type the characters you see to dismiss',
    icon: 'shield'
  },
  {
    id: 'QR_CODE' as AlarmMode,
    label: 'Scan QR Code',
    description: 'Scan a specific QR code to dismiss the alarm',
    icon: 'grid',
    requiresSetup: true
  }
];

const CreateAlarmScreen = () => {
  const navigation = useNavigation<CreateAlarmScreenNavigationProp>();
  
  // State for the new alarm
  const [date, setDate] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [label, setLabel] = useState('Alarm');
  const [isActive, setIsActive] = useState(true);
  const [selectedMode, setSelectedMode] = useState<AlarmMode>(AlarmMode.TINY_BUTTON);
  
  // For iOS date picker modal
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');

  // Format time for display
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return {
      hours: formattedHours.toString(),
      minutes: formattedMinutes.toString(),
      ampm
    };
  };

  const { hours, minutes, ampm } = formatTime(date);

  // Toggle day selection
  const toggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter(id => id !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  // Handle time change
  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  // Save the alarm
  const saveAlarm = async () => {
    try {
      // Format time for display
      const timeString = `${hours}:${minutes} ${ampm}`;
      
      // Create alarm object
      const newAlarm = {
        id: Date.now().toString(),
        time: timeString,
        label,
        isActive,
        mode: selectedMode,
        days: selectedDays,
        sound: 'default'
      };
      
      // For QR code mode, navigate to QR code setup first
      if (selectedMode === 'QR_CODE' as AlarmMode) {
        navigation.navigate('QRCodeSetup', { alarmId: newAlarm.id });
        
        // Save the alarm without activating it yet
        const existingAlarmsJson = await AsyncStorage.getItem('alarms');
        const existingAlarms = existingAlarmsJson ? JSON.parse(existingAlarmsJson) : [];
        const updatedAlarms = [...existingAlarms, newAlarm];
        await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
        
        return;
      }
      
      // Get existing alarms
      const existingAlarmsJson = await AsyncStorage.getItem('alarms');
      const existingAlarms = existingAlarmsJson ? JSON.parse(existingAlarmsJson) : [];
      
      // Add new alarm and save
      const updatedAlarms = [...existingAlarms, newAlarm];
      await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
      
      // Schedule the alarm notification if it's active
      if (isActive) {
        try {
          await scheduleAlarmNotification(newAlarm);
          Alert.alert(
            "Alarm Set",
            `Your alarm has been set for ${timeString}${selectedDays.length > 0 ? ' on selected days' : ''}.`,
            [{ text: "OK" }]
          );
        } catch (error) {
          console.error('Error scheduling alarm:', error);
          Alert.alert(
            "Warning",
            "Alarm saved but there was an issue scheduling the notification. The app must be running in the background for alarms to work properly.",
            [{ text: "OK" }]
          );
        }
      }
      
      // Navigate back to home screen
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error saving alarm:', error);
      Alert.alert(
        "Error",
        "There was a problem saving your alarm. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Feather name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>new alarm</Text>
        <TouchableOpacity onPress={saveAlarm} style={styles.headerButton}>
          <Feather name="check" size={20} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Time Picker */}
        <View style={styles.timePickerContainer}>
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>{hours}</Text>
            <Text style={styles.timeColon}>:</Text>
            <Text style={styles.timeText}>{minutes}</Text>
            <Text style={styles.ampmText}>{ampm}</Text>
          </View>
          
          {Platform.OS === 'android' && (
            <TouchableOpacity 
              style={styles.editTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.editTimeText}>Change</Text>
            </TouchableOpacity>
          )}
          
          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              style={styles.timePicker}
            />
          )}
        </View>
        
        {/* Label Input */}
        <View style={styles.inputSection}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={label}
              onChangeText={setLabel}
              placeholder="Label"
              placeholderTextColor="#999"
            />
          </View>
        </View>
        
        {/* Days Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>repeat on</Text>
          <View style={styles.daysContainer}>
            {DAYS.map(day => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day.id) && styles.selectedDayButton
                ]}
                onPress={() => toggleDay(day.id)}
              >
                <Text 
                  style={[
                    styles.dayText,
                    selectedDays.includes(day.id) && styles.selectedDayText
                  ]}
                >
                  {day.short}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Challenge Mode Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>challenge mode</Text>
          <View style={styles.challengeContainer}>
            {CHALLENGE_MODES.map(mode => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.challengeOption,
                  selectedMode === mode.id && styles.selectedChallengeOption
                ]}
                onPress={() => setSelectedMode(mode.id)}
              >
                <Feather 
                  name={mode.icon as any} 
                  size={20} 
                  color="#333" 
                  style={styles.challengeIcon} 
                />
                <View style={styles.challengeTextContainer}>
                  <Text style={styles.challengeTitle}>{mode.label}</Text>
                  <Text style={styles.challengeDescription}>{mode.description}</Text>
                  {mode.requiresSetup && (
                    <Text style={styles.setupRequired}>Requires setup</Text>
                  )}
                </View>
                <View style={[
                  styles.radioCircle,
                  selectedMode === mode.id && styles.radioCircleSelected
                ]}>
                  {selectedMode === mode.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Active Toggle */}
        <View style={styles.inputSection}>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>Active</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#eee', true: '#2E7D87' }}
              thumbColor="#fff"
              ios_backgroundColor="#eee"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textTransform: 'lowercase',
  },
  scrollView: {
    flex: 1,
  },
  timePickerContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeText: {
    fontSize: 64,
    fontWeight: '300',
    color: '#333',
    width: 70,
    textAlign: 'center',
  },
  timeColon: {
    fontSize: 64,
    fontWeight: '300',
    color: '#333',
    marginHorizontal: 4,
  },
  ampmText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#555',
    marginLeft: 8,
  },
  editTimeButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  editTimeText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  timePicker: {
    width: Platform.OS === 'ios' ? '100%' : 'auto',
    height: Platform.OS === 'ios' ? 180 : 'auto',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 12,
    textTransform: 'lowercase',
  },
  inputRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 8,
  },
  textInput: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDayButton: {
    backgroundColor: '#2E7D87',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  selectedDayText: {
    color: '#fff',
  },
  challengeContainer: {
    gap: 8,
  },
  challengeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
  },
  selectedChallengeOption: {
    backgroundColor: '#f3f8f9',
  },
  challengeIcon: {
    marginRight: 12,
  },
  challengeTextContainer: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  challengeDescription: {
    fontSize: 12,
    color: '#666',
  },
  setupRequired: {
    fontSize: 10,
    color: '#2E7D87',
    fontStyle: 'italic',
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#2E7D87',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2E7D87',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleText: {
    fontSize: 16,
    color: '#333',
  },
});

export default CreateAlarmScreen;