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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { driverAPI } from '../../src/services/api';

const { width } = Dimensions.get('window');
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

export default function DriverHome() {
  const { user, updateUser } = useAuthStore();
  const [isOnline, setIsOnline] = useState(user?.is_online || false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [pendingRides, setPendingRides] = useState<any[]>([]);

  const mapImageUrl = useMemo(() => {
    const lat = location?.coords.latitude ?? 18.5944;
    const lng = location?.coords.longitude ?? -72.3074;
    if (MAPBOX_TOKEN) {
      return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ff3b30(${lng},${lat})/${lng},${lat},14,0/600x300?access_token=${MAPBOX_TOKEN}`;
    }
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=14&size=600x300&markers=${lat},${lng},red-pushpin`;
  }, [location]);

  useEffect(() => {
    if (isOnline) {
      startLocationTracking();
    }
  }, [isOnline]);

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
      <View style={styles.content}>
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
          <Image source={{ uri: mapImageUrl }} style={styles.mapImage} />
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
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
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 200,
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mapText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
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
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
