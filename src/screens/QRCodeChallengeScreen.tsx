import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Vibration,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { BarCodeScanner } from 'expo-barcode-scanner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Alarm } from '../types';

type QRCodeChallengeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'QRCodeChallenge'>;
type QRCodeChallengeScreenRouteProp = RouteProp<RootStackParamList, 'QRCodeChallenge'>;

const { width } = Dimensions.get('window');

const QRCodeChallengeScreen = () => {
  const navigation = useNavigation<QRCodeChallengeScreenNavigationProp>();
  const route = useRoute<QRCodeChallengeScreenRouteProp>();
  const { alarm } = route.params;
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [targetQRData, setTargetQRData] = useState('');
  const [targetQRName, setTargetQRName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [attempts, setAttempts] = useState(0);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  // Start pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);
  
  // Start shake animation on wrong scan
  const startShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Load the target QR code data and play alarm sound
  useEffect(() => {
    const loadQRCodeData = async () => {
      try {
        if (alarm && alarm.qrCodeId) {
          const qrCodeJson = await AsyncStorage.getItem(`qrcode_${alarm.qrCodeId}`);
          if (qrCodeJson) {
            const qrCode = JSON.parse(qrCodeJson);
            setTargetQRData(qrCode.data);
            setTargetQRName(qrCode.name || 'Saved QR Code');
          } else {
            // QR code not found - this shouldn't happen
            Alert.alert(
              'Error',
              'The QR code for this alarm could not be found. Please dismiss the alarm manually.',
              [
                {
                  text: 'Dismiss Alarm',
                  onPress: () => navigation.navigate('Home'),
                },
              ]
            );
          }
        }
      } catch (error) {
        console.error('Error loading QR code data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const playAlarmSound = async () => {
      try {
        // Load the sound
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/alarm.mp3'),
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        setSound(sound);
        
        // Start vibration pattern
        const PATTERN = [500, 1000, 500, 1000];
        Vibration.vibrate(PATTERN, true);
      } catch (error) {
        console.error('Error playing alarm sound:', error);
      }
    };
    
    // Request camera permissions
    const requestCameraPermission = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    
    loadQRCodeData();
    playAlarmSound();
    requestCameraPermission();
    
    // Cleanup function
    return () => {
      if (sound) {
        sound.stopAsync();
        sound.unloadAsync();
      }
      Vibration.cancel();
    };
  }, [alarm]);

  // Handle barcode scanning
  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    // Check if the scanned QR code matches the target
    if (data === targetQRData) {
      setScanned(true);
      
      // Stop alarm sound and vibration
      if (sound) {
        sound.stopAsync();
      }
      Vibration.cancel();
      
      // Update alarm statistics
      updateAlarmStatistics();
      
      // Show success message and navigate back to home
      Alert.alert(
        'Alarm Dismissed',
        'You successfully completed the QR code challenge!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } else {
      // Wrong QR code scanned
      setAttempts(prev => prev + 1);
      startShake();
      
      // Vibrate to indicate wrong scan
      Vibration.vibrate(200);
      
      // Show error message for wrong QR code
      Alert.alert(
        'Wrong QR Code',
        'This is not the correct QR code. Please scan the QR code you set up for this alarm.',
        [{ text: 'Try Again' }]
      );
    }
  };

  // Update alarm statistics
  const updateAlarmStatistics = async () => {
    try {
      // Get current date string (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];
      
      // Get existing statistics
      const statsJson = await AsyncStorage.getItem('alarmStatistics');
      let stats = statsJson ? JSON.parse(statsJson) : {};
      
      // Initialize today's stats if not exist
      if (!stats[today]) {
        stats[today] = {
          alarmsTriggered: 0,
          alarmsDismissed: 0,
          averageDismissTime: 0,
          totalDismissTime: 0,
          challengeAttempts: 0,
        };
      }
      
      // Update statistics
      stats[today].alarmsDismissed += 1;
      stats[today].challengeAttempts += attempts;
      
      // Save updated statistics
      await AsyncStorage.setItem('alarmStatistics', JSON.stringify(stats));
    } catch (error) {
      console.error('Error updating alarm statistics:', error);
    }
  };

  // Show different UI based on permission status
  if (loading || hasPermission === null) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#121212' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading QR code challenge...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (hasPermission === false) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#121212' }]}>
        <View style={styles.header}>
          <Text style={styles.alarmTitle}>Alarm!</Text>
        </View>
        
        <View style={styles.permissionContainer}>
          <Feather name="camera-off" size={64} color="#e0e0e0" />
          <Text style={styles.permissionText}>
            Camera permission is required to complete the QR code challenge.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={async () => {
              const { status } = await BarCodeScanner.requestPermissionsAsync();
              setHasPermission(status === 'granted');
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.permissionButton, { backgroundColor: '#F44336', marginTop: 12 }]}
            onPress={() => {
              // Stop alarm sound and vibration
              if (sound) {
                sound.stopAsync();
              }
              Vibration.cancel();
              navigation.navigate('Home');
            }}
          >
            <Text style={styles.permissionButtonText}>Dismiss Alarm</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#121212' }]}>
      <View style={styles.header}>
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <Text style={styles.alarmTitle}>Scan Your QR Code!</Text>
        </Animated.View>
      </View>
      
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{alarm.time}</Text>
        <Text style={styles.alarmLabel}>{alarm.label}</Text>
      </View>
      
      <View style={styles.scannerContainer}>
        {!scanned && (
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        
        {!scanned && (
          <View style={styles.overlay}>
            <View style={styles.unfilled} />
            <View style={styles.row}>
              <View style={styles.unfilled} />
              <Animated.View 
                style={[
                  styles.scanner,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              />
              <View style={styles.unfilled} />
            </View>
            <View style={styles.unfilled} />
          </View>
        )}
      </View>
      
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          Scan the QR code you set up for this alarm to dismiss it.
        </Text>
        <Text style={styles.qrNameText}>
          Looking for: {targetQRName}
        </Text>
        
        {attempts > 0 && (
          <Text style={styles.attemptsText}>
            Wrong attempts: {attempts}
          </Text>
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
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  alarmTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  alarmLabel: {
    fontSize: 18,
    color: '#cccccc',
    marginTop: 8,
  },
  scannerContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  unfilled: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    height: 250,
  },
  scanner: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#2E7D87',
    backgroundColor: 'transparent',
  },
  instructionContainer: {
    padding: 20,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  qrNameText: {
    fontSize: 14,
    color: '#2E7D87',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  attemptsText: {
    fontSize: 14,
    color: '#F44336',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#2E7D87',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default QRCodeChallengeScreen;
