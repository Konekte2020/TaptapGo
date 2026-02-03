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
import { rideAPI } from '../../src/services/api';

export default function DriverEarnings() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<any[]>([]);
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    totalRides: 0,
  });

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const response = await rideAPI.getAll('completed');
      const completedRides = response.data.rides || [];
      setRides(completedRides);

      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let today = 0, week = 0, month = 0, total = 0;

      completedRides.forEach((ride: any) => {
        const rideDate = new Date(ride.completed_at || ride.created_at);
        const amount = ride.final_price || ride.estimated_price || 0;
        
        total += amount;
        if (rideDate >= todayStart) today += amount;
        if (rideDate >= weekStart) week += amount;
        if (rideDate >= monthStart) month += amount;
      });

      setStats({
        today,
        week,
        month,
        total,
        totalRides: completedRides.length,
      });
    } catch (error) {
      console.error('Fetch earnings error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchEarnings} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Revni</Text>
        </View>

        {/* Total Earnings Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Revni Total</Text>
          <Text style={styles.totalAmount}>{stats.total.toLocaleString()} HTG</Text>
          <Text style={styles.totalRides}>{stats.totalRides} kous fini</Text>
        </View>

        {/* Period Stats */}
        <View style={styles.periodStats}>
          <View style={styles.periodCard}>
            <Ionicons name="today" size={24} color={Colors.primary} />
            <Text style={styles.periodAmount}>{stats.today.toLocaleString()}</Text>
            <Text style={styles.periodLabel}>Jodi a</Text>
          </View>
          <View style={styles.periodCard}>
            <Ionicons name="calendar" size={24} color={Colors.secondary} />
            <Text style={styles.periodAmount}>{stats.week.toLocaleString()}</Text>
            <Text style={styles.periodLabel}>Semèn sa a</Text>
          </View>
          <View style={styles.periodCard}>
            <Ionicons name="calendar-outline" size={24} color={Colors.success} />
            <Text style={styles.periodAmount}>{stats.month.toLocaleString()}</Text>
            <Text style={styles.periodLabel}>Mwa sa a</Text>
          </View>
        </View>

        {/* Wallet Balance */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Ionicons name="wallet" size={24} color="white" />
            <Text style={styles.walletTitle}>Balans Wallet</Text>
          </View>
          <Text style={styles.walletAmount}>
            {(user?.wallet_balance || 0).toLocaleString()} HTG
          </Text>
          <Text style={styles.walletNote}>
            Komisyon sistèm retire otomatikman
          </Text>
        </View>

        {/* Recent Earnings */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Denyè Kous</Text>
          {rides.slice(0, 5).map((ride, index) => (
            <View key={ride.id || index} style={styles.earningItem}>
              <View style={styles.earningLeft}>
                <Ionicons
                  name={ride.vehicle_type === 'moto' ? 'bicycle' : 'car'}
                  size={20}
                  color={ride.vehicle_type === 'moto' ? Colors.moto : Colors.car}
                />
                <View>
                  <Text style={styles.earningRoute} numberOfLines={1}>
                    {ride.destination_address}
                  </Text>
                  <Text style={styles.earningDate}>
                    {new Date(ride.completed_at || ride.created_at).toLocaleDateString('fr-HT')}
                  </Text>
                </View>
              </View>
              <Text style={styles.earningAmount}>
                +{ride.final_price || ride.estimated_price || 0} HTG
              </Text>
            </View>
          ))}

          {rides.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Pa gen kous fini ankò</Text>
            </View>
          )}
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
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  totalCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 8,
  },
  totalRides: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  periodStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  periodCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...Shadows.small,
  },
  periodAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 8,
  },
  periodLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  walletCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  walletAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  walletNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  recentSection: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  earningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  earningLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  earningRoute: {
    fontSize: 14,
    color: Colors.text,
    maxWidth: 180,
  },
  earningDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.success,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
