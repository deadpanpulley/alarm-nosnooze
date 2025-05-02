import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { 
  isAndroid, 
  isAndroid12OrHigher, 
  getDeviceSpecificRecommendations,
  deviceSupportsReliableAlarms
} from '../utils/androidSpecific';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AndroidSettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AndroidSettings'>;

const AndroidSettingsScreen = () => {
  const navigation = useNavigation<AndroidSettingsScreenNavigationProp>();
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [deviceInfo, setDeviceInfo] = useState({
    manufacturer: '',
    model: '',
    osVersion: '',
    isReliable: false
  });
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      // Get device information
      const manufacturer = Device.manufacturer || 'Unknown';
      const model = Device.modelName || 'Unknown';
      const osVersion = `Android ${Platform.Version}`;
      const isReliable = await deviceSupportsReliableAlarms();
      
      setDeviceInfo({
        manufacturer,
        model,
        osVersion,
        isReliable
      });
      
      // Get device-specific recommendations
      const deviceRecommendations = await getDeviceSpecificRecommendations();
      setRecommendations(deviceRecommendations);
      
      // Check if debug mode was previously enabled
      const debugMode = await AsyncStorage.getItem('debugMode');
      setShowDebugInfo(debugMode === 'true');
    };
    
    loadData();
  }, []);

  const handleHeaderTap = () => {
    setTapCount(prevCount => {
      const newCount = prevCount + 1;
      
      if (newCount === 5) {
        // Toggle debug mode after 5 taps
        const newDebugState = !showDebugInfo;
        setShowDebugInfo(newDebugState);
        AsyncStorage.setItem('debugMode', newDebugState.toString());
        Alert.alert(
          'Debug Mode',
          newDebugState ? 'Debug mode enabled' : 'Debug mode disabled'
        );
        return 0;
      }
      
      // Reset tap count after 2 seconds
      setTimeout(() => setTapCount(0), 2000);
      
      return newCount;
    });
  };

  const openBatterySettings = () => {
    if (Platform.OS === 'android') {
      Linking.openSettings();
    }
  };

  if (!isAndroid) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="#2E7D87" />
          </TouchableOpacity>
          <Text style={styles.title}>Android Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.notAndroidContainer}>
          <Feather name="smartphone" size={64} color="#E0E0E0" />
          <Text style={styles.notAndroidText}>
            This screen is only available on Android devices
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#2E7D87" />
        </TouchableOpacity>
        <Text style={styles.title} onPress={handleHeaderTap}>Android Settings</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.deviceInfoCard}>
          <Text style={styles.deviceInfoTitle}>Device Information</Text>
          <View style={styles.deviceInfoRow}>
            <Text style={styles.deviceInfoLabel}>Manufacturer:</Text>
            <Text style={styles.deviceInfoValue}>{deviceInfo.manufacturer}</Text>
          </View>
          <View style={styles.deviceInfoRow}>
            <Text style={styles.deviceInfoLabel}>Model:</Text>
            <Text style={styles.deviceInfoValue}>{deviceInfo.model}</Text>
          </View>
          <View style={styles.deviceInfoRow}>
            <Text style={styles.deviceInfoLabel}>OS Version:</Text>
            <Text style={styles.deviceInfoValue}>{deviceInfo.osVersion}</Text>
          </View>
          <View style={styles.deviceInfoRow}>
            <Text style={styles.deviceInfoLabel}>Alarm Reliability:</Text>
            <Text style={[
              styles.deviceInfoValue,
              { color: deviceInfo.isReliable ? '#4CAF50' : '#F44336' }
            ]}>
              {deviceInfo.isReliable ? 'Good' : 'May need optimization'}
            </Text>
          </View>
        </View>
        
        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>
            Recommended Settings for Reliable Alarms
          </Text>
          <Text style={styles.recommendationsSubtitle}>
            Some Android devices have aggressive battery optimization that can prevent alarms from working properly.
            Follow these recommendations to ensure your alarms work reliably:
          </Text>
          
          {recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <View style={styles.recommendationBullet}>
                <Text style={styles.bulletText}>{index + 1}</Text>
              </View>
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </View>
          ))}
          
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={openBatterySettings}
          >
            <Feather name="settings" size={18} color="#fff" />
            <Text style={styles.settingsButtonText}>Open Battery Settings</Text>
          </TouchableOpacity>
        </View>
        
        {isAndroid12OrHigher() && (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>
              Android 12+ Permission
            </Text>
            <Text style={styles.permissionText}>
              On Android 12 and higher, you need to grant the "Alarms & Reminders" permission
              for reliable alarm functionality.
            </Text>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={openBatterySettings}
            >
              <Feather name="bell" size={18} color="#fff" />
              <Text style={styles.settingsButtonText}>Open App Permissions</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {showDebugInfo && (
          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>Debug Information</Text>
            <Text style={styles.debugText}>
              This information is for troubleshooting purposes only.
            </Text>
            
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>API Level:</Text>
              <Text style={styles.debugValue}>{Platform.Version}</Text>
            </View>
            
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Device Type:</Text>
              <Text style={styles.debugValue}>
                {Device.isDevice ? 'Physical Device' : 'Emulator'}
              </Text>
            </View>
            
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Device ID:</Text>
              <Text style={styles.debugValue}>{Device.deviceName || 'Unknown'}</Text>
            </View>
            
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Debug Mode:</Text>
              <Switch
                value={showDebugInfo}
                onValueChange={(value) => {
                  setShowDebugInfo(value);
                  AsyncStorage.setItem('debugMode', value.toString());
                }}
                trackColor={{ false: '#eee', true: '#2E7D87' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fd',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  deviceInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  deviceInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  deviceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deviceInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  deviceInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  recommendationsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  recommendationsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  recommendationBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2E7D87',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  bulletText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  settingsButton: {
    backgroundColor: '#2E7D87',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  permissionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  debugCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#F57C00',
  },
  debugText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  debugLabel: {
    fontSize: 14,
    color: '#666',
  },
  debugValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  notAndroidContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notAndroidText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default AndroidSettingsScreen;
