import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { rideAPI, superAdminAPI } from '../../src/services/api';

export default function SuperAdminReports() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [rides, setRides] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, ridesRes] = await Promise.all([
        superAdminAPI.getStats(),
        rideAPI.getAll(),
      ]);
      setStats(statsRes.data);
      setRides(ridesRes.data.rides || []);
    } catch (error) {
      console.error('Reports fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const exportCSV = () => {
    if (!rides.length) {
      Alert.alert('Nòt', 'Pa gen done pou ekspòte');
      return;
    }
    const header = ['id', 'status', 'final_price', 'city', 'created_at'];
    const rows = rides.map((r) => [
      r.id,
      r.status,
      r.final_price || 0,
      r.city || '',
      r.created_at || ''
    ]);
    const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
    Alert.alert('CSV', csv.slice(0, 2000));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.push('/superadmin/settings')}>
              <Ionicons name="arrow-back" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Ionicons name="document-outline" size={22} color={Colors.primary} />
            <Text style={styles.title}>Rapò</Text>
          </View>
          <Text style={styles.text}>
            Rezime sou kous ak revni. Glise pou rafrechi si ou bezwen.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rezime</Text>
          <Text style={styles.line}>Total kous: {stats?.total_rides ?? 0}</Text>
          <Text style={styles.line}>Kous fini: {stats?.completed_rides ?? 0}</Text>
          <Text style={styles.line}>Revni total: {stats?.total_revenue ?? 0} HTG</Text>
          <Text style={styles.line}>Chofè: {stats?.total_drivers ?? 0}</Text>
          <Text style={styles.line}>Pasajè: {stats?.total_passengers ?? 0}</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={exportCSV} disabled={loading}>
          <Text style={styles.buttonText}>Ekspòte CSV</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    ...Shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  text: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  line: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
