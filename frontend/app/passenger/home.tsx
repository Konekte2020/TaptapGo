import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { rideAPI, cityAPI } from '../../src/services/api';

const { width } = Dimensions.get('window');

export default function PassengerHome() {
  const { user } = useAuthStore();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [vehicleType, setVehicleType] = useState<'moto' | 'car'>('moto');
  const [destination, setDestination] = useState('');
  const [pickup, setPickup] = useState('Pozisyon mwen');
  const [estimate, setEstimate] = useState<any>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Pèmisyon', 'Nou bezwen aksede lokalizasyon ou');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      fetchNearbyDrivers(loc.coords.latitude, loc.coords.longitude);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const fetchNearbyDrivers = async (lat: number, lng: number) => {
    try {
      const response = await rideAPI.getNearbyDrivers(lat, lng, vehicleType, user?.city || 'Port-au-Prince');
      setNearbyDrivers(response.data.drivers || []);
    } catch (error) {
      console.error('Fetch drivers error:', error);
    }
  };

  const getEstimate = async () => {
    if (!destination) {
      Alert.alert('Erè', 'Tanpri mete destinasyon ou');
      return;
    }

    setLoading(true);
    try {
      // Mock distance and duration for demo
      const mockDistance = Math.random() * 10 + 2; // 2-12 km
      const mockDuration = mockDistance * 3; // ~3 min per km

      const response = await rideAPI.estimate({
        pickup_lat: location?.coords.latitude || 18.5944,
        pickup_lng: location?.coords.longitude || -72.3074,
        pickup_address: pickup,
        destination_lat: 18.5944 + (Math.random() * 0.05),
        destination_lng: -72.3074 + (Math.random() * 0.05),
        destination_address: destination,
        vehicle_type: vehicleType,
        estimated_distance: mockDistance,
        estimated_duration: mockDuration,
        estimated_price: 0,
      });

      setEstimate({
        ...response.data.estimate,
        distance: mockDistance,
        duration: mockDuration,
      });
    } catch (error) {
      console.error('Estimate error:', error);
      Alert.alert('Erè', 'Pa kapab kalkile pri a');
    } finally {
      setLoading(false);
    }
  };

  const requestRide = async () => {
    if (!estimate) return;

    setLoading(true);
    try {
      const response = await rideAPI.create({
        pickup_lat: location?.coords.latitude || 18.5944,
        pickup_lng: location?.coords.longitude || -72.3074,
        pickup_address: pickup,
        destination_lat: 18.5944 + (Math.random() * 0.05),
        destination_lng: -72.3074 + (Math.random() * 0.05),
        destination_address: destination,
        vehicle_type: vehicleType,
        estimated_distance: estimate.distance,
        estimated_duration: estimate.duration,
        estimated_price: estimate.total,
      });

      if (response.data.success) {
        Alert.alert('Siksè', 'Demann kous ou voye! N ap chache chofè...');
        setEstimate(null);
        setDestination('');
      }
    } catch (error: any) {
      console.error('Request ride error:', error);
      Alert.alert('Erè', error.response?.data?.detail || 'Demann echwe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjou, {user?.full_name?.split(' ')[0]}!</Text>
            <Text style={styles.subtitle}>Ki kote ou vle ale?</Text>
          </View>
          <View style={styles.locationBadge}>
            <Ionicons name="location" size={16} color={Colors.primary} />
            <Text style={styles.locationText}>{user?.city}</Text>
          </View>
        </View>

        {/* Map Placeholder */}
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={60} color={Colors.textSecondary} />
          <Text style={styles.mapText}>Kat la ap chaje...</Text>
          {nearbyDrivers.length > 0 && (
            <View style={styles.driversCount}>
              <Ionicons name="car" size={16} color="white" />
              <Text style={styles.driversText}>{nearbyDrivers.length} chofè disponib</Text>
            </View>
          )}
        </View>

        {/* Vehicle Type Selection */}
        <View style={styles.vehicleSelector}>
          <TouchableOpacity
            style={[styles.vehicleOption, vehicleType === 'moto' && styles.vehicleSelected]}
            onPress={() => setVehicleType('moto')}
          >
            <Ionicons
              name="bicycle"
              size={28}
              color={vehicleType === 'moto' ? Colors.moto : Colors.textSecondary}
            />
            <Text style={[styles.vehicleText, vehicleType === 'moto' && { color: Colors.moto }]}>
              Moto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.vehicleOption, vehicleType === 'car' && styles.vehicleSelected]}
            onPress={() => setVehicleType('car')}
          >
            <Ionicons
              name="car"
              size={28}
              color={vehicleType === 'car' ? Colors.car : Colors.textSecondary}
            />
            <Text style={[styles.vehicleText, vehicleType === 'car' && { color: Colors.car }]}>
              Machin
            </Text>
          </TouchableOpacity>
        </View>

        {/* Location Inputs */}
        <View style={styles.inputsContainer}>
          <View style={styles.inputRow}>
            <View style={styles.inputDot}>
              <View style={[styles.dot, { backgroundColor: Colors.success }]} />
            </View>
            <TextInput
              style={styles.locationInput}
              placeholder="Pickup"
              value={pickup}
              onChangeText={setPickup}
            />
          </View>

          <View style={styles.inputDivider} />

          <View style={styles.inputRow}>
            <View style={styles.inputDot}>
              <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
            </View>
            <TextInput
              style={styles.locationInput}
              placeholder="Ki kote ou vle ale?"
              value={destination}
              onChangeText={setDestination}
            />
          </View>
        </View>

        {/* Estimate Button */}
        {!estimate && (
          <TouchableOpacity
            style={[styles.estimateButton, loading && styles.disabledButton]}
            onPress={getEstimate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="calculator" size={20} color="white" />
                <Text style={styles.estimateButtonText}>Wè Pri</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Price Estimate Card */}
        {estimate && (
          <View style={styles.estimateCard}>
            <Text style={styles.estimateTitle}>Estimasyon Kous</Text>
            
            <View style={styles.estimateDetails}>
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Distans</Text>
                <Text style={styles.estimateValue}>{estimate.distance?.toFixed(1)} km</Text>
              </View>
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Tan</Text>
                <Text style={styles.estimateValue}>{Math.round(estimate.duration)} min</Text>
              </View>
              <View style={styles.estimateDivider} />
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Frè baz</Text>
                <Text style={styles.estimateValue}>{estimate.base_fare} HTG</Text>
              </View>
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Distans</Text>
                <Text style={styles.estimateValue}>{estimate.distance_fare?.toFixed(0)} HTG</Text>
              </View>
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Tan</Text>
                <Text style={styles.estimateValue}>{estimate.time_fare?.toFixed(0)} HTG</Text>
              </View>
              {estimate.surge_multiplier > 1 && (
                <View style={styles.estimateRow}>
                  <Text style={[styles.estimateLabel, { color: Colors.warning }]}>Multiplikatè</Text>
                  <Text style={[styles.estimateValue, { color: Colors.warning }]}>x{estimate.surge_multiplier}</Text>
                </View>
              )}
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{Math.round(estimate.total)} HTG</Text>
            </View>

            <View style={styles.estimateActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEstimate(null)}
              >
                <Text style={styles.cancelButtonText}>Anile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.requestButton, loading && styles.disabledButton]}
                onPress={requestRide}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.requestButtonText}>Mande Kous</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: Colors.text,
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  mapText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  driversCount: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  driversText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  vehicleSelector: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  vehicleOption: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  vehicleSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  inputsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputDot: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  locationInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 12,
  },
  inputDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 36,
    marginVertical: 4,
  },
  estimateButton: {
    backgroundColor: Colors.secondary,
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  estimateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  estimateCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    ...Shadows.medium,
  },
  estimateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  estimateDetails: {
    gap: 8,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  estimateLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  estimateValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  estimateDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  estimateActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  requestButton: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
