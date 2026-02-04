import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { driverAPI } from '../../src/services/api';

export default function SuperAdminDrivers() {
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, [filter]);

  useEffect(() => {
    if (typeof filterParam === 'string' && filterParam !== filter) {
      setFilter(filterParam);
    }
    if (!filterParam && filter !== 'all') {
      setFilter('all');
    }
  }, [filterParam]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const status = ['pending', 'approved', 'rejected'].includes(filter) ? filter : undefined;
      const response = await driverAPI.getAll({ status });
      setDrivers(response.data.drivers || []);
    } catch (error) {
      console.error('Fetch drivers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDocModal = (driver: any) => {
    setSelectedDriver(driver);
    setRejectReason('');
    setDocModalVisible(true);
  };

  const closeDocModal = () => {
    setDocModalVisible(false);
    setSelectedDriver(null);
    setRejectReason('');
  };

  const openZoom = (uri: string) => {
    setZoomImage(uri);
    setZoomVisible(true);
  };

  const closeZoom = () => {
    setZoomVisible(false);
    setZoomImage(null);
  };

  useEffect(() => {
    const loadHistory = async () => {
      if (!selectedDriver || !docModalVisible) return;
      setHistoryLoading(true);
      try {
        const response = await driverAPI.getVerifications(selectedDriver.id);
        setVerifications(response.data.verifications || []);
      } catch (error) {
        console.error('Fetch verifications error:', error);
        setVerifications([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [selectedDriver, docModalVisible]);

  const handleApprove = async () => {
    if (!selectedDriver) return;
    setSubmitting(true);
    try {
      await driverAPI.approve(selectedDriver.id);
      Alert.alert('Siksè', 'Chofè apwouve!');
      closeDocModal();
      fetchDrivers();
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab apwouve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDriver) return;
    if (!rejectReason || rejectReason.trim().length < 5) {
      Alert.alert('Erè', 'Tanpri mete yon rezon (min 5 karaktè).');
      return;
    }
    setSubmitting(true);
    try {
      await driverAPI.reject(selectedDriver.id, rejectReason.trim());
      Alert.alert('Siksè', 'Chofè rejte');
      closeDocModal();
      fetchDrivers();
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab rejte');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return Colors.success;
      case 'rejected': return Colors.error;
      case 'pending': return Colors.warning;
      default: return Colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Apwouve';
      case 'rejected': return 'Rejte';
      case 'pending': return 'An atant';
      default: return status;
    }
  };

  const filteredDrivers =
    filter === 'missing_docs'
      ? drivers.filter(
          (d) => !d.license_photo || !d.vehicle_photo || !d.vehicle_papers
        )
      : drivers;

  const renderDriver = ({ item }: { item: any }) => (
    <View style={styles.driverCard}>
      <View style={styles.driverHeader}>
        <View style={styles.driverLeft}>
          {item.profile_photo ? (
            <Image source={{ uri: item.profile_photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.full_name?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{item.full_name}</Text>
            <Text style={styles.driverPhone}>{item.phone}</Text>
            <View style={styles.vehicleInfo}>
              <Ionicons
                name={item.vehicle_type === 'moto' ? 'bicycle' : 'car'}
                size={14}
                color={item.vehicle_type === 'moto' ? Colors.moto : Colors.car}
              />
              <Text style={styles.vehicleText}>
                {item.vehicle_brand} {item.vehicle_model}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.driverDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="location" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{item.city}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="card" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{item.plate_number}</Text>
        </View>
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.verifyButton]}
            onPress={() => openDocModal(item)}
          >
            <Ionicons name="document-text" size={18} color="white" />
            <Text style={[styles.actionText, { color: 'white' }]}>
              Verifye dokiman
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const filters = [
    { key: 'all', label: 'Tout' },
    { key: 'pending', label: 'An atant' },
    { key: 'approved', label: 'Apwouve' },
    { key: 'rejected', label: 'Rejte' },
    { key: 'missing_docs', label: 'Dokiman manke' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chofè</Text>
      </View>

      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterButton, filter === f.key && styles.filterActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredDrivers}
        keyExtractor={(item) => item.id}
        renderItem={renderDriver}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchDrivers} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Pa gen chofè</Text>
          </View>
        }
      />

      <Modal
        visible={docModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeDocModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeDocModal}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Dokiman Chofè</Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalName}>
              {selectedDriver?.full_name || 'Chofè'}
            </Text>
            <Text style={styles.modalMeta}>
              {selectedDriver?.phone || '—'} · {selectedDriver?.email || '—'}
            </Text>

            <View style={styles.docGrid}>
              <View style={styles.docCard}>
                <Text style={styles.docLabel}>Foto Lisans</Text>
                {selectedDriver?.license_photo ? (
                  <TouchableOpacity onPress={() => openZoom(selectedDriver.license_photo)}>
                    <Image
                      source={{ uri: selectedDriver.license_photo }}
                      style={styles.docImage}
                    />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.docMissing}>Dokiman manke</Text>
                )}
                {Platform.OS === 'web' && selectedDriver?.license_photo && (
                  <TouchableOpacity
                    style={styles.docLink}
                    onPress={() => window.open(selectedDriver.license_photo, '_blank')}
                  >
                    <Text style={styles.docLinkText}>Ouvri nan nouvo tab</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.docCard}>
                <Text style={styles.docLabel}>Foto Veyikil</Text>
                {selectedDriver?.vehicle_photo ? (
                  <TouchableOpacity onPress={() => openZoom(selectedDriver.vehicle_photo)}>
                    <Image
                      source={{ uri: selectedDriver.vehicle_photo }}
                      style={styles.docImage}
                    />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.docMissing}>Dokiman manke</Text>
                )}
                {Platform.OS === 'web' && selectedDriver?.vehicle_photo && (
                  <TouchableOpacity
                    style={styles.docLink}
                    onPress={() => window.open(selectedDriver.vehicle_photo, '_blank')}
                  >
                    <Text style={styles.docLinkText}>Ouvri nan nouvo tab</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.docCard}>
                <Text style={styles.docLabel}>Papye Veyikil</Text>
                {selectedDriver?.vehicle_papers ? (
                  <TouchableOpacity onPress={() => openZoom(selectedDriver.vehicle_papers)}>
                    <Image
                      source={{ uri: selectedDriver.vehicle_papers }}
                      style={styles.docImage}
                    />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.docMissing}>Dokiman manke</Text>
                )}
                {Platform.OS === 'web' && selectedDriver?.vehicle_papers && (
                  <TouchableOpacity
                    style={styles.docLink}
                    onPress={() => window.open(selectedDriver.vehicle_papers, '_blank')}
                  >
                    <Text style={styles.docLinkText}>Ouvri nan nouvo tab</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text style={styles.historyTitle}>Istwa Verifikasyon</Text>
            {historyLoading ? (
              <Text style={styles.historyEmpty}>Ap chaje...</Text>
            ) : verifications.length === 0 ? (
              <Text style={styles.historyEmpty}>Pa gen istwa</Text>
            ) : (
              verifications.map((v) => (
                <View key={v.id} style={styles.historyRow}>
                  <Text style={styles.historyStatus}>
                    {v.status === 'approved' ? 'Apwouve' : 'Rejte'}
                  </Text>
                  <Text style={styles.historyReason}>
                    {v.reason || '—'}
                  </Text>
                  <Text style={styles.historyDate}>
                    {String(v.created_at || '').slice(0, 10)}
                  </Text>
                </View>
              ))
            )}

            <Text style={styles.formLabel}>Rezon pou rejte</Text>
            <TextInput
              style={styles.input}
              placeholder="Ekri rezon lan"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalReject]}
                onPress={handleReject}
                disabled={submitting}
              >
                <Text style={styles.modalButtonText}>Rejte</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalApprove]}
                onPress={handleApprove}
                disabled={submitting}
              >
                <Text style={styles.modalButtonText}>Apwouve</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={zoomVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.zoomBackdrop} onPress={closeZoom}>
          {zoomImage && (
            <Image source={{ uri: zoomImage }} style={styles.zoomImage} resizeMode="contain" />
          )}
        </TouchableOpacity>
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  filterActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  driverCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Shadows.small,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  driverLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  driverInfo: {
    marginLeft: 12,
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  driverPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  vehicleText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  driverDetails: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalSpacer: {
    width: 24,
  },
  modalContent: {
    padding: 20,
    gap: 12,
  },
  modalName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  docGrid: {
    gap: 12,
  },
  docCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  docLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  docLink: {
    marginTop: 8,
  },
  docLinkText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  docImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  docMissing: {
    fontSize: 12,
    color: Colors.error,
  },
  formLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    color: Colors.text,
    minHeight: 60,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalReject: {
    backgroundColor: Colors.error,
  },
  modalApprove: {
    backgroundColor: Colors.success,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  zoomImage: {
    width: '100%',
    height: '100%',
  },
  historyTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  historyRow: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  historyReason: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  historyDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  historyEmpty: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
  },
});
