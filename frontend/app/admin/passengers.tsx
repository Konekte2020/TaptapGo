import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { passengerAPI } from '../../src/services/api';

export default function AdminPassengers() {
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [warnModalVisible, setWarnModalVisible] = useState(false);
  const [warnMessage, setWarnMessage] = useState('');
  const [selectedPassenger, setSelectedPassenger] = useState<any>(null);

  useEffect(() => {
    fetchPassengers();
  }, []);

  const fetchPassengers = async () => {
    setLoading(true);
    try {
      const response = await passengerAPI.getAll();
      setPassengers(response.data.passengers || []);
    } catch (error) {
      console.error('Fetch passengers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openWarnModal = (passenger: any) => {
    setSelectedPassenger(passenger);
    setWarnMessage('');
    setWarnModalVisible(true);
  };

  const closeWarnModal = () => {
    setWarnModalVisible(false);
    setSelectedPassenger(null);
    setWarnMessage('');
  };

  const handleSuspend = (passenger: any) => {
    Alert.alert(
      passenger.is_active ? 'Sispann Pasajè' : 'Re-aktive Pasajè',
      passenger.is_active
        ? 'Ou sèten ou vle sispann pasajè sa a?'
        : 'Ou vle re-aktive pasajè sa a?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Wi',
          onPress: async () => {
            try {
              await passengerAPI.setStatus(passenger.id, !passenger.is_active);
              fetchPassengers();
            } catch (error: any) {
              Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab mete ajou');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (passenger: any) => {
    Alert.alert(
      'Siprime Pasajè',
      'Aksyon sa a pa ka retounen. Ou sèten?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Wi, siprime',
          style: 'destructive',
          onPress: async () => {
            try {
              await passengerAPI.delete(passenger.id);
              fetchPassengers();
            } catch (error: any) {
              Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab siprime');
            }
          },
        },
      ]
    );
  };

  const handleWarn = async () => {
    if (!selectedPassenger) return;
    if (!warnMessage.trim()) {
      Alert.alert('Erè', 'Mesaj obligatwa');
      return;
    }
    try {
      await passengerAPI.warn(selectedPassenger.id, warnMessage.trim());
      closeWarnModal();
      Alert.alert('Siksè', 'Mesaj voye bay pasajè a');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab voye mesaj');
    }
  };

  const renderPassenger = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.full_name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.meta}>{item.phone || '—'}</Text>
          <Text style={styles.meta}>{item.email || '—'}</Text>
        </View>
        <View style={styles.cityBadge}>
          <Ionicons name="location" size={12} color={Colors.textSecondary} />
          <Text style={styles.cityText}>{item.city || '—'}</Text>
        </View>
      </View>
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, item.is_active && styles.activeBadge]}>
          <Text style={styles.statusText}>{item.is_active ? 'Aktif' : 'Inaktif'}</Text>
        </View>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionSecondary]}
          onPress={() => handleSuspend(item)}
        >
          <Ionicons name={item.is_active ? 'pause' : 'play'} size={16} color={Colors.text} />
          <Text style={styles.actionText}>{item.is_active ? 'Sispann' : 'Re-aktive'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionWarning]}
          onPress={() => openWarnModal(item)}
        >
          <Ionicons name="alert-circle" size={16} color="white" />
          <Text style={[styles.actionText, styles.actionTextLight]}>Avètisman</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionDanger]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={16} color="white" />
          <Text style={[styles.actionText, styles.actionTextLight]}>Siprime</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pasajè</Text>
      </View>
      <FlatList
        data={passengers}
        keyExtractor={(item) => item.id}
        renderItem={renderPassenger}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPassengers} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Pa gen pasajè</Text>
          </View>
        }
      />

      <Modal visible={warnModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Voye Avètisman</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Mesaj..."
              value={warnMessage}
              onChangeText={setWarnMessage}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeWarnModal}>
                <Text style={styles.modalCancelText}>Anile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSend} onPress={handleWarn}>
                <Text style={styles.modalSendText}>Voye</Text>
              </TouchableOpacity>
            </View>
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
    gap: 12,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cityText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  statusRow: {
    marginTop: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  activeBadge: {
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionSecondary: {
    backgroundColor: Colors.surface,
  },
  actionWarning: {
    backgroundColor: Colors.warning,
  },
  actionDanger: {
    backgroundColor: Colors.error,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  actionTextLight: {
    color: 'white',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  modalInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  modalCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalSend: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  modalSendText: {
    color: 'white',
    fontWeight: '600',
  },
});
