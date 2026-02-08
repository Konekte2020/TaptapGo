import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { rideAPI, driverAPI, passengerAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

export default function AdminReports() {
  const { user } = useAuthStore();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [status, setStatus] = useState<'all' | 'completed' | 'cancelled' | 'pending'>('all');
  const [vehicleType, setVehicleType] = useState<'all' | 'moto' | 'car'>('all');
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'cash' | 'moncash' | 'natcash' | 'bank'>('all');
  const [city, setCity] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [driverQuery, setDriverQuery] = useState('');
  const [passengerQuery, setPassengerQuery] = useState('');

  useEffect(() => {
    fetchReports();
    fetchActors();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await rideAPI.getAll();
      setRides(response.data.rides || []);
    } catch (error) {
      console.error('Fetch reports error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActors = async () => {
    try {
      const [driversResponse, passengersResponse] = await Promise.all([
        driverAPI.getAll(),
        passengerAPI.getAll(),
      ]);
      setDrivers(driversResponse.data.drivers || []);
      setPassengers(passengersResponse.data.passengers || []);
    } catch (error) {
      console.error('Fetch actors error:', error);
    }
  };

  const driverMap = useMemo(() => {
    const map = new Map<string, any>();
    drivers.forEach((d: any) => {
      if (d?.id) map.set(d.id, d);
    });
    return map;
  }, [drivers]);

  const passengerMap = useMemo(() => {
    const map = new Map<string, any>();
    passengers.forEach((p: any) => {
      if (p?.id) map.set(p.id, p);
    });
    return map;
  }, [passengers]);

  const availableCities = useMemo(() => {
    if (user?.cities?.length) return user.cities;
    const unique = new Set<string>();
    rides.forEach((r) => {
      if (r.city) unique.add(r.city);
    });
    return Array.from(unique);
  }, [rides, user?.cities]);

  const filteredRides = useMemo(() => {
    let list = rides;
    if (status !== 'all') {
      list = list.filter((r) => r.status === status);
    }
    if (vehicleType !== 'all') {
      list = list.filter((r) => r.vehicle_type === vehicleType);
    }
    if (paymentMethod !== 'all') {
      list = list.filter((r) => r.payment_method === paymentMethod);
    }
    if (city !== 'all') {
      list = list.filter((r) => r.city === city);
    }
    if (dateFrom) {
      list = list.filter((r) => String(r.created_at || '').slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((r) => String(r.created_at || '').slice(0, 10) <= dateTo);
    }
    if (driverQuery.trim()) {
      const term = driverQuery.trim().toLowerCase();
      list = list.filter((r) => {
        const driver = driverMap.get(r.driver_id);
        const name = String(driver?.full_name || '').toLowerCase();
        const phone = String(driver?.phone || '').toLowerCase();
        return name.includes(term) || phone.includes(term);
      });
    }
    if (passengerQuery.trim()) {
      const term = passengerQuery.trim().toLowerCase();
      list = list.filter((r) => {
        const passenger = passengerMap.get(r.passenger_id);
        const name = String(passenger?.full_name || '').toLowerCase();
        const phone = String(passenger?.phone || '').toLowerCase();
        return name.includes(term) || phone.includes(term);
      });
    }
    return list;
  }, [
    rides,
    status,
    vehicleType,
    paymentMethod,
    city,
    dateFrom,
    dateTo,
    driverQuery,
    passengerQuery,
    driverMap,
    passengerMap,
  ]);

  const summary = useMemo(() => {
    const total = filteredRides.length;
    const completed = filteredRides.filter((r) => r.status === 'completed');
    const cancelled = filteredRides.filter((r) => r.status === 'cancelled');
    const revenue = completed.reduce((sum, r) => sum + (r.final_price || r.estimated_price || 0), 0);
    return {
      total,
      completed: completed.length,
      cancelled: cancelled.length,
      revenue,
    };
  }, [filteredRides]);

  const clearFilters = () => {
    setStatus('all');
    setVehicleType('all');
    setPaymentMethod('all');
    setCity('all');
    setDateFrom('');
    setDateTo('');
    setDriverQuery('');
    setPassengerQuery('');
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="navigate" size={18} color={Colors.primary} />
        <Text style={styles.title}>{item.destination_address || 'Kous'}</Text>
      </View>
      <Text style={styles.meta}>
        {item.status || '—'} • {item.vehicle_type || '—'}
      </Text>
      <Text style={styles.date}>{String(item.created_at || '').slice(0, 10)}</Text>
      <Text style={styles.amount}>
        {(item.final_price || item.estimated_price || 0).toLocaleString()} HTG
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rapò</Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Kous</Text>
          <Text style={styles.summaryValue}>{summary.total}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Fini</Text>
          <Text style={styles.summaryValue}>{summary.completed}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Anile</Text>
          <Text style={styles.summaryValue}>{summary.cancelled}</Text>
        </View>
        <View style={[styles.summaryCard, styles.revenueCard]}>
          <Text style={styles.summaryLabel}>Revni</Text>
          <Text style={styles.summaryValue}>{summary.revenue.toLocaleString()} HTG</Text>
        </View>
      </View>
      <View style={styles.filters}>
        <Text style={styles.filterTitle}>Filtre</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {['all', 'completed', 'cancelled', 'pending'].map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.filterChip, status === value && styles.filterChipActive]}
              onPress={() => setStatus(value as any)}
            >
              <Text style={[styles.filterChipText, status === value && styles.filterChipTextActive]}>
                {value === 'all' ? 'Tout' : value === 'completed' ? 'Fini' : value === 'cancelled' ? 'Anile' : 'Ankou'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {['all', 'moto', 'car'].map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.filterChip, vehicleType === value && styles.filterChipActive]}
              onPress={() => setVehicleType(value as any)}
            >
              <Text style={[styles.filterChipText, vehicleType === value && styles.filterChipTextActive]}>
                {value === 'all' ? 'Tout Veyikil' : value === 'moto' ? 'Moto' : 'Machin'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {['all', 'cash', 'moncash', 'natcash', 'bank'].map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.filterChip, paymentMethod === value && styles.filterChipActive]}
              onPress={() => setPaymentMethod(value as any)}
            >
              <Text style={[styles.filterChipText, paymentMethod === value && styles.filterChipTextActive]}>
                {value === 'all' ? 'Tout Peman' : value === 'cash' ? 'Kontan' : value}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, city === 'all' && styles.filterChipActive]}
            onPress={() => setCity('all')}
          >
            <Text style={[styles.filterChipText, city === 'all' && styles.filterChipTextActive]}>Tout Vil</Text>
          </TouchableOpacity>
          {availableCities.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.filterChip, city === c && styles.filterChipActive]}
              onPress={() => setCity(c)}
            >
              <Text style={[styles.filterChipText, city === c && styles.filterChipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.dateRow}>
          <View style={styles.dateInputWrap}>
            <Text style={styles.dateLabel}>Depi (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.dateInput}
              value={dateFrom}
              onChangeText={setDateFrom}
              placeholder="2026-01-01"
            />
          </View>
          <View style={styles.dateInputWrap}>
            <Text style={styles.dateLabel}>Jiska</Text>
            <TextInput
              style={styles.dateInput}
              value={dateTo}
              onChangeText={setDateTo}
              placeholder="2026-12-31"
            />
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="person" size={16} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Chèche chofè (non/telefòn)"
              value={driverQuery}
              onChangeText={setDriverQuery}
            />
          </View>
          <View style={styles.searchInputWrap}>
            <Ionicons name="people" size={16} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Chèche pasajè (non/telefòn)"
              value={passengerQuery}
              onChangeText={setPassengerQuery}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
          <Ionicons name="refresh" size={16} color={Colors.text} />
          <Text style={styles.clearText}>Reyajiste filtre yo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredRides}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchReports} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Pa gen rapò</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 20,
    paddingBottom: 0,
  },
  filters: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  filterRow: {
    gap: 8,
    paddingRight: 10,
  },
  filterChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: 'white',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputWrap: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  dateInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: Colors.text,
  },
  searchRow: {
    gap: 10,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  clearText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    ...Shadows.small,
  },
  revenueCard: {
    backgroundColor: Colors.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 4,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  date: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
