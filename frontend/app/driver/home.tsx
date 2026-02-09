import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
  Dimensions,
  Image,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, Shadows } from '../../src/constants/colors';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { driverAPI, profileAPI, rideAPI } from '../../src/services/api';
import { MapView } from '../../src/components/MapViewWrapper';

const { width } = Dimensions.get('window');
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

export default function DriverHome() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [isOnline, setIsOnline] = useState(user?.is_online || false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [pendingRides, setPendingRides] = useState<any[]>([]);
  const [activeRide, setActiveRide] = useState<any | null>(null);

  const mapImageUrl = useMemo(() => {
    const lat = location?.coords.latitude ?? 18.5944;
    const lng = location?.coords.longitude ?? -72.3074;
    if (MAPBOX_TOKEN) {
      return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ff3b30(${lng},${lat})/${lng},${lat},14,0/600x300?access_token=${MAPBOX_TOKEN}`;
    }
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=14&size=600x300&markers=${lat},${lng},red-pushpin`;
  }, [location]);

  const mapRegion = useMemo(
    () => ({
      latitude: location?.coords.latitude ?? 18.5944,
      longitude: location?.coords.longitude ?? -72.3074,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }),
    [location]
  );

  useEffect(() => {
    if (isOnline) {
      startLocationTracking();
    }
  }, [isOnline]);

  useEffect(() => {
    let active = true;
    const fetchRides = async () => {
      if (!isOnline) {
        if (active) {
          setPendingRides([]);
          setActiveRide(null);
        }
        return;
      }
      try {
        const response = await rideAPI.getAll();
        const rides = response.data?.rides || [];
        const activeStatuses = new Set(['accepted', 'arrived', 'started']);
        const currentActive = rides.find((r: any) => activeStatuses.has(r.status));
        const pending = rides.filter((r: any) => r.status === 'pending');
        if (active) {
          setActiveRide(currentActive || null);
          setPendingRides(pending);
        }
      } catch (error) {
        if (active) {
          setPendingRides([]);
          setActiveRide(null);
        }
      }
    };
    fetchRides();
    const timer = setInterval(fetchRides, 12000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isOnline]);

  const openNavigation = (ride: any) => {
    const lat = ride?.pickup_lat;
    const lng = ride?.pickup_lng;
    if (!lat || !lng) {
      Alert.alert('Erè', 'Kowòdone pickup pa disponib.');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erè', 'Pa kapab louvri kat la.');
    });
  };

  const goToCurrentRide = () => {
    router.push('/driver/current-ride');
  };

  const handleAcceptRide = async (ride: any) => {
    try {
      await rideAPI.accept(ride.id);
      const response = await rideAPI.getAll();
      const rides = response.data?.rides || [];
      const activeStatuses = new Set(['accepted', 'arrived', 'started']);
      setActiveRide(rides.find((r: any) => activeStatuses.has(r.status)) || null);
      setPendingRides(rides.filter((r: any) => r.status === 'pending'));
      Alert.alert('Siksè', 'Ou aksepte kous la.');
      openNavigation(ride);
      goToCurrentRide();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Pa kapab aksepte kous';
      if (String(message).includes('active ride')) {
        Alert.alert('Erè', 'Ou gen yon kous ankou. Ale nan kous ou pou kontinye.');
        return;
      }
      Alert.alert('Erè', message);
    }
  };

  const handleCancelRide = async (ride: any) => {
    try {
      await rideAPI.updateStatus(ride.id, 'cancelled', 'cancelled by driver');
      setPendingRides((prev) => prev.filter((r) => r.id !== ride.id));
      const response = await rideAPI.getAll();
      const rides = response.data?.rides || [];
      const activeStatuses = new Set(['accepted', 'arrived', 'started']);
      setActiveRide(rides.find((r: any) => activeStatuses.has(r.status)) || null);
      setPendingRides(rides.filter((r: any) => r.status === 'pending'));
      Alert.alert('Siksè', 'Kous la anile.');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab anile kous');
    }
  };



  useEffect(() => {
    let active = true;
    const refreshProfile = async () => {
      try {
        const response = await profileAPI.get();
        const nextUser = response.data?.user;
        if (!active || !nextUser) return;
        updateUser(nextUser);
        if (nextUser.status && nextUser.status !== 'approved') {
          router.replace('/driver/pending');
        }
      } catch (error) {
        console.error('Profile refresh error:', error);
      }
    };
    refreshProfile();
    const timer = setInterval(refreshProfile, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [router, updateUser]);

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Pèmisyon', 'Nou bezwen aksede lokalizasyon ou');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      // Update location on server
      if (user?.id) {
        await driverAPI.updateLocation(user.id, loc.coords.latitude, loc.coords.longitude);
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;

    if (newStatus && user?.status !== 'approved') {
      Alert.alert(
        'Erè',
        'Kont ou an poko apwouve. Kontakte sèvis sipò si ou panse tan an twòp.'
      );
      return;
    }
    
    try {
      if (user?.id) {
        await driverAPI.updateOnlineStatus(user.id, newStatus);
        setIsOnline(newStatus);
        updateUser({ is_online: newStatus });
        
        if (newStatus) {
          startLocationTracking();
        }
      }
    } catch (error: any) {
      console.error('Toggle status error:', error);
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab chanje stat');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjou, {user?.full_name?.split(' ')[0]}!</Text>
            <Text style={styles.subtitle}>
              {user?.vehicle_type === 'moto' ? 'Moto' : 'Machin'} • {user?.vehicle_brand} {user?.vehicle_model}
            </Text>
          </View>
          <View style={[styles.ratingBadge, isOnline && styles.onlineBadge]}>
            <Ionicons name="star" size={14} color={isOnline ? 'white' : Colors.warning} />
            <Text style={[styles.ratingText, isOnline && { color: 'white' }]}>
              {user?.rating?.toFixed(1) || '5.0'}
            </Text>
          </View>
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, isOnline && styles.statusOnline]}>
          <View style={styles.statusInfo}>
            <View style={[styles.statusDot, isOnline && styles.statusDotOnline]} />
            <Text style={[styles.statusText, isOnline && { color: 'white' }]}>
              {isOnline ? 'Ou ONLINE' : 'Ou OFFLINE'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: Colors.border, true: 'rgba(255,255,255,0.3)' }}
            thumbColor={isOnline ? 'white' : Colors.textSecondary}
          />
        </View>

        {/* Map Placeholder */}
        <View style={styles.mapPlaceholder}>
          {MapView ? (
            <MapView
              style={styles.mapImage}
              region={mapRegion}
              showsUserLocation
              showsMyLocationButton
              loadingEnabled
            />
          ) : (
            <Image source={{ uri: mapImageUrl }} style={styles.mapImage} />
          )}
          <Text style={styles.mapText}>
            {isOnline ? 'Ap tann demann kous...' : 'Ale online pou resevwa kous'}
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="car" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{user?.total_rides || 0}</Text>
            <Text style={styles.statLabel}>Kous Total</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="wallet" size={24} color={Colors.success} />
            <Text style={styles.statValue}>{user?.wallet_balance || 0}</Text>
            <Text style={styles.statLabel}>Balans (HTG)</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color={Colors.warning} />
            <Text style={styles.statValue}>{user?.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Info Card when offline */}
        {!isOnline && (
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={Colors.secondary} />
            <Text style={styles.infoText}>
              Ale ONLINE pou kOmanse resevwa demann kous nan zòn ou.
            </Text>
          </View>
        )}
        
        {/* Active ride */}
        {isOnline && activeRide && (
          <View style={styles.activeRideCard}>
            <View style={styles.rideInfo}>
              <View style={styles.rideTopRow}>
                <Text style={styles.rideTitle}>
                  {activeRide.vehicle_type === 'moto' ? 'Moto' : 'Machin'} • {activeRide.city || '—'}
                </Text>
                <Text style={styles.ridePrice}>{activeRide.estimated_price || 0} HTG</Text>
              </View>
              <Text style={styles.rideMeta}>
                {activeRide.pickup_address} → {activeRide.destination_address}
              </Text>
              <View style={styles.rideMetaRow}>
                <Text style={styles.rideMeta}>
                  {activeRide.estimated_distance || 0} km
                </Text>
                <Text style={styles.rideMeta}>
                  {Math.round(activeRide.estimated_duration || 0)} min
                </Text>
              </View>
              <Text style={styles.passengerText}>
                {activeRide.passenger_name ? `Pasaje: ${activeRide.passenger_name}` : 'Pasaje: —'}
              </Text>
              <Text style={styles.paymentText}>
                Pèman: {activeRide.payment_method || 'cash'}
              </Text>
            </View>
            <View style={styles.rideActions}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={goToCurrentRide}
              >
                <Text style={styles.acceptText}>Ale nan kous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelRide(activeRide)}
              >
                <Text style={styles.cancelText}>Anile</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Pending rides */}
        {isOnline && !activeRide && (
          <View style={styles.ridesSection}>
            <Text style={styles.sectionTitle}>Kous disponib</Text>
            {pendingRides.length === 0 ? (
              <Text style={styles.emptyText}>Pa gen kous pou kounye a.</Text>
            ) : (
              pendingRides.map((ride) => (
                <View key={ride.id} style={styles.rideCard}>
                  <View style={styles.rideInfo}>
                    <View style={styles.rideTopRow}>
                      <Text style={styles.rideTitle}>
                        {ride.vehicle_type === 'moto' ? 'Moto' : 'Machin'} • {ride.city || '—'}
                      </Text>
                      <Text style={styles.ridePrice}>{ride.estimated_price || 0} HTG</Text>
                    </View>
                    <Text style={styles.rideMeta}>
                      {ride.pickup_address} → {ride.destination_address}
                    </Text>
                    <View style={styles.rideMetaRow}>
                      <Text style={styles.rideMeta}>
                        {ride.estimated_distance || 0} km
                      </Text>
                      <Text style={styles.rideMeta}>
                        {Math.round(ride.estimated_duration || 0)} min
                      </Text>
                    </View>
                    <Text style={styles.passengerText}>
                      {ride.passenger_name ? `Pasaje: ${ride.passenger_name}` : 'Pasaje: —'}
                    </Text>
                    <Text style={styles.paymentText}>
                      Pèman: {ride.payment_method || 'cash'}
                    </Text>
                  </View>
                  <View style={styles.rideActions}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptRide(ride)}
                    >
                      <Text style={styles.acceptText}>Aksepte</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancelRide(ride)}
                    >
                      <Text style={styles.cancelText}>Anile</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
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
  content: {
    paddingBottom: 24,
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
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    ...Shadows.small,
  },
  onlineBadge: {
    backgroundColor: Colors.success,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    ...Shadows.small,
  },
  statusOnline: {
    backgroundColor: Colors.success,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.offline,
  },
  statusDotOnline: {
    backgroundColor: 'white',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 200,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mapText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    ...Shadows.small,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...Shadows.small,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Shadows.small,
  },
  ridesSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  rideCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    ...Shadows.small,
  },
  activeRideCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
    ...Shadows.small,
  },
  rideInfo: {
    flex: 1,
    paddingRight: 10,
  },
  rideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  rideTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ridePrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success,
  },
  rideMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  rideMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  passengerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  paymentText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  rideActions: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  acceptText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cancelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
