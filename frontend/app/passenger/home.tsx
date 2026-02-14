import React, { useMemo, useState, useEffect, useRef } from 'react';
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
import { Map, MapRef } from '../../src/components/Map';
import { searchAddress, geocodeAddress } from '../../src/utils/geocoding';

const { width } = Dimensions.get('window');

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
  const [destinationSuggestions, setDestinationSuggestions] = useState<
    Array<{ label: string; lat: number; lng: number }>
  >([]);
  const [pickupSuggestions, setPickupSuggestions] = useState<
    Array<{ label: string; lat: number; lng: number }>
  >([]);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [searchingRide, setSearchingRide] = useState(false);
  const [driverMarker, setDriverMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [driverVehicle, setDriverVehicle] = useState<'moto' | 'car'>('moto');
  const [followUser, setFollowUser] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [scheduledTime, setScheduledTime] = useState(new Date());
  const [paymentMethod, setPaymentMethod] = useState<'cash'>('cash');
  const mapRef = useRef<MapRef | null>(null);
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

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    const startWatch = async () => {
      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => {
            setLocation(loc);
            if (followUser && mapRef.current) {
              mapRef.current.animateToRegion(
                {
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                },
                500
              );
            }
          }
        );
      } catch (error) {
        console.error('Location watch error:', error);
      }
    };
    startWatch();
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [followUser]);

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
        setPickupCoords({ lat, lng });
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
        const lat = location?.coords.latitude;
        const lng = location?.coords.longitude;
        const results = await searchAddress(trimmed, {
          limit: 6,
          proximityLat: lat,
          proximityLng: lng,
        });
        setDestinationSuggestions(results);
      } catch (error) {
        console.error('Autocomplete error:', error);
        setDestinationSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [destination]);

  useEffect(() => {
    if (!searchingRide || !pickupCoords) return undefined;
    let active = true;
    const pollDrivers = async () => {
      try {
        const response = await rideAPI.getNearbyDrivers(
          pickupCoords.lat,
          pickupCoords.lng,
          vehicleType,
          user?.city || 'Port-au-Prince'
        );
        const drivers = response.data.drivers || [];
        if (!active) return;
        if (drivers.length > 0) {
          const driver = drivers[0];
          if (driver.current_lat && driver.current_lng) {
            setDriverMarker({
              latitude: Number(driver.current_lat),
              longitude: Number(driver.current_lng),
            });
            setDriverVehicle(driver.vehicle_type === 'moto' ? 'moto' : 'car');
          }
        }
      } catch (error) {
        console.error('Polling drivers error:', error);
      }
    };
    pollDrivers();
    const timer = setInterval(pollDrivers, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [searchingRide, pickupCoords, vehicleType, user?.city]);

  useEffect(() => {
    const trimmed = pickup.trim();
    if (!showPickupSuggestions || trimmed.length < 2) {
      setPickupSuggestions([]);
      return undefined;
    }

    setIsSearchingPickup(true);
    const timer = setTimeout(async () => {
      try {
        const lat = location?.coords.latitude;
        const lng = location?.coords.longitude;
        const results = await searchAddress(trimmed, {
          limit: 6,
          proximityLat: lat,
          proximityLng: lng,
        });
        setPickupSuggestions(results);
      } catch (error) {
        console.error('Pickup autocomplete error:', error);
        setPickupSuggestions([]);
      } finally {
        setIsSearchingPickup(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [pickup, showPickupSuggestions, location]);

  const mapRegion = useMemo(
    () => ({
      latitude: location?.coords.latitude ?? 18.5944,
      longitude: location?.coords.longitude ?? -72.3074,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }),
    [location]
  );

  const mapMarkers = useMemo(() => {
    const list: Array<{
      id: string;
      latitude: number;
      longitude: number;
      title?: string;
      description?: string;
      pinColor?: string;
      icon?: { type: 'ionicons'; name: 'car' | 'bicycle' };
    }> = [];
    if (pickupCoords) {
      list.push({
        id: 'pickup',
        latitude: pickupCoords.lat,
        longitude: pickupCoords.lng,
        title: 'Pran',
        pinColor: Colors.success,
      });
    }
    if (destinationCoords) {
      list.push({
        id: 'destination',
        latitude: destinationCoords.lat,
        longitude: destinationCoords.lng,
        title: 'Destinasyon',
        pinColor: Colors.primary,
      });
    }
    if (driverMarker) {
      list.push({
        id: 'driver',
        latitude: driverMarker.latitude,
        longitude: driverMarker.longitude,
        title: 'Chofè',
        icon: { type: 'ionicons', name: driverVehicle === 'moto' ? 'bicycle' : 'car' },
      });
    }
    return list;
  }, [pickupCoords, destinationCoords, driverMarker, driverVehicle]);

  const calculateDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const resolveDestinationCoords = async () => {
    if (destinationCoords) return destinationCoords;
    const trimmed = destination.trim();
    if (!trimmed) return null;
    return geocodeAddress(trimmed, {
      proximityLat: location?.coords.latitude,
      proximityLng: location?.coords.longitude,
    });
  };

  const resolvePickupCoords = async () => {
    if (pickupCoords) return pickupCoords;
    const trimmed = pickup.trim();
    if (!trimmed) return null;
    return geocodeAddress(trimmed, {
      proximityLat: location?.coords.latitude,
      proximityLng: location?.coords.longitude,
    });
  };

  const getEstimate = async () => {
    if (!destination) {
      Alert.alert('Erè', 'Tanpri mete destinasyon ou');
      return;
    }
    if (!pickup) {
      Alert.alert('Erè', 'Tanpri mete adrès pickup la');
      return;
    }
    if (!location?.coords) {
      Alert.alert('Erè', 'Nou pa jwenn pozisyon ou ankò.');
      return;
    }
    setLoading(true);
    try {
      const resolvedPickup = await resolvePickupCoords();
      const resolvedDestination = await resolveDestinationCoords();
      if (!resolvedPickup) {
        Alert.alert('Erè', 'Nou pa jwenn adrès pickup la. Chwazi li nan lis la oswa verifye tèks la.');
        return;
      }
      if (!resolvedDestination) {
        Alert.alert('Erè', 'Nou pa jwenn destinasyon an. Chwazi li nan lis la oswa verifye tèks la.');
        return;
      }
      setPickupCoords(resolvedPickup);
      setDestinationCoords(resolvedDestination);

      const distanceKm = calculateDistanceKm(
        resolvedPickup.lat,
        resolvedPickup.lng,
        resolvedDestination.lat,
        resolvedDestination.lng
      );
      const durationMin = Math.max(5, distanceKm * 3);
      setRouteCoords([
        { latitude: resolvedPickup.lat, longitude: resolvedPickup.lng },
        { latitude: resolvedDestination.lat, longitude: resolvedDestination.lng },
      ]);

      const response = await rideAPI.estimate({
        pickup_lat: resolvedPickup.lat,
        pickup_lng: resolvedPickup.lng,
        pickup_address: pickup,
        destination_lat: resolvedDestination.lat,
        destination_lng: resolvedDestination.lng,
        destination_address: destination,
        vehicle_type: vehicleType,
        estimated_distance: distanceKm,
        estimated_duration: durationMin,
        estimated_price: 0,
      });

      setEstimate({
        ...response.data.estimate,
        distance: distanceKm,
        duration: durationMin,
        destination_coords: resolvedDestination,
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
      const resolvedPickup = pickupCoords || (await resolvePickupCoords());
      const pickupLat = resolvedPickup?.lat || location?.coords.latitude || 18.5944;
      const pickupLng = resolvedPickup?.lng || location?.coords.longitude || -72.3074;
      const resolvedDestination =
        estimate?.destination_coords ||
        destinationCoords ||
        (await resolveDestinationCoords());
      if (!resolvedPickup) {
        Alert.alert('Erè', 'Nou pa jwenn adrès pickup la. Chwazi li nan lis la oswa verifye tèks la.');
        return;
      }
      if (!resolvedDestination) {
        Alert.alert('Erè', 'Nou pa jwenn destinasyon an. Chwazi li nan lis la oswa verifye tèks la.');
        return;
      }

      const response = await rideAPI.create({
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        pickup_address: pickup,
        destination_lat: resolvedDestination.lat,
        destination_lng: resolvedDestination.lng,
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
          setSearchingRide(false);
          setDriverMarker(null);
        } else {
          Alert.alert('Siksè', scheduleEnabled ? 'Kous la pwograme.' : 'Demann kous ou voye! N ap chache chofè...');
          setSearchingRide(true);
          setFollowUser(true);
        }
        setEstimate(null);
        setDestination('');
        setRouteCoords([]);
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
          <Map
            ref={mapRef}
            initialRegion={mapRegion}
            markers={mapMarkers}
            route={routeCoords}
            style={styles.mapImage}
            routeStrokeColor={Colors.primary}
            routeStrokeWidth={4}
          />
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
              onFocus={() => setShowPickupSuggestions(true)}
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
              onChangeText={(value) => {
                setDestination(value);
                setDestinationCoords(null);
                setRouteCoords([]);
              }}
              onFocus={() => setShowVehicleSelector(true)}
            />
          </View>
        </View>

        {isSearchingPickup && (
          <View style={styles.searchingBadge}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.searchingText}>Ap chèche...</Text>
          </View>
        )}

        {pickupSuggestions.length > 0 && (
          <View style={styles.suggestions}>
            {pickupSuggestions.map((suggestion) => (
              <TouchableOpacity
                key={`${suggestion.label}-${suggestion.lat}-${suggestion.lng}`}
                style={styles.suggestionItem}
                onPress={() => {
                  setPickup(suggestion.label);
                  setPickupCoords({ lat: suggestion.lat, lng: suggestion.lng });
                  setPickupSuggestions([]);
                  setShowPickupSuggestions(false);
                }}
              >
                <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.suggestionText} numberOfLines={1}>{suggestion.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

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
                key={`${suggestion.label}-${suggestion.lat}-${suggestion.lng}`}
                style={styles.suggestionItem}
                onPress={() => {
                  setDestination(suggestion.label);
                  setDestinationCoords({ lat: suggestion.lat, lng: suggestion.lng });
                  setDestinationSuggestions([]);
                }}
              >
                <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.suggestionText} numberOfLines={1}>{suggestion.label}</Text>
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
    paddingBottom: 28,
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
    ...Shadows.small,
  },
  locationText: {
    fontSize: 13,
    color: Colors.text,
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
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
    ...Shadows.small,
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
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.small,
  },
  vehicleSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  inputsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    ...Shadows.small,
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
    ...Shadows.small,
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
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    ...Shadows.small,
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
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...Shadows.small,
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
    backgroundColor: Colors.surface,
    borderRadius: 20,
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
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    ...Shadows.small,
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
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    ...Shadows.small,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  requestButton: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    ...Shadows.small,
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
