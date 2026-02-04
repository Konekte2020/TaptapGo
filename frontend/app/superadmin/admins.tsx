import React, { useState, useEffect } from 'react';
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

  const isBrandAdmin = !!editingAdmin?.brand_name;

  const handleSaveAdmin = async () => {
    if (!form.full_name || !form.email || !form.phone || !form.address || (!editingAdmin && !form.password)) {
      Alert.alert('Erè', 'Tanpri ranpli tout chan obligatwa yo');
      return;
    }

    try {
      if (editingAdmin) {
        const updatePayload: any = {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          force_password_change: form.force_password_change,
        };
        if (isBrandAdmin) {
          updatePayload.brand_name = form.brand_name;
          updatePayload.primary_color = form.primary_color;
          updatePayload.secondary_color = form.secondary_color;
          updatePayload.cities = selectedCities;
        }
        await adminAPI.updateAdmin(editingAdmin.id, updatePayload);
        Alert.alert('Siksè', 'Admin modifye!');
      } else {
        await adminAPI.createAdmin({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          password: form.password,
          force_password_change: form.force_password_change,
        });
        Alert.alert('Siksè', 'Admin kreye!');
      }
      setModalVisible(false);
      resetForm();
      fetchAdmins();
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Operasyon echwe');
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
    Alert.alert(
      'Siprime Admin',
      'Aksyon sa a pa ka retounen. Ou sèten?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Wi, siprime',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminAPI.deleteAdmin(admin.id);
              fetchAdmins();
            } catch (error: any) {
              Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab siprime');
            }
          },
        },
      ]
    );
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
  };

  const toggleCity = (city: string) => {
    if (selectedCities.includes(city)) {
      setSelectedCities(selectedCities.filter(c => c !== city));
    } else {
      setSelectedCities([...selectedCities, city]);
    }
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

      <FlatList
        data={admins}
        keyExtractor={(item) => item.id}
        renderItem={renderAdmin}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchAdmins} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Pa gen admin</Text>
          </View>
        }
      />

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
            <TouchableOpacity onPress={handleSaveAdmin}>
              <Text style={styles.saveButton}>
                {editingAdmin ? 'Sove' : 'Kreye'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
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
