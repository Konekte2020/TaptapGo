import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { superAdminAPI } from '../../src/services/api';

export default function SuperAdminAnalytics() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await superAdminAPI.getStats();
        setStats(response.data);
      } catch (error) {
        console.error('Analytics fetch error:', error);
      }
    };
    fetchStats();
  }, []);

  const series = stats?.revenue_7d || [];
  const maxRevenue = Math.max(1, ...series.map((d: any) => d.revenue));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.push('/superadmin/settings')}>
              <Ionicons name="arrow-back" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Ionicons name="analytics-outline" size={22} color={Colors.primary} />
            <Text style={styles.title}>Analitik</Text>
          </View>
          <Text style={styles.text}>
            Rezime sou revni ak pèfòmans 7 dènye jou yo.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Revni 7 jou</Text>
          <View style={styles.chartBars}>
            {series.map((point: any) => (
              <View key={point.date} style={styles.chartBarItem}>
                <View
                  style={[
                    styles.chartBar,
                    { height: `${Math.round((point.revenue / maxRevenue) * 100)}%` },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Top Admin</Text>
          {(stats?.top_admins || []).map((item: any) => (
            <View key={item.admin_id} style={styles.row}>
              <Text style={styles.rowLabel}>{item.name}</Text>
              <Text style={styles.rowValue}>{item.revenue} HTG</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Top Vil</Text>
          {(stats?.top_cities || []).map((item: any) => (
            <View key={item.city} style={styles.row}>
              <Text style={styles.rowLabel}>{item.city}</Text>
              <Text style={styles.rowValue}>{item.revenue} HTG</Text>
            </View>
          ))}
        </View>
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
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 6,
  },
  chartBarItem: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rowLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
});
