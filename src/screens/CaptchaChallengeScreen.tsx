import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    BackHandler,
    Vibration,
    Platform,
    Alert,
    KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import * as Notifications from 'expo-notifications';

type CaptchaChallengeRouteProp = RouteProp<RootStackParamList, 'CaptchaChallenge'>;
type CaptchaChallengeNavigationProp = StackNavigationProp<RootStackParamList, 'CaptchaChallenge'>;

// Define a captcha generator function
const generateCaptcha = (): { image: string, text: string } => {
    // Characters that will be used in the captcha (excluding similar-looking characters)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    // Generate a random 6-character string
    let captchaText = '';
    for (let i = 0; i < 6; i++) {
        captchaText += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Create a visual representation of the captcha
    // For simplicity, we'll use ASCII art to represent the captcha
    // In a production app, you'd generate actual images with distortions
    let captchaImage = '';
    const styles = ['━', '╋', '┓', '┛', '┗', '┏', '┃', '┻', '┳', '┫', '┣'];

    // Add some "noise" with random symbols
    for (let i = 0; i < 5; i++) {
        captchaImage += ' ' + styles[Math.floor(Math.random() * styles.length)];
    }
    captchaImage += '\n';

    // Add the actual characters with some "distortion"
    for (let i = 0; i < captchaText.length; i++) {
        const char = captchaText[i];

        // Add some random spacing and symbols around the character
        const prefix = Math.random() > 0.5 ? styles[Math.floor(Math.random() * styles.length)] : ' ';
        const suffix = Math.random() > 0.5 ? styles[Math.floor(Math.random() * styles.length)] : ' ';

        captchaImage += prefix + char + suffix;
    }
    captchaImage += '\n';

    // Add some more "noise" with random symbols
    for (let i = 0; i < 5; i++) {
        captchaImage += ' ' + styles[Math.floor(Math.random() * styles.length)];
    }

    return {
        image: captchaImage,
        text: captchaText
    };
};

const CaptchaChallengeScreen = () => {
    const route = useRoute<CaptchaChallengeRouteProp>();
    const navigation = useNavigation<CaptchaChallengeNavigationProp>();
    const { alarm } = route.params;

    // Sound object for alarm
    const [sound, setSound] = useState<Audio.Sound | null>(null);

    // Current time displayed
    const [currentTime, setCurrentTime] = useState('');

    // Captcha state
    const [captcha, setCaptcha] = useState(generateCaptcha());
    const [userInput, setUserInput] = useState('');
    const [isCorrect, setIsCorrect] = useState(false);
    const [attempts, setAttempts] = useState(0);

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

    // Submit captcha answer
    const submitAnswer = () => {
        // Check if the input matches the captcha text (case insensitive)
        if (userInput.toUpperCase() === captcha.text) {
            // Correct answer
            setIsCorrect(true);

            // Stop sound and vibration
            if (sound) {
                sound.stopAsync().then(() => {
                    sound.unloadAsync();
                }).catch(error => {
                    console.error('Error stopping sound:', error);
                });
            }

            Vibration.cancel();

            // Important: Cancel the alarm notification that triggered this screen
            if (alarm && alarm.notificationId) {
                Notifications.dismissNotificationAsync(alarm.notificationId)
                    .catch(error => console.error('Error dismissing notification:', error));
            }

            // Wait a moment to show success message before navigating back
            setTimeout(() => {
                navigation.navigate('Home');
            }, 1500);
        } else {
            // Wrong answer
            setAttempts(attempts + 1);
            setUserInput('');

            // Generate a new captcha after 3 failed attempts
            if (attempts >= 2) {
                setCaptcha(generateCaptcha());
                setAttempts(0);

                // Vibrate to indicate error
                Vibration.vibrate(500);

                Alert.alert(
                    "Incorrect",
                    "Too many failed attempts. A new captcha has been generated.",
                    [{ text: "OK" }]
                );
            } else {
                // Vibrate to indicate error
                Vibration.vibrate(200);

                Alert.alert(
                    "Incorrect",
                    "The captcha you entered is incorrect. Please try again.",
                    [{ text: "OK" }]
                );
            }
        }
    };

    // Generate a new captcha
    const refreshCaptcha = () => {
        setCaptcha(generateCaptcha());
        setUserInput('');
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

            <KeyboardAvoidingView
                style={styles.captchaContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Captcha Challenge */}
                <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsText}>
                        Enter the captcha text to dismiss the alarm
                    </Text>
                </View>

                {/* Success Message - only shown when captcha is correct */}
                {isCorrect ? (
                    <View style={styles.successContainer}>
                        <Feather name="check-circle" size={48} color="#2E7D87" />
                        <Text style={styles.successText}>Alarm dismissed!</Text>
                    </View>
                ) : (
                    <>
                        {/* Captcha Image */}
                        <View style={styles.captchaImageContainer}>
                            <Text style={styles.captchaImage}>{captcha.image}</Text>
                            <TouchableOpacity
                                style={styles.refreshButton}
                                onPress={refreshCaptcha}
                            >
                                <Feather name="refresh-cw" size={20} color="#fff" />
                                <Text style={styles.refreshButtonText}>New Captcha</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Captcha Input */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                value={userInput}
                                onChangeText={setUserInput}
                                placeholder="Enter captcha text"
                                placeholderTextColor="#aaa"
                                autoCapitalize="characters"
                                autoCorrect={false}
                                maxLength={6}
                            />
                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={submitAnswer}
                                disabled={userInput.length < 4}
                            >
                                <Text style={styles.submitButtonText}>Verify</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </KeyboardAvoidingView>
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
        marginBottom: 20,
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
        marginBottom: 30,
        paddingHorizontal: 30,
        alignItems: 'center',
    },
    instructionsText: {
        fontSize: 18,
        color: '#fff',
        textAlign: 'center',
    },
    captchaContainer: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    captchaImageContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 20,
    },
    captchaImage: {
        fontSize: 22,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 15,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    refreshButtonText: {
        color: '#fff',
        marginLeft: 8,
        fontSize: 14,
    },
    inputContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: '#fff',
        borderRadius: 12,
        fontSize: 18,
        padding: 15,
        marginRight: 10,
    },
    submitButton: {
        backgroundColor: '#2E7D87',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    successContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    successText: {
        fontSize: 24,
        color: '#fff',
        marginTop: 16,
    },
});

export default CaptchaChallengeScreen;