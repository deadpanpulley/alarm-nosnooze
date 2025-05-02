import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// Placeholder analytics data structure
const getAnalyticsData = async () => {
  // TODO: Replace with real data fetching logic
  return {
    alarmsSet: 12,
    alarmsDismissed: 9,
    averageWakeTime: '7:15 AM',
    mostUsedMode: 'Quiz',
    streak: 4,
  };
};

const AnalyticsScreen = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getAnalyticsData().then(setData);
  }, []);

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Analytics</Text>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Analytics</Text>
      <ScrollView contentContainerStyle={styles.statsContainer}>
        <View style={styles.statCard}>
          <Feather name="bell" size={28} color="#2E7D87" />
          <Text style={styles.statLabel}>Alarms Set</Text>
          <Text style={styles.statValue}>{data.alarmsSet}</Text>
        </View>
        <View style={styles.statCard}>
          <Feather name="check-circle" size={28} color="#2E7D87" />
          <Text style={styles.statLabel}>Alarms Dismissed</Text>
          <Text style={styles.statValue}>{data.alarmsDismissed}</Text>
        </View>
        <View style={styles.statCard}>
          <Feather name="clock" size={28} color="#2E7D87" />
          <Text style={styles.statLabel}>Avg Wake Time</Text>
          <Text style={styles.statValue}>{data.averageWakeTime}</Text>
        </View>
        <View style={styles.statCard}>
          <Feather name="award" size={28} color="#2E7D87" />
          <Text style={styles.statLabel}>Streak</Text>
          <Text style={styles.statValue}>{data.streak} days</Text>
        </View>
        <View style={styles.statCard}>
          <Feather name="activity" size={28} color="#2E7D87" />
          <Text style={styles.statLabel}>Most Used Mode</Text>
          <Text style={styles.statValue}>{data.mostUsedMode}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D87',
    marginBottom: 24,
    alignSelf: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 18,
  },
  statCard: {
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: {
    fontSize: 16,
    color: '#555',
    marginTop: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2E7D87',
    marginTop: 2,
  },
});

export default AnalyticsScreen;
