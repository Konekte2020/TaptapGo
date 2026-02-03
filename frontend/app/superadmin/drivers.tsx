import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { driverAPI } from '../../src/services/api';

export default function SuperAdminDrivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchDrivers();
  }, [filter]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter;
      const response = await driverAPI.getAll({ status });
      setDrivers(response.data.drivers || []);
    } catch (error) {
      console.error('Fetch drivers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (driverId: string) => {
    Alert.alert(
      'Apwouve Chofè',
      'Ou sèten ou vle apwouve chofè sa a?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Wi',
          onPress: async () => {
            try {
              await driverAPI.approve(driverId);
              Alert.alert('Siksè', 'Chofè apwouve!');
              fetchDrivers();
            } catch (error: any) {
              Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab apwouve');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (driverId: string) => {
    Alert.alert(
      'Rejte Chofè',
      'Ou sèten ou vle rejte chofè sa a?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Wi',
          style: 'destructive',
          onPress: async () => {
            try {
              await driverAPI.reject(driverId);
              Alert.alert('Siksè', 'Chofè rejte');
              fetchDrivers();
            } catch (error: any) {
              Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab rejte');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return Colors.success;
      case 'rejected': return Colors.error;
      case 'pending': return Colors.warning;
      default: return Colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Apwouve';
      case 'rejected': return 'Rejte';
      case 'pending': return 'An atant';
      default: return status;
    }
  };

  const renderDriver = ({ item }: { item: any }) => (
    <View style={styles.driverCard}>
      <View style={styles.driverHeader}>
        <View style={styles.driverLeft}>
          {item.profile_photo ? (
            <Image source={{ uri: item.profile_photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.full_name?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{item.full_name}</Text>
            <Text style={styles.driverPhone}>{item.phone}</Text>
            <View style={styles.vehicleInfo}>
              <Ionicons
                name={item.vehicle_type === 'moto' ? 'bicycle' : 'car'}
                size={14}
                color={item.vehicle_type === 'moto' ? Colors.moto : Colors.car}
              />
              <Text style={styles.vehicleText}>
                {item.vehicle_brand} {item.vehicle_model}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.driverDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="location" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{item.city}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="card" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{item.plate_number}</Text>
        </View>
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
          >
            <Ionicons name="close" size={18} color={Colors.error} />
            <Text style={[styles.actionText, { color: Colors.error }]}>Rejte</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item.id)}
          >
            <Ionicons name="checkmark" size={18} color="white" />
            <Text style={[styles.actionText, { color: 'white' }]}>Apwouve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const filters = [
    { key: 'all', label: 'Tout' },
    { key: 'pending', label: 'An atant' },
    { key: 'approved', label: 'Apwouve' },
    { key: 'rejected', label: 'Rejte' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chofè</Text>
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
        data={drivers}
        keyExtractor={(item) => item.id}
        renderItem={renderDriver}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchDrivers} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Pa gen chofè</Text>
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
    backgroundColor: Colors.primary,
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
  driverCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Shadows.small,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  driverLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  driverInfo: {
    marginLeft: 12,
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  driverPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  vehicleText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  driverDetails: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  rejectButton: {
    backgroundColor: Colors.surface,
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
  },
});
