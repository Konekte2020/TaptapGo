import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { adminAPI } from '../../src/services/api';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_drivers: 0,
    pending_drivers: 0,
    approved_drivers: 0,
    total_passengers: 0,
    total_rides: 0,
    completed_rides: 0,
    total_revenue: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { icon: 'car', label: 'Chofè Total', value: stats.total_drivers, color: Colors.secondary },
    { icon: 'time', label: 'An Atant', value: stats.pending_drivers, color: Colors.warning },
    { icon: 'checkmark-circle', label: 'Apwouve', value: stats.approved_drivers, color: Colors.success },
    { icon: 'people', label: 'Pasajè', value: stats.total_passengers, color: Colors.primary },
    { icon: 'navigate', label: 'Kous Total', value: stats.total_rides, color: Colors.moto },
    { icon: 'checkmark-done', label: 'Kous Fini', value: stats.completed_rides, color: Colors.success },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchStats} />
        }
      >
        {/* Header with Branding */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {user?.brand_name || 'TapTapGo'} Admin
            </Text>
            <Text style={styles.subtitle}>{user?.full_name}</Text>
          </View>
          {user?.logo ? (
            <Image source={{ uri: user.logo }} style={styles.logo} />
          ) : (
            <View style={[styles.badge, { backgroundColor: user?.primary_color || Colors.primary }]}>
              <Ionicons name="shield" size={16} color="white" />
              <Text style={styles.badgeText}>Admin</Text>
            </View>
          )}
        </View>

        {/* Cities Managed */}
        <View style={styles.citiesCard}>
          <Text style={styles.citiesLabel}>Vil ou jère:</Text>
          <View style={styles.citiesList}>
            {(user?.cities || []).map((city, index) => (
              <View key={index} style={styles.cityChip}>
                <Ionicons name="location" size={12} color={Colors.primary} />
                <Text style={styles.cityText}>{city}</Text>
              </View>
            ))}
            {(!user?.cities || user.cities.length === 0) && (
              <Text style={styles.noCitiesText}>Pa gen vil asiye</Text>
            )}
          </View>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Estatistik</Text>
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
        <View style={[styles.revenueCard, { backgroundColor: user?.primary_color || Colors.primary }]}>
          <View style={styles.revenueHeader}>
            <Ionicons name="cash" size={24} color="white" />
            <Text style={styles.revenueTitle}>Revni Total</Text>
          </View>
          <Text style={styles.revenueAmount}>
            {stats.total_revenue.toLocaleString()} HTG
          </Text>
          <Text style={styles.revenueNote}>Nan vil ou jère yo</Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Aksyon Rapid</Text>
        <View style={styles.actionsContainer}>
          <View style={styles.actionCard}>
            <Ionicons name="person-add" size={24} color={Colors.success} />
            <Text style={styles.actionText}>Ajoute Chofè</Text>
          </View>
          <View style={styles.actionCard}>
            <Ionicons name="checkmark-done" size={24} color={Colors.secondary} />
            <Text style={styles.actionText}>Apwouve Chofè</Text>
          </View>
          <View style={styles.actionCard}>
            <Ionicons name="pricetag" size={24} color={Colors.warning} />
            <Text style={styles.actionText}>Modifye Pri</Text>
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
    marginBottom: 20,
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
  logo: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
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
  citiesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  citiesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  citiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  cityText: {
    fontSize: 12,
    color: Colors.text,
  },
  noCitiesText: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    fontSize: 11,
    color: Colors.text,
    textAlign: 'center',
  },
});
