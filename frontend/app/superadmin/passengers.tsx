import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { adminAPI, passengerAPI } from '../../src/services/api';

export default function SuperAdminPassengers() {
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<any[]>([]);
  const [warnModalVisible, setWarnModalVisible] = useState(false);
  const [warnMessage, setWarnMessage] = useState('');
  const [selectedPassenger, setSelectedPassenger] = useState<any>(null);

  useEffect(() => {
    fetchPassengers();
  }, []);

  const fetchPassengers = async () => {
    setLoading(true);
    try {
      const [passengerResponse, adminResponse] = await Promise.all([
        passengerAPI.getAll(),
        adminAPI.getAllAdmins(),
      ]);
      setPassengers(passengerResponse.data.passengers || []);
      setAdmins(adminResponse.data.admins || []);
    } catch (error) {
      console.error('Fetch passengers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const adminMap = useMemo(() => {
    const map: Record<string, string> = {};
    admins.forEach((admin: any) => {
      map[admin.id] = admin.brand_name || admin.full_name || 'Mak Pèsonèl';
    });
    return map;
  }, [admins]);

  const groupedPassengers = useMemo(() => {
    const groups: Record<string, any[]> = {};
    passengers.forEach((p) => {
      const key = p.admin_id || 'taptapgo';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [passengers]);

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
          <Text style={styles.avatarText}>
            {item.full_name?.charAt(0).toUpperCase()}
          </Text>
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
          <Ionicons
            name={item.is_active ? 'pause' : 'play'}
            size={16}
            color={Colors.text}
          />
          <Text style={styles.actionText}>
            {item.is_active ? 'Sispann' : 'Re-aktive'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionWarning]}
          onPress={() => openWarnModal(item)}
        >
          <Ionicons name="alert-circle" size={16} color="white" />
          <Text style={[styles.actionText, styles.actionTextLight]}>
            Avètisman
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionDanger]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={16} color="white" />
          <Text style={[styles.actionText, styles.actionTextLight]}>
            Siprime
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pasajè</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchPassengers} />
        }
      >
        <Text style={styles.sectionTitle}>Pasajè TapTapGo</Text>
        {(groupedPassengers['taptapgo'] || []).length === 0 ? (
          <Text style={styles.emptyNote}>Pa gen pasajè TapTapGo</Text>
        ) : (
          (groupedPassengers['taptapgo'] || []).map((p) => (
            <View key={p.id}>{renderPassenger({ item: p })}</View>
          ))
        )}

        <Text style={styles.sectionTitle}>Pasajè Mak Pèsonèl</Text>
        {Object.keys(groupedPassengers)
          .filter((key) => key !== 'taptapgo')
          .map((adminId) => (
            <View key={adminId} style={styles.groupSection}>
              <Text style={styles.groupTitle}>
                {adminMap[adminId] || 'Mak Pèsonèl'}
              </Text>
              {(groupedPassengers[adminId] || []).map((p) => (
                <View key={p.id}>{renderPassenger({ item: p })}</View>
              ))}
            </View>
          ))}
      </ScrollView>

      <Modal
        visible={warnModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeWarnModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeWarnModal}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Voye avètisman</Text>
            <TouchableOpacity onPress={handleWarn}>
              <Text style={styles.saveButton}>Voye</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.modalMeta}>
              {selectedPassenger?.full_name || 'Pasajè'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Mesaj avètisman"
              value={warnMessage}
              onChangeText={setWarnMessage}
              multiline
            />
          </View>
        </SafeAreaView>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  groupSection: {
    marginTop: 12,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptyNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cityText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusRow: {
    marginTop: 10,
  },
  statusBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
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
    color: Colors.text,
    fontWeight: '600',
  },
  actionTextLight: {
    color: 'white',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  saveButton: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
    gap: 12,
  },
  modalMeta: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    color: Colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
