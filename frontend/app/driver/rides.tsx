import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { rideAPI } from '../../src/services/api';

export default function DriverRides() {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRides();
  }, [filter]);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter;
      const response = await rideAPI.getAll(status);
      setRides(response.data.rides || []);
    } catch (error) {
      console.error('Fetch rides error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    try {
      await rideAPI.accept(rideId);
      Alert.alert('Siksè', 'Ou aksepte kous la!');
      fetchRides();
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab aksepte kous la');
    }
  };

  const handleUpdateStatus = async (rideId: string, status: string) => {
    try {
      await rideAPI.updateStatus(rideId, status);
      fetchRides();
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab update stat');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return Colors.success;
      case 'cancelled': return Colors.error;
      case 'pending': return Colors.warning;
      case 'accepted': return Colors.secondary;
      case 'started': return Colors.primary;
      default: return Colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Fini';
      case 'cancelled': return 'Anile';
      case 'pending': return 'An atant';
      case 'accepted': return 'Aksepte';
      case 'started': return 'An wout';
      case 'arrived': return 'Rive';
      default: return status;
    }
  };

  const renderRide = ({ item }: { item: any }) => (
    <View style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <View style={styles.vehicleInfo}>
          <Ionicons
            name={item.vehicle_type === 'moto' ? 'bicycle' : 'car'}
            size={20}
            color={item.vehicle_type === 'moto' ? Colors.moto : Colors.car}
          />
          <Text style={styles.priceText}>
            {item.estimated_price || 0} HTG
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.rideRoute}>
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
          <Text style={styles.routeText} numberOfLines={1}>{item.pickup_address}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.routeText} numberOfLines={1}>{item.destination_address}</Text>
        </View>
      </View>

      <View style={styles.rideDetails}>
        <Text style={styles.detailText}>
          <Ionicons name="navigate" size={12} color={Colors.textSecondary} /> {item.estimated_distance?.toFixed(1)} km
        </Text>
        <Text style={styles.detailText}>
          <Ionicons name="time" size={12} color={Colors.textSecondary} /> {Math.round(item.estimated_duration || 0)} min
        </Text>
      </View>

      {/* Action Buttons */}
      {item.status === 'pending' && (
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptRide(item.id)}
        >
          <Ionicons name="checkmark" size={20} color="white" />
          <Text style={styles.acceptButtonText}>Aksepte</Text>
        </TouchableOpacity>
      )}

      {item.status === 'accepted' && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors.secondary }]}
          onPress={() => handleUpdateStatus(item.id, 'arrived')}
        >
          <Ionicons name="location" size={20} color="white" />
          <Text style={styles.actionButtonText}>Mwen Rive</Text>
        </TouchableOpacity>
      )}

      {item.status === 'arrived' && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors.primary }]}
          onPress={() => handleUpdateStatus(item.id, 'started')}
        >
          <Ionicons name="play" size={20} color="white" />
          <Text style={styles.actionButtonText}>Kòmanse Kous</Text>
        </TouchableOpacity>
      )}

      {item.status === 'started' && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors.success }]}
          onPress={() => handleUpdateStatus(item.id, 'completed')}
        >
          <Ionicons name="checkmark-done" size={20} color="white" />
          <Text style={styles.actionButtonText}>Fini Kous</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const filters = [
    { key: 'all', label: 'Tout' },
    { key: 'pending', label: 'Disponib' },
    { key: 'accepted', label: 'Aksepte' },
    { key: 'completed', label: 'Fini' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kous</Text>
      </View>

      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterButton, filter === f.key && styles.filterActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={rides}
        keyExtractor={(item) => item.id}
        renderItem={renderRide}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchRides} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Pa gen kous</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  filterActive: {
    backgroundColor: Colors.secondary,
  },
  filterText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  rideCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Shadows.small,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  rideRoute: {
    gap: 4,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: Colors.border,
    marginLeft: 4,
  },
  rideDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  acceptButton: {
    flexDirection: 'row',
    backgroundColor: Colors.success,
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
  },
});
