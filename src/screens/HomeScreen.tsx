import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  TouchableOpacity, 
  Switch, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { scheduleAlarmNotification, cancelAlarmNotification } from '../services/alarmService';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

// Format days to display
const formatDays = (days: number[]) => {
  if (days.length === 7) return 'Every day';
  if (days.length === 0) return 'Once';
  
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (days.length === 5 && days.every(day => day >= 1 && day <= 5)) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  
  return days.map(day => dayLabels[day]).join(', ');
};

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [alarms, setAlarms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load alarms from storage
  const loadAlarms = async () => {
    try {
      setIsLoading(true);
      const alarmsJson = await AsyncStorage.getItem('alarms');
      if (alarmsJson) {
        setAlarms(JSON.parse(alarmsJson));
      }
    } catch (error) {
      console.error('Error loading alarms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle alarm active state
  const toggleAlarm = async (id: string) => {
    try {
      const alarm = alarms.find(a => a.id === id);
      if (!alarm) return;
      
      const newActiveState = !alarm.isActive;
      
      // Update alarm in state
      const updatedAlarms = alarms.map(a => 
        a.id === id 
          ? { ...a, isActive: newActiveState } 
          : a
      );
      
      setAlarms(updatedAlarms);
      await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
      
      // Schedule or cancel alarm notification
      const updatedAlarm = updatedAlarms.find(a => a.id === id);
      if (updatedAlarm) {
        if (newActiveState) {
          // Alarm was turned on
          await scheduleAlarmNotification(updatedAlarm);
        } else {
          // Alarm was turned off
          await cancelAlarmNotification(updatedAlarm);
        }
      }
    } catch (error) {
      console.error('Error toggling alarm:', error);
      Alert.alert('Error', 'Failed to update alarm. Please try again.');
    }
  };

  // Delete alarm with confirmation
  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete Alarm",
      "Are you sure you want to delete this alarm?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: () => deleteAlarm(id),
          style: "destructive"
        }
      ]
    );
  };

  // Delete alarm
  const deleteAlarm = async (id: string) => {
    try {
      // Get the alarm before removing it
      const alarmToDelete = alarms.find(alarm => alarm.id === id);
      
      // Remove from state and storage
      const updatedAlarms = alarms.filter(alarm => alarm.id !== id);
      setAlarms(updatedAlarms);
      await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
      
      // Cancel any scheduled notifications
      if (alarmToDelete && alarmToDelete.isActive) {
        await cancelAlarmNotification(alarmToDelete);
      }
    } catch (error) {
      console.error('Error deleting alarm:', error);
      Alert.alert('Error', 'Failed to delete alarm. Please try again.');
    }
  };

  // Get mode name
  const getModeName = (mode: string) => {
    if (mode === 'TINY_BUTTON') return 'Find Button';
    if (mode === 'QUIZ') return 'Solve Quiz';
    return mode;
  };

  // Navigate to test screen (triple tap on header)
  const [tapCount, setTapCount] = useState(0);
  const handleHeaderTap = () => {
    setTapCount(prevCount => {
      const newCount = prevCount + 1;
      
      if (newCount === 3) {
        navigation.navigate('TestAlarm');
        return 0;
      }
      
      // Reset tap count after 1 second
      setTimeout(() => setTapCount(0), 1000);
      
      return newCount;
    });
  };

  // Load alarms when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadAlarms();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleHeaderTap}>
          <Text style={styles.headerTitle}>my alarms</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <Feather name="settings" size={20} color="#333" />
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D87" />
        </View>
      ) : alarms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="clock" size={64} color="#E0E0E0" />
          <Text style={styles.emptyText}>No alarms set</Text>
          <Text style={styles.emptySubtext}>Tap the + button to add an alarm</Text>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.alarmCard}>
              <View style={styles.alarmMainInfo}>
                <View>
                  <Text style={styles.alarmTime}>{item.time}</Text>
                  <Text style={styles.alarmLabel}>{item.label}</Text>
                </View>
                
                <View style={styles.rightControls}>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => confirmDelete(item.id)}
                  >
                    <Feather name="trash-2" size={18} color="#333" />
                  </TouchableOpacity>
                  
                  <Switch
                    value={item.isActive}
                    onValueChange={() => toggleAlarm(item.id)}
                    trackColor={{ false: '#eee', true: '#2E7D87' }}
                    thumbColor="#fff"
                    ios_backgroundColor="#eee"
                  />
                </View>
              </View>
              
              <View style={styles.alarmDetails}>
                <View style={styles.daysContainer}>
                  <Text style={styles.daysText}>{formatDays(item.days)}</Text>
                </View>
                
                {item.isActive && (
                  <View style={styles.modeContainer}>
                    <Feather 
                      name={item.mode === 'TINY_BUTTON' ? 'target' : 'help-circle'} 
                      size={14} 
                      color="#333" 
                    />
                    <Text style={styles.modeText}>{getModeName(item.mode)}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('CreateAlarm')}
      >
        <Feather name="plus" size={22} color="#333" />
      </TouchableOpacity>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textTransform: 'lowercase',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#777',
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  alarmCard: {
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  alarmMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alarmTime: {
    fontSize: 22,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  alarmLabel: {
    fontSize: 14,
    color: '#777',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmDetails: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  daysContainer: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  daysText: {
    fontSize: 12,
    color: '#555',
  },
  modeContainer: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeText: {
    fontSize: 12,
    color: '#555',
    marginLeft: 4,
  },
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default HomeScreen;