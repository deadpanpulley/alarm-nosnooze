import React, { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import {
	StyleSheet,
	View,
	FlatList,
	TouchableOpacity,
	Switch,
	ActivityIndicator,
	Alert,
	Animated,
	Dimensions,
	Platform
} from 'react-native';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { scheduleAlarmNotification, cancelAlarmNotification, manualCheckForAlarms } from '../services/alarmService';
import { isAndroid } from '../utils/androidSpecific';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const checkNotificationPermissions = async () => {
	const { status } = await Notifications.getPermissionsAsync();
	if (status !== 'granted') {
		Alert.alert(
			'Permissions Required',
			'This app needs notification permissions to function as an alarm clock. Please grant this permission in settings.',
			[
				{ text: 'Cancel' },
				{
					text: 'Request Again',
					onPress: async () => {
						const { status } = await Notifications.requestPermissionsAsync();
						if (status !== 'granted') {
							Alert.alert('Permission Denied', 'Alarms will not work properly without notification permissions.');
						}
					}
				}
			]
		);
		return false;
	}
	return true;
};

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
	const fadeAnim = useState(new Animated.Value(0))[0];
	const slideAnim = useState(new Animated.Value(30))[0];

	// Load alarms from storage
	const loadAlarms = async () => {
		try {
			setIsLoading(true);
			const alarmsJson = await AsyncStorage.getItem('alarms');
			if (alarmsJson) {
				setAlarms(JSON.parse(alarmsJson));
			}
			
			// Animate content in
			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 600,
					useNativeDriver: true,
				}),
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 600,
					useNativeDriver: true,
				})
			]).start();
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

	useEffect(() => {
		checkNotificationPermissions();
	}, []);

	useFocusEffect(
		React.useCallback(() => {
			// When the screen is focused, check for any alarms that should have triggered
			setTimeout(() => {
				manualCheckForAlarms();
			}, 1000);

			return () => {
				// Cleanup when screen is unfocused
			};
		}, [])
	);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Alarmy</Text>
				<View style={styles.headerButtons}>
					{isAndroid && (
						<TouchableOpacity 
							style={styles.androidSettingsButton} 
							onPress={() => navigation.navigate('AndroidSettings')}
						>
							<Feather name="smartphone" size={22} color="#2E7D87" />
						</TouchableOpacity>
					)}
					<TouchableOpacity style={styles.analyticsButton} onPress={() => navigation.navigate('Analytics')}>
						<Feather name="bar-chart-2" size={24} color="#2E7D87" />
					</TouchableOpacity>
				</View>
			</View>

			<Animated.View 
				style={[
					styles.analyticsCardContainer, 
					{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }]
					}
				]}
			>
				<TouchableOpacity 
					style={styles.analyticsCard} 
					onPress={() => navigation.navigate('Analytics')}
					activeOpacity={0.8}
				>
					<View style={styles.analyticsIconContainer}>
						<Feather name="bar-chart-2" size={32} color="#fff" />
					</View>
					<View style={styles.analyticsTextContainer}>
						<Text style={styles.analyticsCardText}>View Analytics</Text>
						<Text style={styles.analyticsCardSubtext}>Track your wake-up patterns</Text>
					</View>
				</TouchableOpacity>
			</Animated.View>

			{isLoading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#2E7D87" />
				</View>
			) : alarms.length === 0 ? (
				<Animated.View 
					style={[
						styles.emptyContainer,
						{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }]
						}
					]}
				>
					<View style={styles.emptyIconContainer}>
						<Feather name="clock" size={64} color="#E0E0E0" />
					</View>
					<Text style={styles.emptyText}>No alarms set</Text>
					<Text style={styles.emptySubtext}>Tap the + button to add an alarm</Text>
				</Animated.View>
			) : (
				<Animated.View style={{ flex: 1, opacity: fadeAnim }}>
					<FlatList
						data={alarms}
						keyExtractor={(item) => item.id}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={styles.listContainer}
						renderItem={({ item, index }) => (
							<Animated.View 
								style={{
									transform: [{ 
										translateY: slideAnim.interpolate({
											inputRange: [0, 1],
											outputRange: [0, 15 * (index + 1)]
										}) 
									}]
								}}
							>
								<TouchableOpacity 
									style={[
										styles.alarmCard,
										item.isActive && styles.alarmCardActive
									]}
									activeOpacity={0.9}
									onPress={() => {}}
								>
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
								</TouchableOpacity>
							</Animated.View>
						)}
					/>
				</Animated.View>
			)}
			{__DEV__ && (
				<TouchableOpacity
					style={styles.testButton}
					onPress={async () => {
						const triggered = await manualCheckForAlarms();
						if (!triggered) {
							Alert.alert('No alarms', 'No alarms were triggered by the check');
						}
					}}
				>
					<Text style={styles.testButtonText}>Check Alarms</Text>
				</TouchableOpacity>
			)}

			<TouchableOpacity
				style={styles.addButton}
				onPress={() => navigation.navigate('CreateAlarm')}
			>
				<Feather name="plus" size={22} color="#fff" />
			</TouchableOpacity>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	testButton: {
		position: 'absolute',
		left: 24,
		bottom: 24,
		backgroundColor: '#2E7D87',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 16,
	},
	testButtonText: {
		color: '#fff',
		fontSize: 12,
	},
	container: {
		flex: 1,
		backgroundColor: '#f8f9fd',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 24,
		paddingTop: 32,
		paddingBottom: 16,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 10,
		elevation: 3,
	},
	headerButtons: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	androidSettingsButton: {
		marginRight: 16,
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#2E7D87',
		letterSpacing: 0.5,
	},
	analyticsButton: {
		padding: 10,
		borderRadius: 12,
		backgroundColor: '#e4f5f6',
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
	emptyIconContainer: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: '#f0f0f0',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16,
	},
	emptyText: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
		marginTop: 16,
	},
	emptySubtext: {
		fontSize: 15,
		color: '#777',
		marginTop: 8,
		textAlign: 'center',
	},
	listContainer: {
		padding: 16,
		paddingBottom: 100,
	},
	alarmCard: {
		borderRadius: 16,
		backgroundColor: '#fff',
		marginBottom: 16,
		padding: 18,
		borderWidth: 1,
		borderColor: '#f0f0f0',
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 8,
		elevation: 2,
	},
	alarmCardActive: {
		borderLeftWidth: 4,
		borderLeftColor: '#2E7D87',
	},
	alarmMainInfo: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	alarmTime: {
		fontSize: 24,
		fontWeight: '500',
		color: '#333',
		marginBottom: 4,
	},
	alarmLabel: {
		fontSize: 15,
		color: '#777',
	},
	rightControls: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	deleteButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#f5f5f5',
		justifyContent: 'center',
		alignItems: 'center',
	},
	alarmDetails: {
		flexDirection: 'row',
		marginTop: 14,
		paddingTop: 14,
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
	},
	daysContainer: {
		backgroundColor: '#f5f5f5',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		marginRight: 8,
	},
	daysText: {
		fontSize: 13,
		color: '#555',
		fontWeight: '500',
	},
	modeContainer: {
		backgroundColor: '#e4f5f6',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		flexDirection: 'row',
		alignItems: 'center',
	},
	modeText: {
		fontSize: 13,
		color: '#2E7D87',
		marginLeft: 6,
		fontWeight: '500',
	},
	addButton: {
		position: 'absolute',
		right: 24,
		bottom: 24,
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: '#2E7D87',
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.2,
		shadowOffset: { width: 0, height: 4 },
		shadowRadius: 8,
		elevation: 5,
	},
	analyticsCardContainer: {
		paddingHorizontal: 16,
		marginTop: 16,
		marginBottom: 8,
	},
	analyticsCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#2E7D87',
		borderRadius: 16,
		paddingVertical: 16,
		paddingHorizontal: 20,
		shadowColor: '#000',
		shadowOpacity: 0.15,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 5,
	},
	analyticsIconContainer: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	analyticsTextContainer: {
		marginLeft: 16,
	},
	analyticsCardText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold',
		letterSpacing: 0.5,
	},
	analyticsCardSubtext: {
		color: 'rgba(255, 255, 255, 0.8)',
		fontSize: 14,
		marginTop: 4,
	},
});

export default HomeScreen;