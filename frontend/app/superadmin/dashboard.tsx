import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { superAdminAPI } from '../../src/services/api';

export default function SuperAdminDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_passengers: 0,
    total_drivers: 0,
    total_admins: 0,
    total_cities: 0,
    total_rides: 0,
    completed_rides: 0,
    pending_drivers: 0,
    total_revenue: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await superAdminAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { icon: 'people', label: 'Pasajè', value: stats.total_passengers, color: Colors.primary },
    { icon: 'car', label: 'Chofè', value: stats.total_drivers, color: Colors.secondary },
    { icon: 'shield', label: 'Admins', value: stats.total_admins, color: Colors.success },
    { icon: 'location', label: 'Vil', value: stats.total_cities, color: Colors.warning },
    { icon: 'navigate', label: 'Kous Total', value: stats.total_rides, color: Colors.moto },
    { icon: 'checkmark-circle', label: 'Kous Fini', value: stats.completed_rides, color: Colors.success },
    { icon: 'time', label: 'Chofè an Atant', value: stats.pending_drivers, color: Colors.warning },
    { icon: 'cash', label: 'Revni (HTG)', value: stats.total_revenue.toLocaleString(), color: Colors.success },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchStats} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjou, SuperAdmin!</Text>
            <Text style={styles.subtitle}>{user?.full_name}</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={16} color="white" />
            <Text style={styles.badgeText}>SuperAdmin</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>Estatistik Jeneral</Text>
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                <Ionicons name={stat.icon as any} size={24} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Revenue Card */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <Ionicons name="trending-up" size={24} color="white" />
            <Text style={styles.revenueTitle}>Revni Total Sistèm</Text>
          </View>
          <Text style={styles.revenueAmount}>
            {stats.total_revenue.toLocaleString()} HTG
          </Text>
          <Text style={styles.revenueNote}>Tout komisyon kolekte</Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Aksyon Rapid</Text>
        <View style={styles.actionsContainer}>
          <View style={styles.actionCard}>
            <Ionicons name="person-add" size={24} color={Colors.primary} />
            <Text style={styles.actionText}>Kreye Admin</Text>
          </View>
          <View style={styles.actionCard}>
            <Ionicons name="add-circle" size={24} color={Colors.success} />
            <Text style={styles.actionText}>Ajoute Vil</Text>
          </View>
          <View style={styles.actionCard}>
            <Ionicons name="checkmark-done" size={24} color={Colors.secondary} />
            <Text style={styles.actionText}>Apwouve Chofè</Text>
          </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...Shadows.small,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  revenueCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  revenueTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  revenueAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 8,
  },
  revenueNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
  },
});
