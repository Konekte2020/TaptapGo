import React, { useMemo, useState, useEffect } from 'react';
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
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Calendar } from 'react-native-calendars';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { rideAPI, cityAPI } from '../../src/services/api';

const { width } = Dimensions.get('window');
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

const pad2 = (value: number) => value.toString().padStart(2, '0');
const formatDate = (value: Date) => `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
const formatTime = (value: Date) => `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
const combineDateTimeIso = (datePart: Date, timePart: Date) => {
  const combined = new Date(
    datePart.getFullYear(),
    datePart.getMonth(),
    datePart.getDate(),
    timePart.getHours(),
    timePart.getMinutes(),
    0
  );
  return combined.toISOString();
};

export default function PassengerHome() {
  const { user } = useAuthStore();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [vehicleType, setVehicleType] = useState<'moto' | 'car'>('moto');
  const [destination, setDestination] = useState('');
  const [pickup, setPickup] = useState('Pozisyon mwen');
  const [estimate, setEstimate] = useState<any>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([]);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [scheduledTime, setScheduledTime] = useState(new Date());
  const [paymentMethod, setPaymentMethod] = useState<'cash'>('cash');
  const timeOptions = useMemo(() => {
    const options: string[] = [];
    for (let hour = 6; hour <= 22; hour += 1) {
      for (const minute of [0, 30]) {
        options.push(`${pad2(hour)}:${pad2(minute)}`);
      }
    }
    return options;
  }, []);

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
      await setPickupFromCoords(loc.coords.latitude, loc.coords.longitude);
      fetchNearbyDrivers(loc.coords.latitude, loc.coords.longitude);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const setPickupFromCoords = async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const place = results[0];
        const parts = [
          place.name,
          place.street,
          place.city,
          place.region,
        ].filter(Boolean);
        setPickup(parts.join(', ') || 'Pozisyon mwen');
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
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

  useEffect(() => {
    const trimmed = destination.trim();
    if (trimmed.length < 2) {
      setDestinationSuggestions([]);
      return undefined;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        if (!MAPBOX_TOKEN) {
          setDestinationSuggestions([]);
          return;
        }
        const lat = location?.coords.latitude;
        const lng = location?.coords.longitude;
        const proximity = lat && lng ? `&proximity=${lng},${lat}` : '';
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?access_token=${MAPBOX_TOKEN}&country=ht&limit=6&types=address,place,locality,neighborhood${proximity}`;
        const response = await fetch(url);
        const data = await response.json();
        const suggestions = (data?.features || []).map((item: any) => item.place_name as string);
        setDestinationSuggestions(suggestions);
      } catch (error) {
        console.error('Autocomplete error:', error);
        setDestinationSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [destination]);

  const mapImageUrl = useMemo(() => {
    const lat = location?.coords.latitude ?? 18.5944;
    const lng = location?.coords.longitude ?? -72.3074;
    if (MAPBOX_TOKEN) {
      return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ff3b30(${lng},${lat})/${lng},${lat},14,0/600x300?access_token=${MAPBOX_TOKEN}`;
    }
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=14&size=600x300&markers=${lat},${lng},red-pushpin`;
  }, [location]);

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
    if (scheduleEnabled) {
      if (!scheduledDate || !scheduledTime) {
        Alert.alert('Erè', 'Tanpri mete dat ak lè kous la');
        return;
      }
    }

    setLoading(true);
    try {
      const scheduledAt = scheduleEnabled ? combineDateTimeIso(scheduledDate, scheduledTime) : undefined;
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
        scheduled_at: scheduledAt,
        payment_method: paymentMethod,
      });

      if (response.data.success) {
        const assigned = response.data.assigned_driver;
        if (assigned) {
          const eta = response.data.eta_minutes ? `${response.data.eta_minutes} min` : 'Byen vit';
          const contactCode = response.data.contact_code ? `Kòd apèl: ${response.data.contact_code}` : '';
          Alert.alert(
            'Chofè jwenn',
            `${assigned.full_name} ap rive nan ${eta}.\n` +
              `Veyikil: ${assigned.vehicle_brand} ${assigned.vehicle_model} (Koulè: ${assigned.vehicle_color}).\n` +
              contactCode
          );
        } else {
          Alert.alert('Siksè', scheduleEnabled ? 'Kous la pwograme.' : 'Demann kous ou voye! N ap chache chofè...');
        }
        setEstimate(null);
        setDestination('');
        setScheduleEnabled(false);
        setScheduledDate(new Date());
        setScheduledTime(new Date());
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

        {/* Map */}
        <View style={styles.mapPlaceholder}>
          <Image source={{ uri: mapImageUrl }} style={styles.mapImage} />
          {nearbyDrivers.length > 0 && (
            <View style={styles.driversCount}>
              <Ionicons name="car" size={16} color="white" />
              <Text style={styles.driversText}>{nearbyDrivers.length} chofè disponib</Text>
            </View>
          )}
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
              onFocus={() => setShowVehicleSelector(true)}
            />
          </View>
        </View>

        {isSearching && (
          <View style={styles.searchingBadge}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.searchingText}>Ap chèche...</Text>
          </View>
        )}

        {destinationSuggestions.length > 0 && (
          <View style={styles.suggestions}>
            {destinationSuggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                style={styles.suggestionItem}
                onPress={() => {
                  setDestination(suggestion);
                  setDestinationSuggestions([]);
                }}
              >
                <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.suggestionText} numberOfLines={1}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTitle}>Pwograme kous</Text>
            <Switch value={scheduleEnabled} onValueChange={setScheduleEnabled} />
          </View>
          {scheduleEnabled && (
            <View style={styles.scheduleInputs}>
              <View style={styles.calendarContainer}>
                <Calendar
                  current={formatDate(scheduledDate)}
                  minDate={formatDate(new Date())}
                  onDayPress={(day) => {
                    setScheduledDate(new Date(day.dateString));
                  }}
                  markedDates={{
                    [formatDate(scheduledDate)]: { selected: true, selectedColor: Colors.primary },
                  }}
                  theme={{
                    todayTextColor: Colors.primary,
                    arrowColor: Colors.primary,
                    selectedDayBackgroundColor: Colors.primary,
                  }}
                />
              </View>
              <View style={styles.timePickerContainer}>
                <Text style={styles.timeLabel}>Lè</Text>
                <View style={styles.timeOptions}>
                  {timeOptions.map((option) => {
                    const isSelected = option === formatTime(scheduledTime);
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.timeChip, isSelected && styles.timeChipActive]}
                        onPress={() => {
                          const [h, m] = option.split(':').map((value) => Number(value));
                          const next = new Date(scheduledTime);
                          next.setHours(h);
                          next.setMinutes(m);
                          next.setSeconds(0);
                          setScheduledTime(next);
                        }}
                      >
                        <Text style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Vehicle Type Selection */}
        {showVehicleSelector && (
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
        )}

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

            <View style={styles.paymentSection}>
              <Text style={styles.paymentTitle}>Mwayen Peman</Text>
              <TouchableOpacity
                style={[styles.paymentOption, paymentMethod === 'cash' && styles.paymentOptionActive]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Ionicons name="cash" size={18} color={paymentMethod === 'cash' ? 'white' : Colors.text} />
                <Text style={[styles.paymentText, paymentMethod === 'cash' && styles.paymentTextActive]}>
                  Lajan Kontan
                </Text>
              </TouchableOpacity>
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
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  searchingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  searchingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  suggestions: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 6,
    marginBottom: 20,
    ...Shadows.small,
  },
  scheduleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  scheduleInputs: {
    marginTop: 10,
    gap: 8,
  },
  scheduleInputButton: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleInputText: {
    fontSize: 14,
    color: Colors.text,
  },
  timePickerContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    ...Shadows.small,
  },
  timeLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  calendarContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    ...Shadows.small,
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  timeChipActive: {
    backgroundColor: Colors.primary,
  },
  timeChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  timeChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
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
  paymentSection: {
    marginTop: 16,
    gap: 10,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
  },
  paymentOptionActive: {
    backgroundColor: Colors.primary,
  },
  paymentText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentTextActive: {
    color: 'white',
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
