import React, { useState, useEffect, useMemo } from 'react';
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
import { HAITI_DEPARTMENTS, DEPARTMENT_CITIES } from '../../src/constants/haiti';
import { geocodeAddress } from '../../src/utils/geocoding';
import { adminAPI, driverAPI, rideAPI } from '../../src/services/api';

export default function SuperAdminDrivers() {
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [remindModalVisible, setRemindModalVisible] = useState(false);
  const [remindMessage, setRemindMessage] = useState('');
  const [remindTarget, setRemindTarget] = useState<string | null>(null);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testSaving, setTestSaving] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testRides, setTestRides] = useState<any[]>([]);
  const [testForm, setTestForm] = useState({
    admin_id: 'taptapgo',
    vehicle_type: 'moto',
    department: '',
    city: '',
    pickup_address: '',
    destination_address: '',
  });
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

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
      const adminResponse = await adminAPI.getAllAdmins();
      setAdmins(adminResponse.data.admins || []);
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

  const openRemindModal = (driverId?: string) => {
    setRemindTarget(driverId || null);
    setRemindMessage('');
    setRemindModalVisible(true);
  };

  const handleSendRemind = async () => {
    setReminding(true);
    try {
      const response = await driverAPI.remindMissingDocs({
        status: remindTarget ? undefined : 'pending',
        driver_id: remindTarget || undefined,
        message: remindMessage.trim() || undefined,
      });
      const count = response.data?.notified ?? 0;
      Alert.alert('Siksè', remindTarget ? 'Notifikasyon voye.' : `${count} chofè resevwa notifikasyon.`);
      setRemindModalVisible(false);
      fetchDrivers();
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab voye notifikasyon');
    } finally {
      setReminding(false);
    }
  };

  const isValidDepartment = (value: string) => HAITI_DEPARTMENTS.includes(value);
  const isValidCity = (dept: string, city: string) =>
    Boolean(DEPARTMENT_CITIES[dept]?.includes(city));

  const handleCreateTestRide = async () => {
    if (!testForm.department.trim() || !testForm.city.trim() || !testForm.pickup_address.trim() || !testForm.destination_address.trim()) {
      Alert.alert('Erè', 'Tanpri ranpli depatman, vil, pickup, ak destinasyon.');
      return;
    }
    if (!isValidDepartment(testForm.department) || !isValidCity(testForm.department, testForm.city)) {
      Alert.alert('Erè', 'Tanpri chwazi depatman ak vil nan lis la.');
      return;
    }
    setTestSaving(true);
    try {
      const pickup = await geocodeAddress(testForm.pickup_address);
      const destination = await geocodeAddress(testForm.destination_address);
      const useFallback = !pickup || !destination;
      const payload: any = {
        admin_id: testForm.admin_id === 'taptapgo' ? null : testForm.admin_id,
        vehicle_type: testForm.vehicle_type as 'moto' | 'car',
        city: testForm.city.trim(),
        pickup_address: testForm.pickup_address.trim(),
        destination_address: testForm.destination_address.trim(),
      };
      if (!useFallback) {
        payload.pickup_lat = pickup.lat;
        payload.pickup_lng = pickup.lng;
        payload.destination_lat = destination.lat;
        payload.destination_lng = destination.lng;
      }
      const response = await driverAPI.createTestRideAdmin(payload);
      const count = response.data?.created ?? 0;
      Alert.alert(
        'Siksè',
        useFallback
          ? `${count} kous tès kreye. Adrès yo pa jwenn; nou itilize kowòdone otomatik.`
          : `${count} kous tès kreye.`
      );
      fetchActiveTestRides(payload.admin_id, payload.vehicle_type);
      setTestModalVisible(false);
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab kreye kous tès');
    } finally {
      setTestSaving(false);
    }
  };

  const fetchActiveTestRides = async (adminId?: string | null, vehicleType?: 'moto' | 'car') => {
    setTestLoading(true);
    try {
      const response = await driverAPI.getActiveTestRides({
        admin_id: adminId ?? null,
        vehicle_type: vehicleType,
      });
      setTestRides(response.data.rides || []);
    } catch (error) {
      setTestRides([]);
    } finally {
      setTestLoading(false);
    }
  };

  const handleCancelTestRide = async (rideId: string) => {
    try {
      await rideAPI.updateStatus(rideId, 'cancelled', 'test ride cancelled');
      const adminId = testForm.admin_id === 'taptapgo' ? null : testForm.admin_id;
      await fetchActiveTestRides(adminId, testForm.vehicle_type as 'moto' | 'car');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab anile kous tès');
    }
  };

  useEffect(() => {
    if (!testModalVisible) return;
    const adminId = testForm.admin_id === 'taptapgo' ? null : testForm.admin_id;
    fetchActiveTestRides(adminId, testForm.vehicle_type as 'moto' | 'car');
  }, [testModalVisible, testForm.admin_id, testForm.vehicle_type]);

  const filteredDepartments = useMemo(() => {
    if (!departmentSearch.trim()) return HAITI_DEPARTMENTS;
    const term = departmentSearch.toLowerCase();
    return HAITI_DEPARTMENTS.filter((d) => d.toLowerCase().includes(term));
  }, [departmentSearch]);

  const cityOptions = useMemo(() => {
    const cities = DEPARTMENT_CITIES[testForm.department] || [];
    if (!citySearch.trim()) return cities;
    const term = citySearch.toLowerCase();
    return cities.filter((c) => c.toLowerCase().includes(term));
  }, [testForm.department, citySearch]);

  const handleRemindDriver = (driverId: string) => {
    openRemindModal(driverId);
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

  const groupedDrivers = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredDrivers.forEach((d) => {
      const key = d.admin_id || 'taptapgo';
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    return groups;
  }, [filteredDrivers]);

  const adminLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    filteredDrivers.forEach((d) => {
      if (d.admin_id && !map[d.admin_id]) {
        map[d.admin_id] = d.admin_brand || d.admin_name || 'Mak Pèsonèl';
      }
    });
    return map;
  }, [filteredDrivers]);

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
        {item.admin_name && (
          <View style={styles.detailItem}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.textSecondary} />
            <Text style={styles.detailText}>
              {item.admin_brand ? `${item.admin_brand}` : item.admin_name}
            </Text>
          </View>
        )}
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
          <TouchableOpacity
            style={[styles.actionButton, styles.remindInlineButton]}
            onPress={() => handleRemindDriver(item.id)}
            disabled={reminding}
          >
            <Ionicons name="notifications" size={18} color="white" />
            <Text style={[styles.actionText, { color: 'white' }]}>
              Raple
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
        <TouchableOpacity style={styles.testButtonHeader} onPress={() => setTestModalVisible(true)}>
          <Ionicons name="flash" size={18} color="white" />
          <Text style={styles.testButtonHeaderText}>Kous tès</Text>
        </TouchableOpacity>
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

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchDrivers} />
        }
      >
        <Text style={styles.sectionTitle}>Chofè TapTapGo</Text>
        {(groupedDrivers['taptapgo'] || []).length === 0 ? (
          <Text style={styles.emptyNote}>Pa gen chofè TapTapGo</Text>
        ) : (
          (groupedDrivers['taptapgo'] || []).map((d) => (
            <View key={d.id}>{renderDriver({ item: d })}</View>
          ))
        )}

        <Text style={styles.sectionTitle}>Chofè Mak Pèsonèl</Text>
        {Object.keys(groupedDrivers)
          .filter((key) => key !== 'taptapgo')
          .map((adminId) => (
            <View key={adminId} style={styles.groupSection}>
              <Text style={styles.groupTitle}>
                {adminLabelMap[adminId] || 'Mak Pèsonèl'}
              </Text>
              {(groupedDrivers[adminId] || []).map((d) => (
                <View key={d.id}>{renderDriver({ item: d })}</View>
              ))}
            </View>
          ))}

        {filteredDrivers.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Pa gen chofè</Text>
          </View>
        )}
      </ScrollView>

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
                style={[styles.modalButton, styles.modalRemind]}
                onPress={() => selectedDriver?.id && handleRemindDriver(selectedDriver.id)}
                disabled={submitting || reminding}
              >
                <Text style={styles.modalButtonText}>Raple</Text>
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

      <Modal
        visible={remindModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRemindModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setRemindModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Raple Chofè</Text>
            <TouchableOpacity onPress={handleSendRemind} disabled={reminding}>
              <Text style={styles.saveButton}>{reminding ? 'Ap voye...' : 'Voye'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.formLabel}>Mesaj rapid</Text>
            <View style={styles.quickRow}>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => setRemindMessage('Tanpri fini enskripsyon ou epi telechaje dokiman ki manke yo.')}
              >
                <Text style={styles.quickText}>Dokiman manke</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => setRemindMessage('Tanpri mete foto lisans, papye veyikil, ak foto veyikil.')}
              >
                <Text style={styles.quickText}>Foto obligatwa</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>Ekri mesaj</Text>
            <TextInput
              style={styles.input}
              placeholder="Ekri mesaj pou chofè a..."
              value={remindMessage}
              onChangeText={setRemindMessage}
              multiline
            />
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={testModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTestModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setTestModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Kreye kous tès</Text>
            <TouchableOpacity onPress={handleCreateTestRide} disabled={testSaving}>
              <Text style={styles.saveButton}>{testSaving ? 'Ap kreye...' : 'Kreye'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.formLabel}>Gwoup chofè</Text>
            <View style={styles.quickRow}>
              <TouchableOpacity
                style={[
                  styles.quickChip,
                  testForm.admin_id === 'taptapgo' && styles.quickChipActive,
                ]}
                onPress={() => setTestForm({ ...testForm, admin_id: 'taptapgo' })}
              >
                <Text
                  style={[
                    styles.quickText,
                    testForm.admin_id === 'taptapgo' && styles.quickTextActive,
                  ]}
                >
                  TapTapGo
                </Text>
              </TouchableOpacity>
              {admins.map((admin) => (
                <TouchableOpacity
                  key={admin.id}
                  style={[
                    styles.quickChip,
                    testForm.admin_id === admin.id && styles.quickChipActive,
                  ]}
                  onPress={() => setTestForm({ ...testForm, admin_id: admin.id })}
                >
                  <Text
                    style={[
                      styles.quickText,
                      testForm.admin_id === admin.id && styles.quickTextActive,
                    ]}
                  >
                    {admin.brand_name || admin.full_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Kalite veyikil</Text>
            <View style={styles.quickRow}>
              {(['moto', 'car'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.quickChip,
                    testForm.vehicle_type === type && styles.quickChipActive,
                  ]}
                  onPress={() => setTestForm({ ...testForm, vehicle_type: type })}
                >
                  <Text
                    style={[
                      styles.quickText,
                      testForm.vehicle_type === type && styles.quickTextActive,
                    ]}
                  >
                    {type === 'moto' ? 'Moto' : 'Machin'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Depatman</Text>
            <TextInput
              style={styles.input}
              placeholder="Chèche depatman"
              value={departmentSearch}
              onChangeText={(text) => {
                setDepartmentSearch(text);
                if (testForm.department && text.trim() !== testForm.department) {
                  setTestForm({ ...testForm, department: '', city: '' });
                  setCitySearch('');
                }
              }}
            />
            {filteredDepartments.length > 0 && (
              <View style={styles.suggestions}>
                {filteredDepartments.map((dept) => (
                  <TouchableOpacity
                    key={dept}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setTestForm({ ...testForm, department: dept, city: '' });
                      setDepartmentSearch(dept);
                      setCitySearch('');
                    }}
                  >
                    <Text style={styles.suggestionText}>{dept}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.formLabel}>Vil</Text>
            <TextInput
              style={styles.input}
              placeholder="Chèche vil"
              value={citySearch}
              onChangeText={(text) => {
                setCitySearch(text);
                if (testForm.city && text.trim() !== testForm.city) {
                  setTestForm({ ...testForm, city: '' });
                }
              }}
            />
            {cityOptions.length > 0 && (
              <View style={styles.suggestions}>
                {cityOptions.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setTestForm({ ...testForm, city });
                      setCitySearch(city);
                    }}
                  >
                    <Text style={styles.suggestionText}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.formLabel}>Pickup</Text>
            <TextInput
              style={styles.input}
              placeholder="Adrès pickup"
              value={testForm.pickup_address}
              onChangeText={(text) => setTestForm({ ...testForm, pickup_address: text })}
            />
            <Text style={styles.formLabel}>Destinasyon</Text>
            <TextInput
              style={styles.input}
              placeholder="Adrès destinasyon"
              value={testForm.destination_address}
              onChangeText={(text) => setTestForm({ ...testForm, destination_address: text })}
            />

            <Text style={styles.formLabel}>Kous tès aktif</Text>
            {testLoading ? (
              <Text style={styles.emptyNote}>Ap chaje...</Text>
            ) : testRides.length === 0 ? (
              <Text style={styles.emptyNote}>Pa gen kous tès aktif.</Text>
            ) : (
              testRides.map((ride) => (
                <View key={ride.id} style={styles.testRideCard}>
                  <View style={styles.testRideInfo}>
                    <Text style={styles.testRideTitle}>
                      {ride.vehicle_type === 'moto' ? 'Moto' : 'Machin'} • {ride.city || '—'}
                    </Text>
                    <Text style={styles.testRideMeta}>
                      {ride.pickup_address} → {ride.destination_address}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.testCancelButton}
                    onPress={() => handleCancelTestRide(ride.id)}
                  >
                    <Text style={styles.testCancelText}>Anile</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  testButtonHeader: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  testButtonHeaderText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
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
  remindInlineButton: {
    backgroundColor: Colors.secondary,
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
  modalRemind: {
    backgroundColor: Colors.secondary,
  },
  modalRemind: {
    backgroundColor: Colors.secondary,
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
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  quickChipActive: {
    backgroundColor: Colors.primary,
  },
  quickText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  quickTextActive: {
    color: 'white',
  },
  testRideCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.small,
  },
  testRideInfo: {
    flex: 1,
    paddingRight: 10,
  },
  testRideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  testRideMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  testCancelButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  testCancelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  suggestions: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
    paddingVertical: 6,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionText: {
    color: Colors.text,
    fontSize: 13,
  },
});
