// Page de navigation : ouverture dans Google Maps / Waze (plus de Mapbox).
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { rideAPI } from '../../src/services/api';
import { Map } from '../../src/components/Map';
import { calculateDistanceKm } from '../../src/utils/distance';

const { width, height } = Dimensions.get('window');

function estimateDuration(distanceKm: number): string {
  const hours = distanceKm / 30;
  const minutes = Math.round(hours * 60);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}min`;
}

export default function NavigateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const pickupLat = parseFloat((params.pickupLat as string) || '0');
  const pickupLng = parseFloat((params.pickupLng as string) || '0');
  const destLat = parseFloat((params.destLat as string) || '0');
  const destLng = parseFloat((params.destLng as string) || '0');
  const pickupAddress = (params.pickupAddress as string) || '—';
  const destAddress = (params.destAddress as string) || '—';
  const passengerName = (params.passengerName as string) || 'Pasaje';
  const rideId = params.rideId as string;

  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [arrivedAtPickup, setArrivedAtPickup] = useState(false);
  const [tripStarted, setTripStarted] = useState(false);
  const [routeTrack, setRouteTrack] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    const initLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Erè', 'Permission lokalizasyon refize');
          setLoading(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        const targetLat = tripStarted ? destLat : pickupLat;
        const targetLng = tripStarted ? destLng : pickupLng;
        const dist = calculateDistanceKm(
          location.coords.latitude,
          location.coords.longitude,
          targetLat,
          targetLng
        );
        setDistance(dist);
        setDuration(estimateDuration(dist));
        setLoading(false);

        locationSubscription.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
          (newLocation) => {
            const newCoords = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            };
            setCurrentLocation(newCoords);
            setRouteTrack((prev) => [...prev, newCoords]);
            const targetLat2 = tripStarted ? destLat : pickupLat;
            const targetLng2 = tripStarted ? destLng : pickupLng;
            const newDist = calculateDistanceKm(
              newLocation.coords.latitude,
              newLocation.coords.longitude,
              targetLat2,
              targetLng2
            );
            setDistance(newDist);
            setDuration(estimateDuration(newDist));
            if (!arrivedAtPickup && !tripStarted && newDist < 0.05) setArrivedAtPickup(true);
          }
        );
      } catch (error) {
        console.error('Location error:', error);
        Alert.alert('Erè', 'Pa kapab jwenn lokalizasyon ou');
        setLoading(false);
      }
    };

    initLocation();
    return () => {
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, [tripStarted]);

  const openInMapsApp = (app: 'google' | 'waze') => {
    const targetLat = tripStarted ? destLat : pickupLat;
    const targetLng = tripStarted ? destLng : pickupLng;
    let url = '';
    if (app === 'google') {
      if (Platform.OS === 'ios') {
        url = `comgooglemaps://?daddr=${targetLat},${targetLng}&directionsmode=driving`;
      } else {
        url = `google.navigation:q=${targetLat},${targetLng}`;
      }
    } else {
      url = `waze://?ll=${targetLat},${targetLng}&navigate=yes`;
    }
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) return Linking.openURL(url);
        return Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`);
      })
      .catch(() => Alert.alert('Erè', 'Pa kapab louvri aplikasyon kat la'));
  };

  const handleArrived = async () => {
    try {
      await rideAPI.updateStatus(rideId, 'arrived');
      Alert.alert('Konfime', 'Ou rive kote pasaje a. Kontakte li pou di li ou rive.', [{ text: 'OK' }]);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleStartTrip = async () => {
    Alert.alert('Kòmanse Vwayaj', 'Èske pasaje a monte nan vwati a?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Wi, kòmanse',
        onPress: async () => {
          try {
            await rideAPI.updateStatus(rideId, 'started');
            setTripStarted(true);
            setArrivedAtPickup(false);
            Alert.alert('Siksè', 'Vwayaj la kòmanse. Bon wout!');
          } catch (error) {
            Alert.alert('Erè', 'Pa kapab kòmanse vwayaj la');
          }
        },
      },
    ]);
  };

  const handleCompleteTrip = async () => {
    Alert.alert('Fini Vwayaj', 'Èske ou rive nan destinasyon an?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Wi, fini',
        onPress: async () => {
          try {
            await rideAPI.updateStatus(rideId, 'completed');
            Alert.alert('Siksè!', 'Vwayaj la fini. Bravo!', [
              { text: 'OK', onPress: () => router.replace('/driver/home') },
            ]);
          } catch (error) {
            Alert.alert('Erè', 'Pa kapab fini vwayaj la');
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Anile Kous', 'Èske ou vle anile kous sa a?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Wi, anile',
        style: 'destructive',
        onPress: async () => {
          try {
            await rideAPI.updateStatus(rideId, 'cancelled');
            router.replace('/driver/home');
          } catch (error) {
            Alert.alert('Erè', 'Pa kapab anile kous la');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chaje...</Text>
      </View>
    );
  }

  const mapMarkers = [
    currentLocation && {
      id: 'driver',
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      title: 'Ou',
      description: 'Pozisyon ou',
      icon: { type: 'ionicons' as const, name: 'navigate' },
    },
    (pickupLat !== 0 || pickupLng !== 0) && {
      id: 'pickup',
      latitude: pickupLat,
      longitude: pickupLng,
      title: 'Pran pasaje',
      pinColor: Colors.warning,
    },
    (destLat !== 0 || destLng !== 0) && {
      id: 'destination',
      latitude: destLat,
      longitude: destLng,
      title: 'Destinasyon',
      pinColor: Colors.primary,
    },
  ].filter(Boolean) as Array<{
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
    pinColor?: string;
    icon?: { type: 'ionicons'; name: 'navigate' };
  }>;

  const initialRegion = currentLocation
    ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        latitude: pickupLat || 18.5944,
        longitude: pickupLng || -72.3074,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <Map
          initialRegion={initialRegion}
          markers={mapMarkers}
          route={routeTrack}
          style={StyleSheet.absoluteFill}
          routeStrokeColor={Colors.primary}
          routeStrokeWidth={4}
        />
      </View>

      <TouchableOpacity style={styles.openMapsFloating} onPress={() => openInMapsApp('google')}>
        <Ionicons name="navigate-circle" size={20} color="#FFF" />
        <Text style={styles.openMapsButtonText}>Google Maps</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>

      <View style={styles.infoPanel}>
        <View style={styles.statusBar}>
          <View style={[styles.statusDot, { backgroundColor: tripStarted ? '#4CAF50' : '#FFC107' }]} />
          <Text style={styles.statusText}>
            {tripStarted ? '🚗 An wout pou destinasyon' : '📍 An wout pou pran pasaje'}
          </Text>
        </View>
        <View style={styles.distanceCard}>
          <View style={styles.distanceRow}>
            <Ionicons name="navigate" size={24} color={Colors.primary} />
            <View style={styles.distanceInfo}>
              <Text style={styles.distanceText}>{distance != null ? `${distance.toFixed(1)} km` : '---'}</Text>
              <Text style={styles.durationText}>{duration || '---'}</Text>
            </View>
          </View>
        </View>
        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>{tripStarted ? '🔴 Ale nan:' : '🟢 Ale pran:'}</Text>
          <Text style={styles.addressText}>{tripStarted ? destAddress : pickupAddress}</Text>
          {!tripStarted && <Text style={styles.passengerName}>Pasaje: {passengerName}</Text>}
        </View>
        <View style={styles.mapButtonsRow}>
          <TouchableOpacity style={[styles.mapButton, styles.googleMapsBtn]} onPress={() => openInMapsApp('google')}>
            <Ionicons name="navigate-circle" size={20} color="#FFF" />
            <Text style={styles.mapButtonText}>Google Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mapButton, styles.wazeBtn]} onPress={() => openInMapsApp('waze')}>
            <Ionicons name="navigate" size={20} color="#FFF" />
            <Text style={styles.mapButtonText}>Waze</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionButtons}>
          {!tripStarted && !arrivedAtPickup && (
            <TouchableOpacity style={[styles.actionBtn, styles.arrivedBtn]} onPress={handleArrived}>
              <Text style={styles.actionBtnText}>✓ Mwen Rive</Text>
            </TouchableOpacity>
          )}
          {!tripStarted && arrivedAtPickup && (
            <TouchableOpacity style={[styles.actionBtn, styles.startBtn]} onPress={handleStartTrip}>
              <Text style={styles.actionBtnText}>▶ Kòmanse Vwayaj</Text>
            </TouchableOpacity>
          )}
          {tripStarted && (
            <TouchableOpacity style={[styles.actionBtn, styles.completeBtn]} onPress={handleCompleteTrip}>
              <Text style={styles.actionBtnText}>🏁 Fini Vwayaj</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={handleCancel}>
            <Text style={[styles.actionBtnText, { color: Colors.text }]}>✕ Anile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  mapContainer: {
    flex: 1,
  },
  openMapsFloating: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
    ...Shadows.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: { marginTop: 16, fontSize: 16, color: Colors.textSecondary },
  openMapsButtonText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#FFF',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    ...Shadows.large,
  },
  statusBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  statusText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  distanceCard: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, marginBottom: 12 },
  distanceRow: { flexDirection: 'row', alignItems: 'center' },
  distanceInfo: { marginLeft: 12 },
  distanceText: { fontSize: 24, fontWeight: '700', color: Colors.text },
  durationText: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  addressCard: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, marginBottom: 16 },
  addressLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6, fontWeight: '600' },
  addressText: { fontSize: 15, color: Colors.text, lineHeight: 20 },
  passengerName: { fontSize: 14, color: Colors.primary, marginTop: 8, fontWeight: '600' },
  mapButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  googleMapsBtn: { backgroundColor: '#4285F4' },
  wazeBtn: { backgroundColor: '#33CCFF' },
  mapButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivedBtn: { backgroundColor: '#FFC107' },
  startBtn: { backgroundColor: Colors.primary },
  completeBtn: { backgroundColor: '#4CAF50' },
  cancelBtn: { backgroundColor: '#E9ECEF', flex: 0.5 },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
