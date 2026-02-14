import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../store/authStore';
import { useDriverSettingsStore } from '../store/driverSettingsStore';
import { rideAPI } from '../services/api';
import { Colors, Shadows } from '../constants/colors';
import { NOTIFICATION_SOUNDS } from '../constants/notificationSounds';

let Audio: { setAudioModeAsync: (opts: object) => Promise<void>; Sound: { createAsync: (src: object, opts?: object) => Promise<{ sound: { playAsync: () => Promise<void>; unloadAsync: () => Promise<void> } }> } } | null = null;
try {
  const av = require('expo-av');
  Audio = av.Audio;
} catch {
  // expo-av optionnel
}

const POLL_INTERVAL_MS = 3000;

export function DriverRideAlert() {
  const router = useRouter();
  const { user } = useAuthStore();
  const rideSoundEnabled = useDriverSettingsStore((s) => s.rideSoundEnabled);
  const rideSoundIndex = useDriverSettingsStore((s) => s.rideSoundIndex);
  const vibrationEnabled = useDriverSettingsStore((s) => s.vibrationEnabled);
  const loadSettings = useDriverSettingsStore((s) => s.load);
  const [modalRide, setModalRide] = useState<any | null>(null);
  const [accepting, setAccepting] = useState(false);
  const seenPendingIds = useRef<Set<string>>(new Set());
  const soundRef = useRef<{ unloadAsync: () => Promise<void> } | null>(null);
  const isDriverOnline = user?.user_type === 'driver' && user?.is_online === true;

  useEffect(() => {
    if (user?.user_type === 'driver') loadSettings();
  }, [user?.user_type, loadSettings]);

  const playNotificationSound = async () => {
    if (!rideSoundEnabled) return;
    const option = NOTIFICATION_SOUNDS[Math.max(0, Math.min(rideSoundIndex, NOTIFICATION_SOUNDS.length - 1))];
    const source = option?.source;
    if (!Audio || source == null) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentMode: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      try {
        const playOne = async () => {
          if (!Audio) return;
          const { sound } = await Audio.Sound.createAsync(source as unknown as object, { shouldPlay: true });
          soundRef.current = sound;
          await sound.playAsync();
        };
        await playOne();
        setTimeout(() => playOne().catch(() => {}), 700);
        setTimeout(() => playOne().catch(() => {}), 1400);
      } catch (e) {
        console.warn('DriverRideAlert: could not play sound', e);
      }
    } catch (e) {
      console.warn('DriverRideAlert: could not play sound', e);
    }
  };

  useEffect(() => {
    if (!isDriverOnline) {
      setModalRide(null);
      return;
    }

    let active = true;
    const fetchRides = async () => {
      try {
        const res = await rideAPI.getAll();
        const rides = (res.data?.rides || []) as any[];
        const pending = rides.filter((r: any) => r.status === 'pending' && !r.driver_id);
        const pendingIds = new Set(pending.map((r: any) => r.id));

        if (!active) return;

        // Si un popup est ouvert et que cette course a été prise par un autre chauffeur → fermer et prévenir
        setModalRide((current: any) => {
          if (current && !pendingIds.has(current.id)) {
            setTimeout(() => {
              Alert.alert('Kous pran', 'Yon lòt chofè te aksepte kous sa a.');
            }, 100);
            return null;
          }
          return current;
        });

        if (seenPendingIds.current.size === 0) {
          pendingIds.forEach((id) => seenPendingIds.current.add(id));
          return;
        }

        const newRides = pending.filter((r: any) => !seenPendingIds.current.has(r.id));
        if (newRides.length > 0) {
          newRides.forEach((r: any) => seenPendingIds.current.add(r.id));
          setModalRide(newRides[0]);
          if (vibrationEnabled) {
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (_) {}
          }
          playNotificationSound();
        }
      } catch (err) {
        console.warn('DriverRideAlert fetch error', err);
      }
    };

    fetchRides();
    const timer = setInterval(fetchRides, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [isDriverOnline]);

  const closeModal = () => setModalRide(null);

  const handleAccept = async () => {
    if (!modalRide || accepting) return;
    setAccepting(true);
    try {
      await rideAPI.accept(modalRide.id);
      closeModal();
      const ride = modalRide;
      const lat = ride.pickup_lat ?? 0;
      const lng = ride.pickup_lng ?? 0;
      router.replace({
        pathname: '/driver/navigate',
        params: {
          pickupLat: String(lat),
          pickupLng: String(lng),
          destLat: String(ride.destination_lat ?? 0),
          destLng: String(ride.destination_lng ?? 0),
          pickupAddress: ride.pickup_address || '',
          destAddress: ride.destination_address || '',
          passengerName: ride.passenger_name || 'Pasaje',
          rideId: ride.id,
          openGps: '1',
        },
      });
      if (lat && lng) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        Linking.openURL(url).catch(() => {});
      }
      Alert.alert('Siksè', 'Ou aksepte kous la. GPS la ap ouvri.');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Pa kapab aksepte kous';
      if (String(msg).includes('active ride')) {
        Alert.alert('Erè', 'Ou gen yon kous ankou. Ale nan kous ou pou kontinye.');
      } else {
        Alert.alert('Erè', msg);
      }
    } finally {
      setAccepting(false);
    }
  };

  const handleDismiss = () => closeModal();

  if (!modalRide) return null;

  const hasCoords = modalRide.pickup_lat != null && modalRide.pickup_lng != null;
  const mapUri = hasCoords
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${modalRide.pickup_lat},${modalRide.pickup_lng}&zoom=14&size=400x180&markers=${modalRide.pickup_lat},${modalRide.pickup_lng},red-pushpin`
    : null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Nouvelle demande de course</Text>
          {mapUri && (
            <View style={styles.mapContainer}>
              <Image source={{ uri: mapUri }} style={styles.map} resizeMode="cover" />
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Tip:</Text>
            <Text style={styles.value}>
              {modalRide.vehicle_type === 'moto' ? 'Moto' : 'Machin'} • {modalRide.city || '—'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pri:</Text>
            <Text style={styles.price}>{modalRide.estimated_price || 0} HTG</Text>
          </View>
          <Text style={styles.label}>Kote pou pran:</Text>
          <Text style={styles.address}>{modalRide.pickup_address || '—'}</Text>
          <Text style={styles.label}>Destinasyon:</Text>
          <Text style={styles.address}>{modalRide.destination_address || '—'}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.acceptBtn]}
              onPress={handleAccept}
              disabled={accepting}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              {accepting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.acceptBtnText}>Aksepte</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.dismissBtn]}
              onPress={handleDismiss}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Text style={styles.dismissBtnText}>Fèmen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    ...Shadows.large,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  mapContainer: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  map: {
    width: '100%',
    height: 160,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  address: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
  },
  acceptBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  dismissBtn: {
    backgroundColor: Colors.border,
  },
  dismissBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});
