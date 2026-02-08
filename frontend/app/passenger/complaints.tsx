import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Colors, Shadows } from '../../src/constants/colors';
import { complaintsAPI, rideAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

export default function PassengerComplaints() {
  const { user } = useAuthStore();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const response = await rideAPI.getAll();
      const allRides = response.data.rides || [];
      const filtered = user ? allRides.filter((ride: any) => ride.passenger_id === user.id) : [];
      setRides(filtered);
    } catch (error) {
      console.error('Fetch rides error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRide) {
      Alert.alert('Erè', 'Chwazi yon kous');
      return;
    }
    if (!selectedRide.driver_id) {
      Alert.alert('Erè', 'Kous sa a poko gen chofè');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Erè', 'Ekri plent lan');
      return;
    }
    try {
      await complaintsAPI.create({
        target_user_type: 'driver',
        target_user_id: selectedRide.driver_id,
        message: message.trim(),
        ride_id: selectedRide.id,
      });
      Alert.alert('Siksè', 'Plent lan voye');
      setMessage('');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab voye plent');
    }
  };

  const renderRide = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.rideCard, selectedRide?.id === item.id && styles.rideCardActive]}
      onPress={() => setSelectedRide(item)}
    >
      <Text style={styles.rideTitle}>Kous: {String(item.id).slice(0, 8)}</Text>
      <Text style={styles.rideMeta} numberOfLines={1}>
        {item.pickup_address || 'Pickup'} ➜ {item.destination_address || 'Destinasyon'}
      </Text>
      <Text style={styles.rideMeta}>Status: {item.status}</Text>
      <Text style={styles.rideMeta}>Dat: {String(item.created_at || '').slice(0, 10)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Plent</Text>
      </View>

      <FlatList
        data={rides}
        keyExtractor={(item) => item.id}
        renderItem={renderRide}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchRides}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Pa gen kous</Text>
          </View>
        }
      />

      <View style={styles.form}>
        {selectedRide && (
          <Text style={styles.selectedRideText}>
            Kous chwazi: {String(selectedRide.id).slice(0, 8)}
          </Text>
        )}
        <Text style={styles.formLabel}>Ekri plent lan</Text>
        <TextInput
          style={styles.input}
          placeholder="Eksplike problèm nan..."
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Voye plent</Text>
        </TouchableOpacity>
      </View>
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
  listContent: {
    padding: 20,
    gap: 10,
  },
  rideCard: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 12,
    ...Shadows.small,
  },
  rideCardActive: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  rideTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  rideMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  form: {
    padding: 20,
    paddingTop: 0,
  },
  formLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  selectedRideText: {
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 6,
  },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  submitButton: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitText: {
    color: 'white',
    fontWeight: '600',
  },
});
