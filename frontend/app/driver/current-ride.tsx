import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { rideAPI } from '../../src/services/api';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

const USSD_CODES: Record<string, string> = {
  moncash: '*202#',
  natcash: '*777#',
};

export default function DriverCurrentRide() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [ride, setRide] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [completionVisible, setCompletionVisible] = useState(false);
  const [completionInfo, setCompletionInfo] = useState<{ price: number; method: string } | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const activeStatuses = useMemo(() => new Set(['accepted', 'arrived', 'started']), []);

  useEffect(() => {
    let active = true;
    const fetchActive = async () => {
      try {
        const response = await rideAPI.getAll();
        const rides = response.data?.rides || [];
        const current = rides.find((r: any) => activeStatuses.has(r.status));
        if (active) {
          setRide(current || null);
          setLoading(false);
          if (!current) setPaymentConfirmed(false);
        }
      } catch (error) {
        if (active) {
          setRide(null);
          setLoading(false);
        }
      }
    };
    fetchActive();
    const timer = setInterval(fetchActive, 12000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [activeStatuses]);

  const getPaymentPhone = (method: string) => {
    if (method === 'moncash') return user?.moncash_phone;
    if (method === 'natcash') return user?.natcash_phone;
    return undefined;
  };

  const openUssd = (method: string) => {
    const code = USSD_CODES[method] || '';
    if (!code) {
      Alert.alert('Erè', 'Kòd USSD pa disponib.');
      return;
    }
    Linking.openURL(`tel:${encodeURIComponent(code)}`).catch(() => {
      Alert.alert('Erè', 'Pa kapab ouvri USSD la.');
    });
  };

  const openNavigation = (target: 'pickup' | 'destination') => {
    if (!ride) return;
    const lat = target === 'pickup' ? ride.pickup_lat : ride.destination_lat;
    const lng = target === 'pickup' ? ride.pickup_lng : ride.destination_lng;
    if (!lat || !lng) {
      Alert.alert('Erè', 'Kowòdone pa disponib.');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erè', 'Pa kapab louvri kat la.');
    });
  };

  const updateStatus = async (status: 'arrived' | 'started' | 'completed' | 'cancelled') => {
    if (!ride) return;
    try {
      const response = await rideAPI.updateStatus(ride.id, status);
      const updated = response.data?.ride || ride;
      if (status === 'completed') {
        const finalPrice = updated.final_price ?? updated.estimated_price ?? 0;
        setCompletionInfo({ price: finalPrice, method: updated.payment_method || 'cash' });
        setCompletionVisible(true);
      }
      const refreshed = await rideAPI.getAll();
      const rides = refreshed.data?.rides || [];
      const current = rides.find((r: any) => activeStatuses.has(r.status));
      setRide(current || null);
      if (!current) {
        setPaymentConfirmed(false);
      }
      if (status === 'cancelled') {
        router.replace('/driver/home');
      }
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab mete ajou kous la');
    }
  };

  const handleStartRide = () => {
    if (!ride) return;
    const method = ride.payment_method || 'cash';
    if (method !== 'cash' && !paymentConfirmed) {
      setConfirmVisible(true);
      return;
    }
    updateStatus('started');
    openNavigation('pickup');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Ap chaje...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ride) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="car-outline" size={52} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>Pa gen kous aktyèl.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/driver/home')}>
            <Text style={styles.backText}>Retounen</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Kous aktyèl</Text>
          <TouchableOpacity style={styles.navButton} onPress={() => openNavigation('pickup')}>
            <Ionicons name="navigate" size={16} color="white" />
            <Text style={styles.navText}>Ale nan pasaje</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Pasaje</Text>
            <Text style={styles.value}>{ride.passenger_name || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pickup</Text>
            <Text style={styles.value}>{ride.pickup_address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Destinasyon</Text>
            <Text style={styles.value}>{ride.destination_address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Distans</Text>
            <Text style={styles.value}>{ride.estimated_distance || 0} km</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Durée</Text>
            <Text style={styles.value}>{Math.round(ride.estimated_duration || 0)} min</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pri</Text>
            <Text style={styles.value}>{ride.estimated_price || 0} HTG</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pèman</Text>
            <Text style={styles.value}>{ride.payment_method || 'cash'}</Text>
          </View>
        </View>

        {ride.payment_method && ride.payment_method !== 'cash' && (
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>USSD Pèman</Text>
            <Text style={styles.paymentNote}>
              Kòd: {USSD_CODES[ride.payment_method] || '—'} • Nimewo: {getPaymentPhone(ride.payment_method) || '—'}
            </Text>
            <TouchableOpacity
              style={styles.paymentButton}
              onPress={() => openUssd(ride.payment_method)}
            >
              <Text style={styles.paymentButtonText}>
                Ouvri {ride.payment_method === 'moncash' ? 'MonCash' : 'NatCash'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actions}>
          {ride.status === 'accepted' && (
            <>
              <TouchableOpacity style={styles.primary} onPress={() => updateStatus('arrived')}>
                <Text style={styles.primaryText}>Mwen Rive</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.danger} onPress={() => updateStatus('cancelled')}>
                <Text style={styles.dangerText}>Anile</Text>
              </TouchableOpacity>
            </>
          )}
          {ride.status === 'arrived' && (
            <>
              <TouchableOpacity style={styles.primary} onPress={handleStartRide}>
                <Text style={styles.primaryText}>Kòmanse</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.danger} onPress={() => updateStatus('cancelled')}>
                <Text style={styles.dangerText}>Anile</Text>
              </TouchableOpacity>
            </>
          )}
          {ride.status === 'started' && (
            <TouchableOpacity style={styles.primary} onPress={() => updateStatus('completed')}>
              <Text style={styles.primaryText}>Fini Kous</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Konfime Pèman</Text>
            <Text style={styles.modalText}>
              Pasaje a dwe peye avan ou kòmanse kous la.
            </Text>
            <Text style={styles.modalText}>
              Metòd: {ride.payment_method} • {ride.estimated_price || 0} HTG
            </Text>
            <TouchableOpacity
              style={styles.paymentButton}
              onPress={() => openUssd(ride.payment_method)}
            >
              <Text style={styles.paymentButtonText}>
                Ouvri USSD
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primary}
              onPress={() => {
                setPaymentConfirmed(true);
                setConfirmVisible(false);
                updateStatus('started');
              }}
            >
              <Text style={styles.primaryText}>Mwen resevwa peman</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setConfirmVisible(false)}
            >
              <Text style={styles.modalCloseText}>Retounen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={completionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCompletionVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Kous fini</Text>
            <Text style={styles.amount}>{completionInfo?.price || 0} HTG</Text>
            <Text style={styles.modalText}>Metòd: {completionInfo?.method || 'cash'}</Text>
            {completionInfo?.method === 'cash' ? (
              <Text style={styles.modalText}>Pran lajan nan men pasaje a.</Text>
            ) : (
              <Text style={styles.modalText}>Peman deja fèt.</Text>
            )}
            <TouchableOpacity
              style={styles.primary}
              onPress={() => {
                setCompletionVisible(false);
                router.replace('/driver/home');
              }}
            >
              <Text style={styles.primaryText}>Fèmen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  backButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backText: {
    color: 'white',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  navButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
  },
  row: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 14,
    color: Colors.text,
    marginTop: 2,
  },
  paymentBox: {
    marginTop: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    ...Shadows.small,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  paymentNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  paymentButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  paymentButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  actions: {
    marginTop: 18,
    gap: 10,
  },
  primary: {
    backgroundColor: Colors.success,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: 'white',
    fontWeight: '700',
  },
  danger: {
    backgroundColor: Colors.error,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerText: {
    color: 'white',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    ...Shadows.medium,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  modalClose: {
    marginTop: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  amount: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.success,
    textAlign: 'center',
    marginTop: 12,
  },
});
