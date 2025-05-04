import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { CameraView, Camera, BarcodeScanningResult } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

type QRCodeSetupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'QRCodeSetup'>;
type QRCodeSetupScreenRouteProp = RouteProp<RootStackParamList, 'QRCodeSetup'>;

const QRCodeSetupScreen = () => {
  const navigation = useNavigation<QRCodeSetupScreenNavigationProp>();
  const route = useRoute<QRCodeSetupScreenRouteProp>();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [qrName, setQrName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Request camera permissions
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Handle barcode scanning
  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    const { data } = result;
    setScanned(true);
    setQrValue(data);
    
    // Generate a simple name for the QR code based on the first few characters
    const simpleName = data.substring(0, 10) + (data.length > 10 ? '...' : '');
    setQrName(simpleName);
    
    // Show success message
    Alert.alert(
      'QR Code Scanned',
      `Successfully scanned QR code: ${simpleName}`,
      [
        {
          text: 'Use This Code',
          onPress: () => saveQRCodeAndReturn(data),
        },
        {
          text: 'Scan Again',
          onPress: () => setScanned(false),
          style: 'cancel',
        },
      ]
    );
  };

  // Save QR code data and return to previous screen
  const saveQRCodeAndReturn = async (qrData: string) => {
    try {
      setLoading(true);
      
      // Create a unique ID for this QR code
      const qrId = `qr_${Date.now()}`;
      
      // Save QR code data to storage
      const qrInfo = {
        id: qrId,
        data: qrData,
        name: qrName,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(`qrcode_${qrId}`, JSON.stringify(qrInfo));
      
      // If we have an alarm ID from the route params, associate this QR code with that alarm
      if (route.params?.alarmId) {
        const alarmsJson = await AsyncStorage.getItem('alarms');
        if (alarmsJson) {
          const alarms = JSON.parse(alarmsJson);
          const updatedAlarms = alarms.map((alarm: any) => {
            if (alarm.id === route.params?.alarmId) {
              return {
                ...alarm,
                mode: 'QR_CODE',
                qrCodeId: qrId
              };
            }
            return alarm;
          });
          
          await AsyncStorage.setItem('alarms', JSON.stringify(updatedAlarms));
        }
      }
      
      // Return to previous screen with QR code ID
      navigation.goBack();
    } catch (error) {
      console.error('Error saving QR code:', error);
      Alert.alert('Error', 'Failed to save QR code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show different UI based on permission status
  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D87" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="#2E7D87" />
          </TouchableOpacity>
          <Text style={styles.title}>QR Code Setup</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.permissionContainer}>
          <Feather name="camera-off" size={64} color="#e0e0e0" />
          <Text style={styles.permissionText}>Camera permission is required to scan QR codes.</Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={async () => {
              const { status } = await Camera.requestCameraPermissionsAsync();
              setHasPermission(status === 'granted');
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
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
        <Text style={styles.title}>QR Code Setup</Text>
        <TouchableOpacity onPress={() => setShowInstructions(true)}>
          <Feather name="help-circle" size={24} color="#2E7D87" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.scannerContainer}>
        {!scanned && (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            barcodeScannerSettings={{
              barcodeTypes: ['qr']
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
        )}
        
        {!scanned && (
          <View style={styles.overlay}>
            <View style={styles.unfilled} />
            <View style={styles.row}>
              <View style={styles.unfilled} />
              <View style={styles.scanner} />
              <View style={styles.unfilled} />
            </View>
            <View style={styles.unfilled} />
          </View>
        )}
        
        {scanned && (
          <View style={styles.scannedContainer}>
            <Feather name="check-circle" size={64} color="#4CAF50" />
            <Text style={styles.scannedText}>QR Code Scanned!</Text>
            <Text style={styles.scannedValue}>{qrName}</Text>
            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.scanAgainButtonText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Scan a QR code to use as your alarm challenge.
          You'll need to scan the same code to dismiss your alarm.
        </Text>
      </View>
      
      {/* Instructions Modal */}
      <Modal
        visible={showInstructions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInstructions(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>QR Code Challenge</Text>
            <Text style={styles.modalText}>
              1. Scan any QR code (product, business card, etc.)
            </Text>
            <Text style={styles.modalText}>
              2. Place the QR code somewhere away from your bed
            </Text>
            <Text style={styles.modalText}>
              3. When the alarm rings, you'll need to get up and scan the same QR code to dismiss it
            </Text>
            <Text style={styles.modalTip}>
              Tip: Use a QR code on a product in your bathroom to force yourself to get out of bed!
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowInstructions(false)}
            >
              <Text style={styles.modalButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}
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
    borderWidth: 2,
    borderColor: '#2E7D87',
    backgroundColor: 'transparent',
  },
  scannedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  scannedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  scannedValue: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  scanAgainButton: {
    backgroundColor: '#2E7D87',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#2E7D87',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    lineHeight: 22,
  },
  modalTip: {
    fontSize: 14,
    color: '#2E7D87',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#2E7D87',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default QRCodeSetupScreen;
