import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
  Image,
  ScrollView,
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
  const [todayStats, setTodayStats] = useState({ revenue: 0, ridesCount: 0 });

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

  useEffect(() => {
    let active = true;
    const fetchTodayStats = async () => {
      try {
        const response = await rideAPI.getAll('completed');
        const rides = response.data?.rides || [];
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let revenue = 0;
        let count = 0;
        rides.forEach((ride: any) => {
          const rideDate = new Date(ride.completed_at || ride.created_at);
          if (rideDate >= todayStart) {
            count += 1;
            revenue += ride.final_price || ride.estimated_price || 0;
          }
        });
        if (active) setTodayStats({ revenue, ridesCount: count });
      } catch (error) {
        if (active) setTodayStats({ revenue: 0, ridesCount: 0 });
      }
    };
    fetchTodayStats();
    const t = setInterval(fetchTodayStats, 60000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const goToCurrentRide = () => router.push('/driver/current-ride');

  const handleAcceptRide = async (ride: any) => {
    try {
      await rideAPI.accept(ride.id);
      const response = await rideAPI.getAll();
      const rides = response.data?.rides || [];
      const activeStatuses = new Set(['accepted', 'arrived', 'started']);
      setActiveRide(rides.find((r: any) => activeStatuses.has(r.status)) || null);
      setPendingRides(rides.filter((r: any) => r.status === 'pending'));
      Alert.alert('Siksè', 'Ou aksepte kous la.');
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
        if (newStatus) startLocationTracking();
      }
    } catch (error: any) {
      console.error('Toggle status error:', error);
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab chanje stat');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header: Logo TapTapGo + statut An liy */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>TapTapGo</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, isOnline && styles.statusDotOnline]} />
            <Text style={styles.statusLabel}>{isOnline ? 'An liy' : 'Offline'}</Text>
          </View>
        </View>

        {/* Bouton principal: Kòmanse travay */}
        <TouchableOpacity
          style={styles.mainButton}
          onPress={toggleOnlineStatus}
          activeOpacity={0.85}
        >
          <Text style={styles.mainButtonText}>
            {isOnline ? 'Sispann travay' : 'Kòmanse travay'}
          </Text>
        </TouchableOpacity>

        {/* Carte */}
        <View style={styles.mapWrapper}>
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
          <View style={styles.mapWatermark}>
            <Text style={styles.mapWatermarkText}>Google</Text>
          </View>
        </View>

        {/* Deux cartes bleues */}
        <View style={styles.blueCardsRow}>
          <View style={styles.blueCard}>
            <Ionicons name="location" size={22} color="#fff" />
            <Text style={styles.blueCardLabel}>Kote ou ye</Text>
          </View>
          <View style={styles.blueCard}>
            <Ionicons name="time" size={22} color="#fff" />
            <Text style={styles.blueCardLabel}>Tan reyèl</Text>
          </View>
        </View>

        {/* Trois cartes blanches: Revni, Kous, Evalyasyon */}
        <View style={styles.whiteCardsRow}>
          <View style={styles.whiteCard}>
            <Text style={styles.whiteCardLabel}>Revni jodi a:</Text>
            <Text style={styles.whiteCardValue}>{todayStats.revenue} HTG</Text>
          </View>
          <View style={styles.whiteCard}>
            <Text style={styles.whiteCardLabel}>Kous jodi a:</Text>
            <Text style={styles.whiteCardValue}>{todayStats.ridesCount}</Text>
          </View>
          <View style={styles.whiteCard}>
            <Text style={styles.whiteCardLabel}>Evalyasyon:</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.whiteCardValue}>{user?.rating?.toFixed(1) || '4.9'}</Text>
              <Ionicons name="star" size={20} color="#1A1F2B" />
            </View>
          </View>
        </View>

        {/* Carte kous aktif */}
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
              <Text style={styles.passengerText}>
                {activeRide.passenger_name ? `Pasaje: ${activeRide.passenger_name}` : 'Pasaje: —'}
              </Text>
            </View>
            <View style={styles.rideActions}>
              <TouchableOpacity style={styles.acceptButton} onPress={goToCurrentRide}>
                <Text style={styles.acceptText}>Ale nan kous</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelRide(activeRide)}>
                <Text style={styles.cancelText}>Anile</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Kous disponib */}
        {isOnline && !activeRide && pendingRides.length > 0 && (
          <View style={styles.ridesSection}>
            <Text style={styles.sectionTitle}>Kous disponib</Text>
            {pendingRides.map((ride) => (
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
                </View>
                <View style={styles.rideActions}>
                  <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptRide(ride)}>
                    <Text style={styles.acceptText}>Aksepte</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelRide(ride)}>
                    <Text style={styles.cancelText}>Anile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.offline,
  },
  statusDotOnline: {
    backgroundColor: Colors.success,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  mainButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Shadows.small,
  },
  mainButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapWrapper: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: Colors.surface,
    ...Shadows.medium,
  },
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mapWatermark: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  mapWatermarkText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  blueCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  blueCard: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Shadows.small,
  },
  blueCardLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  whiteCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  whiteCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    ...Shadows.small,
  },
  whiteCardLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  whiteCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ridesSection: {
    marginTop: 4,
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
  passengerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
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
});
