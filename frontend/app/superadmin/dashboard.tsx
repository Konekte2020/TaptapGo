import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Pressable,
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
    direct_revenue: 0,
    admin_revenue: 0,
    revenue_7d: [] as { date: string; revenue: number }[],
    revenue_30d: [] as { date: string; revenue: number }[],
    top_cities: [] as { city: string; revenue: number }[],
    top_admins: [] as { admin_id: string; name: string; revenue: number }[],
  });
  const [revenueRange, setRevenueRange] = useState<'7d' | '30d'>('7d');

  const completionRate = stats.total_rides
    ? Math.round((stats.completed_rides / stats.total_rides) * 100)
    : 0;
  const pendingRate = stats.total_drivers
    ? Math.round((stats.pending_drivers / stats.total_drivers) * 100)
    : 0;
  const directRevenueShare = stats.total_revenue
    ? Math.round((stats.direct_revenue / stats.total_revenue) * 100)
    : 0;

  const revenueSeries = useMemo(
    () => (revenueRange === '7d' ? stats.revenue_7d : stats.revenue_30d),
    [revenueRange, stats.revenue_7d, stats.revenue_30d]
  );
  const maxRevenue = Math.max(1, ...revenueSeries.map((d) => d.revenue));

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await superAdminAPI.getStats();
      setStats((prev) => ({
        ...prev,
        ...response.data,
        direct_revenue: response.data?.direct_revenue ?? prev.direct_revenue,
        admin_revenue: response.data?.admin_revenue ?? prev.admin_revenue,
      }));
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

        {/* KPI Summary */}
        <Text style={styles.sectionTitle}>Rezime KPI</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Kous</Text>
            <Text style={styles.kpiValue}>{stats.total_rides.toLocaleString()}</Text>
            <Text style={styles.kpiMeta}>Tout kous sou platfòm nan</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Kous Fini</Text>
            <Text style={styles.kpiValue}>{stats.completed_rides.toLocaleString()}</Text>
            <Text style={styles.kpiMeta}>{completionRate}% fini</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Chofè an Atant</Text>
            <Text style={styles.kpiValue}>{stats.pending_drivers.toLocaleString()}</Text>
            <Text style={styles.kpiMeta}>{pendingRate}% sou total chofè</Text>
          </View>
        </View>

        {/* Revenue Cards */}
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

        <View style={styles.revenueGrid}>
          <View style={[styles.revenueCardSmall, { backgroundColor: Colors.primary }]}>
            <Text style={styles.revenueLabel}>Revni Dirèk Platfòm</Text>
            <Text style={styles.revenueSmallAmount}>
              {stats.direct_revenue.toLocaleString()} HTG
            </Text>
            <Text style={styles.revenueSmallNote}>Chofè pwòp platfòm</Text>
          </View>
          <View style={[styles.revenueCardSmall, { backgroundColor: Colors.secondary }]}>
            <Text style={styles.revenueLabel}>Revni sou Mak Pèsonèl</Text>
            <Text style={styles.revenueSmallAmount}>
              {stats.admin_revenue.toLocaleString()} HTG
            </Text>
            <Text style={styles.revenueSmallNote}>Komisyon admins</Text>
          </View>
        </View>

        {/* Trend Bars */}
        <Text style={styles.sectionTitle}>Tandans Rapid</Text>
        <View style={styles.trendCard}>
          <View style={styles.trendRow}>
            <Text style={styles.trendLabel}>Taux Kous Fini</Text>
            <Text style={styles.trendValue}>{completionRate}%</Text>
          </View>
          <View style={styles.trendBar}>
            <View style={[styles.trendFill, { width: `${completionRate}%` }]} />
          </View>

          <View style={styles.trendRow}>
            <Text style={styles.trendLabel}>Revni Dirèk vs Mak</Text>
            <Text style={styles.trendValue}>{directRevenueShare}% dirèk</Text>
          </View>
          <View style={styles.trendBar}>
            <View style={[styles.trendFill, { width: `${directRevenueShare}%` }]} />
          </View>

          <View style={styles.trendRow}>
            <Text style={styles.trendLabel}>Chofè an Atant</Text>
            <Text style={styles.trendValue}>{pendingRate}%</Text>
          </View>
          <View style={styles.trendBar}>
            <View style={[styles.trendFill, { width: `${pendingRate}%` }]} />
          </View>
        </View>

        {/* Revenue Chart */}
        <View style={styles.chartHeader}>
          <Text style={styles.sectionTitle}>Grafik Revni</Text>
          <View style={styles.chartToggle}>
            <Pressable
              onPress={() => setRevenueRange('7d')}
              style={[
                styles.toggleButton,
                revenueRange === '7d' && styles.toggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  revenueRange === '7d' && styles.toggleTextActive,
                ]}
              >
                7 jou
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setRevenueRange('30d')}
              style={[
                styles.toggleButton,
                revenueRange === '30d' && styles.toggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  revenueRange === '30d' && styles.toggleTextActive,
                ]}
              >
                30 jou
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.chartCard}>
          <View style={styles.chartBars}>
            {revenueSeries.map((point) => (
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
          <View style={styles.chartLabels}>
            {revenueSeries.map((point) => (
              <Text key={point.date} style={styles.chartLabel}>
                {point.date.slice(5)}
              </Text>
            ))}
          </View>
        </View>

        {/* Top Lists */}
        <View style={styles.topGrid}>
          <View style={styles.topCard}>
            <Text style={styles.sectionTitle}>Top Vil</Text>
            {stats.top_cities.length === 0 ? (
              <Text style={styles.emptyNote}>Pa gen done</Text>
            ) : (
              stats.top_cities.map((item) => (
                <View key={item.city} style={styles.topRow}>
                  <Text style={styles.topLabel}>{item.city}</Text>
                  <Text style={styles.topValue}>{item.revenue.toLocaleString()} HTG</Text>
                </View>
              ))
            )}
          </View>
          <View style={styles.topCard}>
            <Text style={styles.sectionTitle}>Top Admin</Text>
            {stats.top_admins.length === 0 ? (
              <Text style={styles.emptyNote}>Pa gen done</Text>
            ) : (
              stats.top_admins.map((item) => (
                <View key={item.admin_id} style={styles.topRow}>
                  <Text style={styles.topLabel}>{item.name}</Text>
                  <Text style={styles.topValue}>{item.revenue.toLocaleString()} HTG</Text>
                </View>
              ))
            )}
          </View>
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
  revenueGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  revenueCardSmall: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
  },
  revenueLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
  },
  revenueSmallAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  revenueSmallNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
  },
  kpiLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  kpiMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  trendCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...Shadows.small,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  trendLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  trendValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  trendBar: {
    height: 8,
    borderRadius: 8,
    backgroundColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  trendFill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  toggleButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  toggleText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...Shadows.small,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
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
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  chartLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  topGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  topCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  topLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  topValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  emptyNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
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
