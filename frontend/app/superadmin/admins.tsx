import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  ScrollView,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { adminAPI } from '../../src/services/api';
import { HAITI_CITIES } from '../../src/constants/haiti';

export default function SuperAdminAdmins() {
  const { create } = useLocalSearchParams<{ create?: string }>();
  const router = useRouter();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [adminType, setAdminType] = useState<'direct' | 'brand'>('direct');
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'brand'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    force_password_change: true,
    brand_name: '',
    primary_color: '#E53935',
    secondary_color: '#1E3A5F',
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    if (create === '1' && !modalVisible) {
      setModalVisible(true);
      router.replace('/superadmin/admins');
    }
  }, [create, modalVisible, router]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAllAdmins();
      setAdmins(response.data.admins || []);
    } catch (error) {
      console.error('Fetch admins error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isBrandAdmin = adminType === 'brand' || !!editingAdmin?.brand_name;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredAdmins = admins.filter((item) => {
    const isBrand = !!item.brand_name;
    if (filterType === 'brand' && !isBrand) return false;
    if (filterType === 'direct' && isBrand) return false;
    if (!normalizedSearch) return true;
    const haystack = [
      item.full_name,
      item.email,
      item.phone,
      item.brand_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  const handleSaveAdmin = async () => {
    setFormError('');
    if (!form.full_name || !form.email || !form.phone || (!editingAdmin && !form.password)) {
      const message = 'Tanpri ranpli tout chan obligatwa yo';
      setFormError(message);
      Alert.alert('Erè', message);
      return;
    }
    if ((adminType === 'brand' || !!editingAdmin?.brand_name) && !form.brand_name.trim()) {
      const message = 'Tanpri mete non mak la';
      setFormError(message);
      Alert.alert('Erè', message);
      return;
    }

    setSaving(true);
    try {
      if (editingAdmin) {
        const updatePayload: any = {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          address: form.address || undefined,
          force_password_change: form.force_password_change,
        };
        if (isBrandAdmin || form.brand_name || selectedCities.length > 0) {
          updatePayload.brand_name = form.brand_name;
          updatePayload.primary_color = form.primary_color;
          updatePayload.secondary_color = form.secondary_color;
          updatePayload.cities = selectedCities;
        }
        await adminAPI.updateAdmin(editingAdmin.id, updatePayload);
        Alert.alert('Siksè', 'Admin modifye!');
      } else {
        const createPayload: any = {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          address: form.address || undefined,
          password: form.password,
          force_password_change: form.force_password_change,
        };
        if (adminType === 'brand' || form.brand_name || selectedCities.length > 0) {
          createPayload.brand_name = form.brand_name;
          createPayload.primary_color = form.primary_color;
          createPayload.secondary_color = form.secondary_color;
          createPayload.cities = selectedCities;
        }
        await adminAPI.createAdmin(createPayload);
        Alert.alert('Siksè', 'Admin kreye!');
      }
      setModalVisible(false);
      resetForm();
      fetchAdmins();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Operasyon echwe';
      setFormError(message);
      Alert.alert('Erè', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisableAdmin = (admin: any) => {
    Alert.alert(
      admin.is_active ? 'Sispann Admin' : 'Re-aktive Admin',
      admin.is_active
        ? 'Ou sèten ou vle sispann admin sa a?'
        : 'Ou vle re-aktive admin sa a?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Wi',
          onPress: async () => {
            try {
              await adminAPI.setAdminStatus(admin.id, !admin.is_active);
              fetchAdmins();
            } catch (error: any) {
              Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab mete ajou');
            }
          },
        },
      ]
    );
  };

  const handleEditAdmin = (admin: any) => {
    setEditingAdmin(admin);
    setAdminType(admin.brand_name ? 'brand' : 'direct');
    setForm({
      full_name: admin.full_name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      address: admin.address || '',
      password: '',
      force_password_change: admin.force_password_change ?? true,
      brand_name: admin.brand_name || '',
      primary_color: admin.primary_color || '#E53935',
      secondary_color: admin.secondary_color || '#1E3A5F',
    });
    setSelectedCities(admin.cities || []);
    setModalVisible(true);
  };

  const handleDeleteAdmin = (admin: any) => {
    setDeleteError('');
    setDeleteTarget(admin);
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setDeleteTarget(null);
    setDeleteError('');
  };

  const confirmDeleteAdmin = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await adminAPI.deleteAdmin(deleteTarget.id);
      await fetchAdmins();
      setDeleteTarget(null);
    } catch (error: any) {
      setDeleteError(error.response?.data?.detail || 'Pa kapab siprime');
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      full_name: '',
      email: '',
      phone: '',
      address: '',
      password: '',
      force_password_change: true,
      brand_name: '',
      primary_color: '#E53935',
      secondary_color: '#1E3A5F',
    });
    setSelectedCities([]);
    setEditingAdmin(null);
    setFormError('');
    setAdminType('direct');
  };

  const toggleCity = (city: string) => {
    if (selectedCities.includes(city)) {
      setSelectedCities(selectedCities.filter(c => c !== city));
    } else {
      setSelectedCities([...selectedCities, city]);
    }
  };

  const groupedAdmins = useMemo(() => {
    const groups: Record<string, any[]> = { taptapgo: [] };
    filteredAdmins.forEach((a) => {
      if (!a.brand_name) {
        groups.taptapgo.push(a);
        return;
      }
      const key = a.id || a.brand_name;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    return groups;
  }, [filteredAdmins]);

  const adminGroupLabel = (adminId: string) => {
    const admin = filteredAdmins.find((a) => a.id === adminId);
    if (!admin) return 'Mak Pèsonèl';
    return admin.brand_name || admin.full_name || 'Mak Pèsonèl';
  };

  const renderAdmin = ({ item }: { item: any }) => (
    <View style={styles.adminCard}>
      <View style={styles.adminHeader}>
        <View style={styles.adminAvatar}>
          <Text style={styles.avatarText}>
            {item.full_name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.adminInfo}>
          <Text style={styles.adminName}>
            {item.brand_name || item.full_name}
          </Text>
          <Text style={styles.adminEmail}>{item.email}</Text>
          <Text style={styles.adminMeta}>{item.phone || '—'}</Text>
          <Text style={styles.adminMeta}>{item.address || '—'}</Text>
          <View style={styles.typeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {item.brand_name ? 'Mak Pèsonèl' : 'TapTapGo'}
              </Text>
            </View>
            {!item.brand_name && (
              <Text style={styles.typeHint}>Admin dirèk</Text>
            )}
            {item.brand_name && (
              <Text style={styles.typeHint}>{item.full_name}</Text>
            )}
          </View>
        </View>
        <View style={[styles.statusBadge, item.is_active && styles.activeBadge]}>
          <Text style={styles.statusText}>{item.is_active ? 'Aktif' : 'Inaktif'}</Text>
        </View>
      </View>
      <View style={styles.citiesList}>
        <Ionicons name="location" size={14} color={Colors.textSecondary} />
        <Text style={styles.citiesText}>
          {item.cities?.join(', ') || 'Pa gen vil'}
        </Text>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionSecondary]}
          onPress={() => handleDisableAdmin(item)}
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
          style={[styles.actionButton, styles.actionPrimary]}
          onPress={() => handleEditAdmin(item)}
        >
          <Ionicons name="create-outline" size={16} color="white" />
          <Text style={[styles.actionText, styles.actionTextLight]}>
            Modifye
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionDanger]}
          onPress={() => handleDeleteAdmin(item)}
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
        <Text style={styles.title}>Administratè</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechèch admin..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
              Tout
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'direct' && styles.filterChipActive]}
            onPress={() => setFilterType('direct')}
          >
            <Text style={[styles.filterChipText, filterType === 'direct' && styles.filterChipTextActive]}>
              TapTapGo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'brand' && styles.filterChipActive]}
            onPress={() => setFilterType('brand')}
          >
            <Text style={[styles.filterChipText, filterType === 'brand' && styles.filterChipTextActive]}>
              Mak Pèsonèl
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchAdmins} />
        }
      >
        <Text style={styles.sectionTitle}>Admin TapTapGo</Text>
        {(groupedAdmins.taptapgo || []).length === 0 ? (
          <Text style={styles.emptyNote}>Pa gen admin TapTapGo</Text>
        ) : (
          (groupedAdmins.taptapgo || []).map((a) => (
            <View key={a.id}>{renderAdmin({ item: a })}</View>
          ))
        )}

        <Text style={styles.sectionTitle}>Admin Mak Pèsonèl</Text>
        {Object.keys(groupedAdmins)
          .filter((key) => key !== 'taptapgo')
          .map((adminId) => (
            <View key={adminId} style={styles.groupSection}>
              <Text style={styles.groupTitle}>{adminGroupLabel(adminId)}</Text>
              {(groupedAdmins[adminId] || []).map((a) => (
                <View key={a.id}>{renderAdmin({ item: a })}</View>
              ))}
            </View>
          ))}

        {filteredAdmins.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Pa gen admin</Text>
          </View>
        )}
      </ScrollView>

      {/* Create Admin Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingAdmin ? 'Modifye Admin' : 'Kreye Admin'}
            </Text>
            <TouchableOpacity onPress={handleSaveAdmin} disabled={saving}>
              <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
                {saving ? 'Ap sove...' : (editingAdmin ? 'Sove' : 'Kreye')}
              </Text>
            </TouchableOpacity>
          </View>

          {!!formError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}

          <ScrollView style={styles.modalContent}>
            {!editingAdmin && (
              <>
                <Text style={styles.formLabel}>Kalite Admin</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeButton, adminType === 'direct' && styles.typeButtonActive]}
                    onPress={() => setAdminType('direct')}
                  >
                    <Text style={[styles.typeButtonText, adminType === 'direct' && styles.typeButtonTextActive]}>
                      TapTapGo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeButton, adminType === 'brand' && styles.typeButtonActive]}
                    onPress={() => setAdminType('brand')}
                  >
                    <Text style={[styles.typeButtonText, adminType === 'brand' && styles.typeButtonTextActive]}>
                      Mak Pèsonèl
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text style={styles.formLabel}>Enfòmasyon</Text>
            <TextInput
              style={styles.input}
              placeholder="Non konplè"
              value={form.full_name}
              onChangeText={(text) => setForm({ ...form, full_name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Telefòn"
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Adres"
              value={form.address}
              onChangeText={(text) => setForm({ ...form, address: text })}
            />
            {!editingAdmin && (
              <TextInput
                style={styles.input}
                placeholder="Modpas"
                value={form.password}
                onChangeText={(text) => setForm({ ...form, password: text })}
                secureTextEntry
              />
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Obligatwa chanje modpas</Text>
              <Switch
                value={form.force_password_change}
                onValueChange={(value) =>
                  setForm({ ...form, force_password_change: value })
                }
              />
            </View>

            {isBrandAdmin && (
              <>
                <Text style={styles.formLabel}>White-Label (opsyonèl)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Non Brand"
                  value={form.brand_name}
                  onChangeText={(text) => setForm({ ...form, brand_name: text })}
                />

                <Text style={styles.formLabel}>Vil pou jère</Text>
                <View style={styles.citiesGrid}>
                  {HAITI_CITIES.map((city) => (
                    <TouchableOpacity
                      key={city}
                      style={[
                        styles.cityChip,
                        selectedCities.includes(city) && styles.cityChipSelected,
                      ]}
                      onPress={() => toggleCity(city)}
                    >
                      <Text
                        style={[
                          styles.cityChipText,
                          selectedCities.includes(city) && styles.cityChipTextSelected,
                        ]}
                      >
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteTitle}>Siprime Admin</Text>
            <Text style={styles.deleteText}>
              Aksyon sa a pa ka retounen. Ou sèten ou vle siprime admin sa a?
            </Text>
            {!!deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={[styles.deleteButton, styles.deleteCancel]}
                onPress={closeDeleteModal}
                disabled={deleteLoading}
              >
                <Text style={styles.deleteCancelText}>Anile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, styles.deleteConfirm]}
                onPress={confirmDeleteAdmin}
                disabled={deleteLoading}
              >
                <Text style={styles.deleteConfirmText}>
                  {deleteLoading ? 'Ap siprime...' : 'Siprime'}
                </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
  filters: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    color: Colors.text,
    ...Shadows.small,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    ...Shadows.small,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: 'white',
  },
  adminCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Shadows.small,
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminAvatar: {
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
  adminInfo: {
    flex: 1,
    marginLeft: 12,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  adminEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  adminMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  brandName: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  typeBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '600',
  },
  typeHint: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  statusBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  citiesList: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  citiesText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
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
  actionPrimary: {
    backgroundColor: Colors.primary,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModal: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    ...Shadows.medium,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  deleteText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
  deleteError: {
    fontSize: 12,
    color: Colors.error,
    textAlign: 'center',
    marginTop: 8,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteCancel: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deleteConfirm: {
    backgroundColor: Colors.error,
  },
  deleteCancelText: {
    color: Colors.text,
    fontWeight: '700',
  },
  deleteConfirmText: {
    color: 'white',
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    flex: 1,
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 13,
    color: Colors.text,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    ...Shadows.small,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  typeButtonTextActive: {
    color: 'white',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
    marginBottom: 12,
  },
  citiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cityChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  cityChipText: {
    fontSize: 13,
    color: Colors.text,
  },
  cityChipTextSelected: {
    color: 'white',
  },
});
